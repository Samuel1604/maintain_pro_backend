# Local Queue Architecture

## 1. Purpose

The local queue is a lightweight in-process adapter used where a full BullMQ job is unnecessary or where tests need deterministic execution.

## 2. Folder map

The task queue stores local work, debounce helpers combine repeated triggers, and task handlers execute registered callbacks. The adapter must not be mistaken for durable production transport.

## 3. Flow and boundaries

A caller schedules or debounces a task, the local queue executes it in the current process, and errors are returned to the caller or logged by the owning service. It has no cross-instance delivery or restart recovery.

## 4. Testing and trade-offs

Test ordering, debounce timing, cancellation, duplicate scheduling, and error propagation. The adapter is simple and fast but unsuitable for security-critical, long-running, or durable jobs.

## 5. Future work

Document when a task must move to BullMQ, add bounded task counts, expose local queue diagnostics, and keep the interface compatible with the durable queue contract.
