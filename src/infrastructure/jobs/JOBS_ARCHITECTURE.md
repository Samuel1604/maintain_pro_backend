# Scheduled Jobs Architecture

## Purpose
Scheduled jobs perform maintenance that should not block an HTTP request, such as cleanup and retention work.

## Navigation
Job files contain the task and schedule. Repositories own data access; BullMQ is preferred when work needs distributed execution or durable retries.

## Flow
The application starts a job during bootstrap, the job runs on schedule, and failures are logged without stopping the server.

## Boundaries
In-process schedules are safe for one instance only. Shared mutations must be idempotent and move to BullMQ with a distributed lock when replicas run.

## Trade-offs and future work
Timers avoid queue overhead but do not coordinate replicas. Add job health metrics and migrate multi-instance work to repeatable jobs.
