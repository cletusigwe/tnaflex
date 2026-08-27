#!/usr/bin/env bash

set -Eeuo pipefail

readonly SEGMENT_DURATION=4
readonly PREVIEW_CLIP_DURATION=2.5
readonly THUMBNAIL_POSITION=0.25
readonly WATERMARK_OPACITY=0.85

declare -ar RENDITIONS=(240p 360p 720p 1080p)

declare -Ar WIDTHS=(
    [240p]=426
    [360p]=640
    [720p]=1280
    [1080p]=1920
)

declare -Ar HEIGHTS=(
    [240p]=240
    [360p]=360
    [720p]=720
    [1080p]=1080
)

declare -Ar VIDEO_BITRATES_KBPS=(
    [240p]=300
    [360p]=600
    [720p]=1200
    [1080p]=2500
)

declare -Ar MAX_RATES_KBPS=(
    [240p]=360
    [360p]=720
    [720p]=1440
    [1080p]=3000
)

declare -Ar BUFFER_SIZES_KBPS=(
    [240p]=600
    [360p]=1200
    [720p]=2400
    [1080p]=5000
)

declare -Ar H264_PROFILES=(
    [240p]=main
    [360p]=main
    [720p]=main
    [1080p]=high
)

declare -Ar H264_LEVELS=(
    [240p]=3.0
    [360p]=3.0
    [720p]=3.1
    [1080p]=4.1
)

input_path=''
output_dir=''
watermark_path=''

log() {
    printf '[video-preprocessor] %s\n' "$*"
}

fail() {
    printf '[video-preprocessor] Error: %s\n' "$*" >&2
    exit 1
}

usage() {
    cat <<'USAGE'
Usage:
  ./scripts/preprocess-video.sh --input FILE --output DIRECTORY --watermark PNG

Creates a thumbnail, a watermarked hover preview, adaptive HLS renditions, and
a manifest in the output directory. Renditions larger than the source are not
generated.
USAGE
}

require_command() {
    local command_name="$1"

    command -v "${command_name}" >/dev/null 2>&1 \
        || fail "Required command not found: ${command_name}"
}

calculate_time() {
    local duration="$1"
    local ratio="$2"
    local clip_duration="${3:-0}"

    awk -v duration="${duration}" -v ratio="${ratio}" -v clip="${clip_duration}" '
        BEGIN {
            time = duration * ratio
            latest = duration - clip

            if (latest < 0) {
                latest = 0
            }

            if (time > latest) {
                time = latest
            }

            printf "%.3f", time
        }
    '
}

directory_size_bytes() {
    local directory="$1"

    find "${directory}" -type f -printf '%s\n' \
        | awk '{ total += $1 } END { printf "%.0f", total }'
}

file_size_bytes() {
    stat --printf='%s' "$1"
}

watermark_width_for() {
    local video_width="$1"
    local width=$(( video_width * 16 / 100 ))

    if (( width > 50 )); then
        width=50
    fi

    printf '%s' "${width}"
}

watermark_margin_for() {
    local video_height="$1"
    local margin=$(( video_height * 2 / 100 ))

    if (( margin < 8 )); then
        margin=8
    fi

    printf '%s' "${margin}"
}

write_manifest() {
    local duration="$1"
    local source_width="$2"
    local source_height="$3"
    shift 3
    local -a produced_renditions=("$@")
    local rendition
    local rendition_size
    local separator=''

    {
        printf '{\n'
        printf '  "source": {"width": %s, "height": %s, "sizeBytes": %s},\n' \
            "${source_width}" "${source_height}" "$(file_size_bytes "${input_path}")"
        printf '  "durationSeconds": %s,\n' "${duration}"
        printf '  "thumbnail": {"path": "thumbnail.jpg", "width": 1280, "height": 720, "sizeBytes": %s},\n' \
            "$(file_size_bytes "${output_dir}/thumbnail.jpg")"
        printf '  "preview": {"path": "preview.mp4", "width": 640, "height": 360, "sizeBytes": %s},\n' \
            "$(file_size_bytes "${output_dir}/preview.mp4")"
        printf '  "playlist": "hls/master.m3u8",\n'
        printf '  "watermark": {"name": "tnaflex", "position": "top-right", "opacity": %s},\n' \
            "${WATERMARK_OPACITY}"
        printf '  "renditions": [\n'

        for rendition in "${produced_renditions[@]}"; do
            rendition_size="$(directory_size_bytes "${output_dir}/hls/${rendition}")"
            printf '%s' "${separator}"
            printf '    {"label": "%s", "width": %s, "height": %s, "sizeBytes": %s, "playlist": "hls/%s/index.m3u8"}' \
                "${rendition}" \
                "${WIDTHS[${rendition}]}" \
                "${HEIGHTS[${rendition}]}" \
                "${rendition_size}" \
                "${rendition}"
            separator=$',\n'
        done

        printf '\n  ]\n'
        printf '}\n'
    } > "${output_dir}/manifest.json"
}

validate_outputs() {
    local -a produced_renditions=("$@")
    local rendition
    local playlist
    local dimensions
    local -a segments

    dimensions="$(
        ffprobe -v error \
            -select_streams v:0 \
            -show_entries stream=width,height \
            -of csv=s=x:p=0 \
            "${output_dir}/thumbnail.jpg"
    )"
    [[ "${dimensions}" == '1280x720' ]] \
        || fail "Thumbnail validation failed: expected 1280x720, got ${dimensions}."

    dimensions="$(
        ffprobe -v error \
            -select_streams v:0 \
            -show_entries stream=width,height \
            -of csv=s=x:p=0 \
            "${output_dir}/preview.mp4"
    )"
    [[ "${dimensions}" == '640x360' ]] \
        || fail "Preview validation failed: expected 640x360, got ${dimensions}."

    grep -Fq '#EXT-X-INDEPENDENT-SEGMENTS' "${output_dir}/hls/master.m3u8" \
        || fail 'The master playlist is missing independent segments.'

    for rendition in "${produced_renditions[@]}"; do
        playlist="${output_dir}/hls/${rendition}/index.m3u8"

        grep -Fq '#EXT-X-ENDLIST' "${playlist}" \
            || fail "${rendition} playlist is incomplete."
        grep -Fq "${rendition}/index.m3u8" "${output_dir}/hls/master.m3u8" \
            || fail "The master playlist does not reference ${rendition}."

        shopt -s nullglob
        segments=("${output_dir}/hls/${rendition}"/segment-*.ts)
        shopt -u nullglob
        (( ${#segments[@]} > 0 )) || fail "${rendition} contains no HLS segments."

        dimensions="$(
            ffprobe -v error \
                -select_streams v:0 \
                -show_entries stream=width,height \
                -of csv=s=x:p=0 \
                "${playlist}"
        )"
        dimensions="${dimensions%%$'\n'*}"
        [[ "${dimensions}" == "${WIDTHS[${rendition}]}x${HEIGHTS[${rendition}]}" ]] \
            || fail "${rendition} validation failed: got ${dimensions}."
    done
}

while (( $# > 0 )); do
    case "$1" in
        --input)
            (( $# >= 2 )) || fail '--input requires a file path.'
            input_path="$2"
            shift 2
            ;;
        --output)
            (( $# >= 2 )) || fail '--output requires a directory path.'
            output_dir="$2"
            shift 2
            ;;
        --watermark)
            (( $# >= 2 )) || fail '--watermark requires a PNG path.'
            watermark_path="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            fail "Unknown argument: $1"
            ;;
    esac
done

[[ -n "${input_path}" ]] || fail 'Missing --input.'
[[ -n "${output_dir}" ]] || fail 'Missing --output.'
[[ -n "${watermark_path}" ]] || fail 'Missing --watermark.'
[[ -f "${input_path}" ]] || fail "Input video not found: ${input_path}"
[[ -f "${watermark_path}" ]] || fail "Watermark image not found: ${watermark_path}"
[[ ! -e "${output_dir}" ]] || fail "Output path already exists: ${output_dir}"

require_command awk
require_command ffmpeg
require_command ffprobe
require_command find
require_command grep
require_command stat

mkdir -p "${output_dir}/hls"

duration="$(
    ffprobe -v error \
        -show_entries format=duration \
        -of default=noprint_wrappers=1:nokey=1 \
        "${input_path}"
)"
source_width="$(
    ffprobe -v error \
        -select_streams v:0 \
        -show_entries stream=width \
        -of default=noprint_wrappers=1:nokey=1 \
        "${input_path}"
)"
source_height="$(
    ffprobe -v error \
        -select_streams v:0 \
        -show_entries stream=height \
        -of default=noprint_wrappers=1:nokey=1 \
        "${input_path}"
)"
source_frame_rate="$(
    ffprobe -v error \
        -select_streams v:0 \
        -show_entries stream=avg_frame_rate \
        -of default=noprint_wrappers=1:nokey=1 \
        "${input_path}"
)"

[[ "${duration}" =~ ^[0-9]+([.][0-9]+)?$ ]] \
    || fail 'Could not determine the video duration.'
[[ "${source_width}" =~ ^[0-9]+$ && "${source_height}" =~ ^[0-9]+$ ]] \
    || fail 'Could not determine the video dimensions.'

output_fps="$(
    awk -F/ '
        {
            fps = ($2 == 0) ? 30 : $1 / $2

            if (fps > 30) {
                fps = 30
            }

            printf "%.3f", fps
        }
    ' <<< "${source_frame_rate}"
)"
gop_size="$(awk -v fps="${output_fps}" -v segment="${SEGMENT_DURATION}" 'BEGIN { printf "%d", (fps * segment) + 0.5 }')"
has_audio="$(
    ffprobe -v error \
        -select_streams a:0 \
        -show_entries stream=index \
        -of csv=p=0 \
        "${input_path}"
)"
audio_bitrate_bps=0

if [[ -n "${has_audio}" ]]; then
    audio_bitrate_bps=128000
fi

preview_clip_duration="${PREVIEW_CLIP_DURATION}"

if awk -v duration="${duration}" 'BEGIN { exit !(duration < 7.5) }'; then
    preview_clip_duration="$(awk -v duration="${duration}" 'BEGIN { printf "%.3f", duration / 3 }')"
fi

thumbnail_time="$(calculate_time "${duration}" "${THUMBNAIL_POSITION}")"
preview_start_one="$(calculate_time "${duration}" 0.15 "${preview_clip_duration}")"
preview_start_two="$(calculate_time "${duration}" 0.45 "${preview_clip_duration}")"
preview_start_three="$(calculate_time "${duration}" 0.75 "${preview_clip_duration}")"

log "Processing ${source_width}x${source_height}, ${output_fps} fps, ${duration}s."
log 'Generating thumbnail and watermarked hover preview.'

ffmpeg -hide_banner -loglevel error -y \
    -ss "${thumbnail_time}" \
    -i "${input_path}" \
    -frames:v 1 \
    -vf 'scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720,setsar=1' \
    -q:v 3 \
    "${output_dir}/thumbnail.jpg"

preview_watermark_width="$(watermark_width_for 640)"
preview_watermark_margin="$(watermark_margin_for 360)"

ffmpeg -hide_banner -loglevel error -y \
    -ss "${preview_start_one}" -t "${preview_clip_duration}" -i "${input_path}" \
    -ss "${preview_start_two}" -t "${preview_clip_duration}" -i "${input_path}" \
    -ss "${preview_start_three}" -t "${preview_clip_duration}" -i "${input_path}" \
    -i "${watermark_path}" \
    -filter_complex \
        "[0:v:0]fps=${output_fps},scale=640:360:force_original_aspect_ratio=increase:flags=lanczos,crop=640:360,setsar=1,setpts=PTS-STARTPTS[v0];[1:v:0]fps=${output_fps},scale=640:360:force_original_aspect_ratio=increase:flags=lanczos,crop=640:360,setsar=1,setpts=PTS-STARTPTS[v1];[2:v:0]fps=${output_fps},scale=640:360:force_original_aspect_ratio=increase:flags=lanczos,crop=640:360,setsar=1,setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1:a=0[base];[3:v:0]scale=${preview_watermark_width}:-1:flags=lanczos,format=rgba,colorchannelmixer=aa=${WATERMARK_OPACITY}[watermark];[base][watermark]overlay=x=W-w-${preview_watermark_margin}:y=${preview_watermark_margin}:eof_action=repeat,format=yuv420p[preview]" \
    -map '[preview]' \
    -an \
    -c:v libx264 \
    -preset veryfast \
    -crf 25 \
    -g "${gop_size}" \
    -keyint_min "${gop_size}" \
    -sc_threshold 0 \
    -movflags +faststart \
    "${output_dir}/preview.mp4"

{
    printf '#EXTM3U\n'
    printf '#EXT-X-VERSION:3\n'
    printf '#EXT-X-INDEPENDENT-SEGMENTS\n'
} > "${output_dir}/hls/master.m3u8"

declare -a produced_renditions=()

for rendition in "${RENDITIONS[@]}"; do
    if (( HEIGHTS[${rendition}] > source_height )); then
        log "Skipping ${rendition}; it would upscale the source."
        continue
    fi

    rendition_dir="${output_dir}/hls/${rendition}"
    mkdir -p "${rendition_dir}"
    watermark_width="$(watermark_width_for "${WIDTHS[${rendition}]}")"
    watermark_margin="$(watermark_margin_for "${HEIGHTS[${rendition}]}")"

    log "Encoding watermarked ${rendition}."

    encode_command=(
        ffmpeg -hide_banner -loglevel error -y
        -i "${input_path}"
        -i "${watermark_path}"
        -filter_complex
        "[0:v:0]fps=${output_fps},scale=${WIDTHS[${rendition}]}:${HEIGHTS[${rendition}]}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${WIDTHS[${rendition}]}:${HEIGHTS[${rendition}]}:(ow-iw)/2:(oh-ih)/2,setsar=1[base];[1:v:0]scale=${watermark_width}:-1:flags=lanczos,format=rgba,colorchannelmixer=aa=${WATERMARK_OPACITY}[watermark];[base][watermark]overlay=x=W-w-${watermark_margin}:y=${watermark_margin}:eof_action=repeat,format=yuv420p[video]"
        -map '[video]'
        -c:v libx264
        -preset veryfast
        -profile:v "${H264_PROFILES[${rendition}]}"
        -level:v "${H264_LEVELS[${rendition}]}"
        -b:v "${VIDEO_BITRATES_KBPS[${rendition}]}k"
        -maxrate "${MAX_RATES_KBPS[${rendition}]}k"
        -bufsize "${BUFFER_SIZES_KBPS[${rendition}]}k"
        -g "${gop_size}"
        -keyint_min "${gop_size}"
        -sc_threshold 0
        -force_key_frames "expr:gte(t,n_forced*${SEGMENT_DURATION})"
    )

    if [[ -n "${has_audio}" ]]; then
        encode_command+=(
            -map 0:a:0
            -c:a aac
            -b:a 128k
            -ac 2
            -ar 48000
        )
    else
        encode_command+=(-an)
    fi

    encode_command+=(
        -f hls
        -hls_time "${SEGMENT_DURATION}"
        -hls_list_size 0
        -hls_playlist_type vod
        -hls_flags independent_segments
        -hls_segment_filename "${rendition_dir}/segment-%04d.ts"
        "${rendition_dir}/index.m3u8"
    )

    "${encode_command[@]}"
    produced_renditions+=("${rendition}")

    bandwidth=$(( (MAX_RATES_KBPS[${rendition}] * 1000) + audio_bitrate_bps ))
    average_bandwidth=$(( (VIDEO_BITRATES_KBPS[${rendition}] * 1000) + audio_bitrate_bps ))

    printf '#EXT-X-STREAM-INF:BANDWIDTH=%s,AVERAGE-BANDWIDTH=%s,RESOLUTION=%sx%s,FRAME-RATE=%s\n' \
        "${bandwidth}" \
        "${average_bandwidth}" \
        "${WIDTHS[${rendition}]}" \
        "${HEIGHTS[${rendition}]}" \
        "${output_fps}" \
        >> "${output_dir}/hls/master.m3u8"
    printf '%s/index.m3u8\n' "${rendition}" >> "${output_dir}/hls/master.m3u8"
done

(( ${#produced_renditions[@]} > 0 )) \
    || fail 'The source is too small to produce a 240p rendition without upscaling.'

write_manifest \
    "${duration}" \
    "${source_width}" \
    "${source_height}" \
    "${produced_renditions[@]}"

log 'Validating generated assets.'
validate_outputs "${produced_renditions[@]}"
log "Processing complete: ${output_dir}"
