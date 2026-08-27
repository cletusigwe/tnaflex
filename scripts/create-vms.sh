#!/usr/bin/env bash

set -xe

#grab ubuntu img
# wget -O ~/ubuntu-24.04-cloud.img https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img

name="$1"
vcpus="$2"
memory="$3"
disk="$4"

sudo cp /home/azureuser/ubuntu-24.04-cloud.img /var/lib/libvirt/images/${name}.qcow2

sudo qemu-img resize /var/lib/libvirt/images/${name}.qcow2 ${disk}G

printf 'instance-id: iid-%s\nlocal-hostname: %s\n' "$name" "$name" | \
sudo virt-install \
  --name "$name" \
  --memory "$memory" \
  --vcpus "$vcpus" \
  --disk "path=/var/lib/libvirt/images/${name}.qcow2,format=qcow2,bus=virtio" \
  --os-variant ubuntu24.04 \
  --network network=default,model=virtio \
  --cloud-init clouduser-ssh-key=/home/azureuser/.ssh/lab_ed25519.pub,meta-data=/dev/stdin,disable=on \
  --import \
  --graphics none \
  --console pty,target_type=serial \
  --noautoconsole
