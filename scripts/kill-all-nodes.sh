#!/usr/bin/env bash

set -euo pipefail

if [[ "$(id -un)" != 'azureuser' ]]; then
    echo 'Run this script as azureuser, without sudo.' >&2
    exit 1
fi

nodes=(
    database-node
    webapp-node
    video-preprocessor-node
)

addresses=(
    192.168.122.101
    192.168.122.102
    192.168.122.103
)

for node in "${nodes[@]}"; do
    if sudo virsh dominfo "${node}" >/dev/null 2>&1; then
        echo "Removing ${node}"
        sudo virsh destroy "${node}" >/dev/null 2>&1 || true
        sudo virsh undefine "${node}" --remove-all-storage
    fi
done

for index in "${!nodes[@]}"; do
    for host in "${nodes[${index}]}" "${addresses[${index}]}"; do
        if [[ -f /home/azureuser/.ssh/known_hosts ]]; then
            ssh-keygen -q -f /home/azureuser/.ssh/known_hosts -R "${host}" >/dev/null || true
        fi

        if sudo test -f /root/.ssh/known_hosts; then
            sudo ssh-keygen -q -f /root/.ssh/known_hosts -R "${host}" >/dev/null || true
        fi
    done
done

echo 'All Tnaflex nodes have been removed.'
