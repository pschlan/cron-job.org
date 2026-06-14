# chronos: Prometheus metrics

This document proposes Prometheus metrics for `chronos`. They can be implemented e.g. by adding an exporter via the [`prometheus-cpp`](https://github.com/jupp0r/prometheus-cpp) library, exposed on a dedicated HTTP endpoint (e.g. `:9098/metrics`).

All metrics below are intended for Grafana dashboards (history over time, rates per time unit) and alerting.

## Configuration

Add to `chronos.cfg` (defaults shown):

| Key | Default | Description |
|---|---|---|
| `metrics_enable` | `1` | Enable the Prometheus metrics HTTP server |
| `metrics_port` | `9098` | Metrics listen port (must not collide with `node_service_port` / `master_service_port`) |
| `metrics_interface` | `127.0.0.1` | Bind address; use a restricted interface in production |

## Conventions

### Naming

Follow [Prometheus naming conventions](https://prometheus.io/docs/practices/naming/):

- Prefix all metrics with `chronos_`.
- Counters end with `_total`.
- Durations use `_seconds` (convert from ms/µs at instrumentation time).
- Histograms expose `_bucket`, `_sum`, and `_count` suffixes automatically.

### Metric types

| Type | Use for |
|---|---|
| Counter | Monotonically increasing events (jobs executed, errors, RPC calls) |
| Gauge | Point-in-time values (queue depth, in-flight jobs) |
| Histogram | Distributions (durations, batch processing time) |

### Labels and cardinality

Keep label cardinality low. Avoid unbounded labels such as `job_id`, `user_id`, or `url`.

| Label | Values | Notes |
|---|---|---|
| `job_type` | `default`, `monitoring` | From `JobType_t` |
| `status` | `ok`, `failed_dns`, `failed_connect`, `failed_httperror`, `failed_timeout`, `failed_size`, `failed_url`, `failed_internal`, `failed_others`, `unknown` | Maps to `JOBSTATUS_*`; omit `http_status` here |
| `type` | `failure`, `success`, `disable`, `ssl_cert_expiry` | Notification type |
| `service` | `node`, `master` | Inbound Thrift service |
| `method` | Thrift RPC method name | Bounded by service definition (~20 methods total) |
| `result` | `ok`, `error` | RPC outcome |
| `exception` | `internal_error`, `resource_not_found`, `forbidden`, `invalid_arguments`, `feature_not_available` | Thrift exceptions only; omit on success |
| `operation` | Bounded set per subsystem | e.g. `joblog_insert`, `job_update`, `notification_insert` |
| `priority` | `low`, `default`, `high` | Binned from `executionPriority`: `< 0` → `low`, `0` → `default`, `> 0` → `high` |
| `reason` | Bounded set per metric | e.g. `emfile`, `user_details_failed` |
| `version`, `node_id`, `mode` | Constant per process | On `chronos_info` only |

For HTTP-error jobs (`failed_httperror`), optionally add an `http_status_class` label (`2xx`, `3xx`, `4xx`, `5xx`) — not the full status code — to keep cardinality at 4 values.

### Histogram buckets

Suggested defaults (adjust after observing production data):

| Metric | Buckets |
|---|---|
| `chronos_job_duration_seconds` | 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300 |
| `chronos_worker_jitter_seconds` | 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300 |
| `chronos_schedule_tick_duration_seconds` | 0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300 |
| `chronos_update_batch_duration_seconds` | 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60 |
| `chronos_notification_batch_duration_seconds` | 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60 |
| `chronos_rpc_request_duration_seconds` | 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5 |

### Role-aware exposure

A single chronos process can run any combination of `job_executor_enable`, `node_service_enable`, and `master_service_enable`. Register all metric families regardless of role (disabled subsystems stay at zero). The `chronos_info{mode="..."}` label records which roles are active.

| Metric group | Requires |
|---|---|
| Scheduling, job execution, worker threads, UpdateThread, NotificationThread, outbound master client, test runs | `job_executor_enable` |
| Inbound RPC (`chronos_rpc_*`) with `service=node` | `node_service_enable` |
| Inbound RPC (`chronos_rpc_*`) with `service=master` | `master_service_enable` |
| `chronos_info` | always |

## Process info

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_info` | Gauge (= 1) | `version`, `node_id`, `mode` | Process identity. `mode` reflects enabled roles: `executor`, `node_service`, `master` (combinable). `version` is injected at build time (e.g. git tag or commit SHA via a compile-time define). |

Enable prometheus-cpp's default process collectors (RSS, CPU) alongside custom metrics.

## Scheduling

Metrics around the main-loop minute tick in `App::processJobs()`.

Worker threads are started with `detach()` — `processJobs()` returns once workers are **launched**, not when HTTP requests finish. Scheduling metrics therefore cover the planning phase only; execution is tracked under worker and job-execution metrics.

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_schedule_jobs_selected_total` | Counter | `job_type`, `priority` | Jobs fetched from MySQL and assigned to worker threads per tick. Accumulate locally during `processJobsForTimeZone()`, flush once after `processJobs()` (~6 counter increments per tick, not one per job) |
| `chronos_schedule_tick_duration_seconds` | Histogram | — | Wall-clock duration of `processJobs()` from entry until worker threads are started (MySQL fetch, queue assignment, wait until `plannedTime`; **excludes** HTTP execution) |
| `chronos_scheduler_loop_lag_seconds` | Gauge | — | Delay from the minute boundary (`plannedTime`) to when `processJobs()` is invoked. Non-zero means the main loop detected the new minute late (poll interval is 100 ms) |
| `chronos_schedule_timezones_skipped_total` | Counter | — | Time zones that failed to load (`cctz::load_time_zone`) |
| `chronos_jobs_auto_disabled_total` | Counter | — | Jobs automatically disabled after exceeding `maxFailures` (increment in `UpdateThread::storeResult()`) |

Per-job execution delay relative to the planned time is captured by `chronos_worker_jitter_seconds`, not by a schedule-level lag gauge. `processJobs()` waits until `plannedTime` before starting workers, so lag measured at worker-thread start would always be ~0.

## Job execution

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_jobs_executed_total` | Counter | `job_type`, `status` | Completed HTTP requests, one increment per job. Accumulated in `WorkerMetricsBatch` during `jobDone()`, flushed at end of `WorkerThread::threadMain()` |
| `chronos_job_duration_seconds` | Histogram | `job_type` | End-to-end job duration (`JobResult::duration`, converted from ms). Bucket counts accumulated in batch, flushed once per worker per tick |
| `chronos_socket_exhaustion_total` | Counter | `reason` | `socket()` failures in `curlOpenSocketFunction()`. `reason`: `emfile`, `enfile`, `enobufs` |

For `status=failed_httperror`, optionally add label `http_status_class` (`2xx`/`3xx`/`4xx`/`5xx`).

Blocked-subnet rejections happen during cURL socket open (`verifyPeerAddress()`), not as a separate pre-flight path. They appear in `chronos_jobs_executed_total` with a failure `status` (typically `failed_connect` or `failed_others`). URL malformation is reported by cURL as `failed_url` in the same counter.

## Worker threads

Worker threads are created per minute tick and exit when their batch finishes.

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_worker_threads_started_total` | Counter | `job_type` | Worker threads started per tick (non-empty batches only) |
| `chronos_worker_inflight_jobs` | Gauge | `job_type` | Currently running HTTP requests across all worker threads. Use `std::atomic` inc/dec in `runJobs()` / `jobDone()` for sub-minute visibility (hung-worker alerting) |
| `chronos_worker_jitter_seconds` | Histogram | `job_type` | Scheduling jitter (`JobResult::jitter` = `dateStarted − datePlanned`, converted from ms). Accumulated in batch, flushed once per worker per tick |

## UpdateThread

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_update_results_total` | Counter | — | Job results fully persisted (SQLite joblog written **and** MySQL job row updated). Increment only on success |
| `chronos_update_queue_depth` | Gauge | — | Pending results in the UpdateThread queue. Set from `tempQueue.size()` on batch swap before processing; set to 0 after drain. Do **not** update on `addResult()` |
| `chronos_update_batch_duration_seconds` | Histogram | — | Time to process one swapped batch (use sub-second precision, e.g. `std::chrono`) |
| `chronos_sqlite_write_errors_total` | Counter | `operation` | SQLite write failures. `operation`: `joblog_insert`, `joblog_stats_insert`, `joblog_ssl_insert`, `histogram_update` |
| `chronos_mysql_write_errors_total` | Counter | `operation` | MySQL write failures. `operation`: `job_update`, `job_disable`, `notification_insert`, `ssl_cert_expiry_update` |

**Executed vs updated:** On SQLite failure, `storeResult()` returns early and the result is dropped (no retry). `chronos_jobs_executed_total` will exceed `chronos_update_results_total` during data-loss incidents. Alert on sustained divergence.

MySQL errors in `storeResult()` are not caught today; instrumentation should wrap MySQL operations in try/catch and increment `chronos_mysql_write_errors_total` rather than letting exceptions terminate the thread.

## NotificationThread

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_notifications_processed_total` | Counter | `type` | Notifications entered `processNotification()`. `type`: `failure`, `success`, `disable`, `ssl_cert_expiry` |
| `chronos_notification_queue_depth` | Gauge | — | Pending notifications in the NotificationThread queue. Update on `addNotification()` and after each queue swap |
| `chronos_notification_batch_duration_seconds` | Histogram | — | Time to process one swapped batch (use sub-second precision) |
| `chronos_emails_sent_total` | Counter | `type` | Emails accepted by SMTP (`curl_easy_perform` == `CURLE_OK`) |
| `chronos_emails_suppressed_total` | Counter | `type` | Notifications skipped because `userDetails.suppressNotifications` is set |
| `chronos_email_send_errors_total` | Counter | — | SMTP send failures (`curl_easy_perform` != `CURLE_OK`) |
| `chronos_notifications_dropped_total` | Counter | `reason` | Notifications abandoned before send attempt. `reason`: `user_details_failed`, `unknown_type` |

**Notification flow:** `processed` ≥ `sent` + `suppressed` + `dropped` + `send_errors`. A notification can be processed but neither sent nor dropped (e.g. if `sendMail()` fails, it counts as both processed and a send error).

## Outbound master client

Executor nodes call `ChronosMaster` over Thrift for stats reporting, user details, phrases, and user groups. This includes calls from `WorkerThread::addStat()`, `NotificationThread`, and `App::syncUserGroups()` (once per minute tick).

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_master_client_requests_total` | Counter | `method` | Outbound RPC calls. `method`: `reportNodeStats`, `getUserDetails`, `getPhrases`, `getUserGroups` |
| `chronos_master_client_errors_total` | Counter | `method` | Outbound RPC failures (Thrift exceptions and transport errors) |
| `chronos_phrase_sync_total` | Counter | — | Phrase cache refreshes in NotificationThread |
| `chronos_phrase_sync_errors_total` | Counter | — | Phrase cache refresh failures |

## Test runs

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_testrun_submitted_total` | Counter | — | Test runs submitted via NodeService |
| `chronos_testrun_completed_total` | Counter | `status` | Test runs finished. `status` uses same values as job `status` label |
| `chronos_testrun_active` | Gauge | — | Currently running test runs |
| `chronos_testrun_queue_depth` | Gauge | — | Pending test runs in the TestRunThread queue |

## Node service (inbound RPC)

`ChronosNode` methods from `protocol.thrift`:

| Method |
|---|
| `ping` |
| `getJobsForUser` |
| `getJobDetails` |
| `getJobLog` |
| `getJobLogDetails` |
| `createOrUpdateJob` |
| `getNotifications` |
| `getTimeSeriesData` |
| `deleteJob` |
| `disableJobsForUser` |
| `moveJobsFromUserFolder` |
| `updateUserGroupId` |
| `getUserScheduleLoad` |
| `getUserInfoForAllUsers` |
| `submitJobTestRun` |
| `getJobTestRunStatus` |
| `deleteJobTestRun` |

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_rpc_requests_total` | Counter | `service`, `method`, `result` | Inbound RPC requests. `service=node`, `result`: `ok`, `error` |
| `chronos_rpc_request_duration_seconds` | Histogram | `service`, `method` | Inbound RPC latency |
| `chronos_rpc_errors_total` | Counter | `service`, `method`, `exception` | Inbound RPC errors by Thrift exception type |

Failed requests appear in both `chronos_rpc_requests_total{result="error"}` and `chronos_rpc_errors_total`. Use `chronos_rpc_errors_total` for alerting; `chronos_rpc_requests_total` provides the denominator for error rates.

### RPC instrumentation approach

Use Apache Thrift's `TProcessorEventHandler` (not `TServerEventHandler`, which is connection-level and has no method name). Register on the generated processor:

```cpp
auto processor = std::make_shared<ChronosNodeProcessor>(handler);
processor->setEventHandler(std::make_shared<RpcMetricsProcessorEventHandler>("node"));
```

- `getContext(fn_name, …)` — start latency timer
- `postWrite(fn_name, …)` — record request count, duration, and outcome
- `handlerError(fn_name, …)` — undeclared `std::exception`; record `result=error`, `exception=internal_error`

**Declared Thrift exceptions** (`ResourceNotFound`, `Forbidden`, etc.) are caught by the generated processor, serialized as normal replies, and still call `postWrite` — not `handlerError`. To label them correctly, use `RpcThrow` helpers at existing throw sites that set a `thread_local` exception label before throwing; `postWrite` reads and clears it. Replace `throw ResourceNotFound()` with `RpcThrow::resourceNotFound()`, etc. (~29 sites across NodeService and MasterService). Undeclared exceptions (e.g. `std::runtime_error`) correctly reach `handlerError` without changes.

Do **not** wrap handlers in a per-method decorator implementing `ChronosNodeIf` / `ChronosMasterIf`.

## Master service (inbound RPC)

`ChronosMaster` methods from `protocol.thrift`:

| Method |
|---|
| `ping` |
| `reportNodeStats` |
| `getUserDetails` |
| `getPhrases` |
| `getUserGroups` |

Same metrics as Node service with `service=master`.

## Alerting suggestions

| Symptom | Metric / condition |
|---|---|
| Scheduler running late | `chronos_scheduler_loop_lag_seconds` > 1, or `rate(chronos_schedule_jobs_selected_total[5m])` drops unexpectedly |
| Per-job execution delay | Elevated p95 on `chronos_worker_jitter_seconds` |
| Result backlog growing | `chronos_update_queue_depth` sustained above threshold |
| Silent result data loss | `rate(chronos_jobs_executed_total[5m])` − `rate(chronos_update_results_total[5m])` > 0 sustained |
| Notification backlog growing | `chronos_notification_queue_depth` sustained above threshold |
| Email delivery broken | `rate(chronos_email_send_errors_total[5m])` > 0, or `rate(chronos_master_client_errors_total{method="getUserDetails"}[5m])` > 0 |
| DNS problems fleet-wide | `rate(chronos_jobs_executed_total{status="failed_dns"}[5m])` spike |
| Connect/timeout problems | High rate on `failed_connect` / `failed_timeout`, or elevated p95 on `chronos_job_duration_seconds` |
| SQLite/disk issues | `rate(chronos_sqlite_write_errors_total[5m])` > 0 |
| Master unreachable from executors | `rate(chronos_master_client_errors_total[5m])` > 0 |
| Socket/file-descriptor exhaustion | `rate(chronos_socket_exhaustion_total[5m])` > 0 |
| Hung worker threads | `chronos_worker_inflight_jobs` > 0 long after the last `chronos_schedule_jobs_selected_total` increase |
| Misconfigured time zones | `rate(chronos_schedule_timezones_skipped_total[1h])` > 0 |

## Performance at scale

Production fleet: **~100M executions/day on 5 executor nodes** (~20M/node/day, ~13.9k jobs/minute/node, bursts of 500–1,500 completions/sec per node). Per-job prometheus-cpp mutex operations on the job-completion path are not acceptable at this scale.

### Hot path: batch and flush

| Path | Strategy |
|---|---|
| `WorkerThread::jobDone()` | Update local `WorkerMetricsBatch` only (status counts + duration/jitter histogram buckets). **No prometheus-cpp calls.** |
| End of `WorkerThread::threadMain()` | `Metrics::mergeWorkerBatch()` — merge counter deltas and histogram bucket counts under one lock per metric family |
| `processJobsForTimeZone()` | Accumulate into local `ScheduleMetricsBatch`; flush once after `processJobs()` |
| `UpdateThread`, RPC, notifications | Direct prometheus-cpp writes at low frequency — no batching needed |

Pre-create and cache all bounded metric label combinations at init. Never call `.Add({labels})` on the hot path.

Histogram merge at flush should add bucket deltas directly (lock once per family), not replay individual `Observe()` per job.

### Load testing

Before production deploy, benchmark `jobDone()` with metrics enabled vs disabled at ≥1,000 completions/sec per worker thread. Target: < 5% p99 latency increase; no increase in `chronos_update_queue_depth` backlog vs baseline.

## Implementation notes

- Instrument at natural boundaries: queue swaps in UpdateThread/NotificationThread, `WorkerMetricsBatch` flush at end of `WorkerThread::threadMain()`, end of `processJobs()`, and `TProcessorEventHandler` on inbound RPC processors.
- Metrics are updated from multiple threads. Use prometheus-cpp's thread-safe registry mode or a metrics singleton with internal locking.
- Batch duration histograms should use sub-second timestamps (`std::chrono` or `Utils::getTimestampMS()`), not `time(nullptr)`.
- The `/metrics` endpoint should be bound to localhost or a restricted interface by default (`metrics_interface` in `chronos.cfg`).
- Use `metrics_enable` to disable the endpoint on nodes where it is not wanted.
- Add prometheus-cpp via CMake `FetchContent` (pin a stable tag). Dockerfiles may need updating if not using FetchContent.
