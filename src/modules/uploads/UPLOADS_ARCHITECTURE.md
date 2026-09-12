# Uploads Module Architecture

## 1. Purpose

Uploads validate and associate user files with domain records while object storage holds binary content. MongoDB stores ownership, provider key, type, size, and lifecycle metadata.

## 2. Folder map

- Routes/controllers receive multipart requests and return safe metadata.
- Schemas/types validate file category, size, MIME type, and association.
- Services enforce tenant ownership and allowed attachment targets.
- Storage adapters upload, delete, and create signed access URLs.
- Repositories/models persist file metadata and cleanup state.

## 3. Flow

1. Authenticate the actor and validate the target entity.
2. Check file size, content type, name, and tenant scope.
3. Upload content through the storage interface.
4. Persist provider key and metadata only after upload succeeds.
5. Return a safe reference or signed URL with bounded expiry.
6. On deletion, remove metadata and attempt provider cleanup without hiding the audit result.

## 4. Security

Do not trust browser MIME types alone. Do not expose provider credentials or unrestricted permanent URLs. File access must re-check organization/vendor ownership. Sensitive attachments should have short-lived signed URLs and an audit trail.

## 5. Failure and testing

Provider timeouts may retry; invalid files and unauthorized targets must fail without creating metadata. Test size/type validation, ownership, orphan cleanup, signed URL expiry, provider failure, deletion, and attachment relationships.

## 6. Trade-offs and future work

Object storage scales better than MongoDB blobs but introduces provider availability and cleanup concerns. Future work includes virus scanning, content inspection, lifecycle policies, resumable uploads, and retention classes.
