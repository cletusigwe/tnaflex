#!/usr/bin/env bash

set -euo pipefail

if [[ "$(id -un)" != 'azureuser' ]]; then
    echo 'Run this script as azureuser, without sudo.' >&2
    exit 1
fi

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sudo apt update
sudo apt install --yes \
    libnss-libvirt \
    libvirt-clients \
    libvirt-daemon-system \
    openssh-client \
    python3-libvirt \
    python3-lxml \
    qemu-kvm \
    qemu-utils \
    software-properties-common \
    virtinst

sudo add-apt-repository --yes --update ppa:ansible/ansible
sudo apt install --yes ansible
sudo systemctl enable --now libvirtd

sudo sed -i '/^hosts:/ { /libvirt/! s/files/files libvirt/; }' /etc/nsswitch.conf

sudo ansible-galaxy collection install \
    --requirements-file "${repository_root}/ansible/requirements.yaml" \
    --collections-path /usr/share/ansible/collections

install -d -m 0700 "${HOME}/.ssh"

if [[ ! -f "${HOME}/.ssh/lab_ed25519" ]]; then
    ssh-keygen -q -t ed25519 -N '' \
        -f "${HOME}/.ssh/lab_ed25519" \
        -C tnaflex-libvirt-lab
fi

cat <<EOF

Bootstrap complete.

Create the GitHub deploy key:
  ssh-keygen -t ed25519 -f ${HOME}/.ssh/github-deploy-key -C tnaflex-github-deploy
  cat ${HOME}/.ssh/github-deploy-key.pub

Add the public key in GitHub under Settings > Deploy keys. Read-only access is enough.

Then run:
  ansible-playbook -i ${repository_root}/ansible/inventory.yaml ${repository_root}/ansible/main.yaml --vault-id playground@prompt
EOF
