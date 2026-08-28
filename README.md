This is a demo application of a video tube site.

Users can create accounts and upload videos.

Videos get preprocessed into HLS streams of different resolutions.

Server is entirely managed by ansible playbooks 

A UFW managed firewall is used to enforce network rules.

Server is a private network of 3 ubuntu virtual machines managed via libvirt and created with qemu.
- 1 webapp node
- 1 database node
- 1 video preprocessing node