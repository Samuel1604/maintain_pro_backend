# Backend Comment Policy

Comments explain intent that is not obvious from the code. They are not a second design document.

## Rules

- Keep a normal comment to three lines or fewer.
- Use plain language so a new developer can understand it.
- Explain why a decision exists, not what the next line literally does.
- Put architecture, trade-offs, lifecycle rules, and integration notes in the nearest `*_ARCHITECTURE.md` file.
- Keep security, data-retention, retry, and compatibility warnings short and actionable.
- Remove comments that only restate a function or variable name.

## Where deeper information belongs

Each major backend folder should have an architecture document. It should explain the folder's purpose, the request/data flow, important boundaries, deliberate trade-offs, and likely future integrations. API documents should describe contracts and examples; they should not become a replacement for the architecture document.

## Review rule

When changing a long comment, move the durable explanation to the folder architecture document and leave a short pointer in code only when the context is needed at the decision site.
