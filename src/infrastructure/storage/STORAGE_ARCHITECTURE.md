# Storage Infrastructure Architecture

## Purpose
Storage adapters handle files outside MongoDB while modules keep metadata and ownership rules.

## Navigation
The storage interface defines upload, download, delete, and signed-access operations. Cloudinary or another provider stays behind that interface.

## Flow
A module validates the file and owner, the adapter stores it, and the module persists the provider reference and metadata.

## Boundaries
Provider URLs, credentials, and SDK objects must not leak into domain code. File operations enforce tenant ownership and content rules.

## Trade-offs and future work
Object storage scales better than database blobs but needs cleanup and availability handling. Add virus scanning, lifecycle rules, and signed URL expiry controls.
