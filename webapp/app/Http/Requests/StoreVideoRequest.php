<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVideoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'filename' => ['required', 'string', 'max:255'],
            'content_type' => [
                'required',
                'string',
                Rule::in(array_keys($this->supportedContentTypes())),
            ],
            'file_size_bytes' => [
                'required',
                'integer',
                'min:1',
                'max:'.config('video.max_upload_size'),
            ],
        ];
    }

    public function extension(): string
    {
        return $this->supportedContentTypes()[$this->string('content_type')->toString()];
    }

    /**
     * @return array<string, string>
     */
    private function supportedContentTypes(): array
    {
        return [
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
            'video/quicktime' => 'mov',
            'video/matroska' => 'mkv',
            'video/x-matroska' => 'mkv',
        ];
    }
}
