# chronos: Prometheus metrics

This document proposes Prometheus metrics for `chronos`. They can be implemented e.g. by adding an exporter via the [`prometheus-cpp`](https://github.com/jupp0r/prometheus-cpp) library, exposed on a dedicated HTTP endpoint (e.g. `:9090/metrics`).

All metrics below are intended for Grafana dashboards (history over time, rates per time unit) and alerting.

## Conventions

### Naming

Follow [Prometheus naming conventions](https://prometheus.io/docs/practices/naming/):

- Prefix all metrics with `chronos_`.
- Counters end with `_total`.
- Durations use `_seconds` (convert from ms/µs at instrumentation time).
- Sizes use `_bytes`.
- Histograms expose `_bucket`, `_sum`, and `_count` suffixes automatically.

### Metric types

| Type | Use for |
|---|---|
| Counter | Monotonically increasing events (jobs executed, errors, RPC calls) |
| Gauge | Point-in-time values (queue depth, in-flight jobs) |
| Histogram | Distributions (durations, sizes, batch processing time) |

### Labels and cardinality

Keep label cardinality low. Avoid unbounded labels such as `job_id`, `user_id`, or `url`.

| Label | Values | Notes |
|---|---|---|
| `job_type` | `default`, `monitoring` | From `JobType_t` |
| `status` | `ok`, `failed_dns`, `failed_connect`, `failed_httperror`, `failed_timeout`, `failed_size`, `failed_url`, `failed_internal`, `failed_others`, `unknown` | Maps to `JOBSTATUS_*`; omit `http_status` here |
| `type` | `failure`, `success`, `disable`, `ssl_cert_expiry` | Notification type |
| `phase` | `name_lookup`, `connect`, `app_connect`, `pre_transfer`, `start_transfer`, `total` | cURL timing phases |
| `part` | `header`, `body`, `total` | Response size histogram |
| `service` | `node`, `master` | Inbound Thrift service |
| `method` | Thrift RPC method name | Bounded by service definition (~20 methods total) |
| `result` | `ok`, `error` | RPC outcome |
| `exception` | `internal_error`, `resource_not_found`, `forbidden`, `invalid_arguments`, `feature_not_available` | Thrift exceptions only; omit on success |
| `operation` | Bounded set per subsystem | e.g. `joblog_insert`, `job_update`, `notification_insert` |
| `priority` | `-128` … `127` or binned | Execution priority from user group; consider bucketing rare values |
| `version`, `node_id`, `mode` | Constant per process | On `chronos_info` only |

For HTTP-error jobs (`failed_httperror`), optionally add an `http_status_class` label (`2xx`, `3xx`, `4xx`, `5xx`) — not the full status code — to keep cardinality at 4 values.

### Histogram buckets

Suggested defaults (adjust after observing production data):

| Metric | Buckets |
|---|---|
| `chronos_job_duration_seconds` | 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300 |
| `chronos_job_curl_phase_seconds` | 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30 |
| `chronos_job_response_bytes` | 256, 1K, 4K, 16K, 64K, 256K, 1M, 4M, 16M |
| `chronos_schedule_tick_duration_seconds` | 0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300 |
| `chronos_update_batch_duration_seconds` | 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60 |
| `chronos_notification_batch_duration_seconds` | 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60 |
| `chronos_rpc_request_duration_seconds` | 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5 |

## Process info

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_info` | Gauge (= 1) | `version`, `node_id`, `mode` | Process identity. `mode` reflects enabled roles: `executor`, `node_service`, `master` (combinable) |

## Scheduling

Metrics around the main-loop minute tick in `App::processJobs()`.

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_schedule_jobs_selected_total` | Counter | `job_type`, `priority` | Jobs fetched from MySQL and queued for execution per tick |
| `chronos_schedule_tick_duration_seconds` | Histogram | — | Wall-clock duration of a full `processJobs()` cycle |
| `chronos_schedule_lag_seconds` | Gauge | — | `time(nullptr) - plannedTime` when worker threads start; non-zero means the node missed its execution window |
| `chronos_schedule_timezones_skipped_total` | Counter | — | Time zones that failed to load (`cctz::load_time_zone`) |
| `chronos_jobs_auto_disabled_total` | Counter | — | Jobs automatically disabled after exceeding `maxFailures` |

## Job execution

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_jobs_executed_total` | Counter | `job_type`, `status` | Completed HTTP requests, one increment per job |
| `chronos_jobs_blocked_total` | Counter | `reason` | Jobs rejected before network I/O. `reason`: `blocked_ip`, `invalid_url` |
| `chronos_job_duration_seconds` | Histogram | `job_type` | End-to-end job duration (`JobResult::duration`, converted from ms) |
| `chronos_job_curl_phase_seconds` | Histogram | `phase` | cURL timing breakdown (`timeNameLookup`, `timeConnect`, etc., converted from µs) |
| `chronos_job_response_bytes` | Histogram | `part` | Response size (`header`, `body`, or `total`) |

For `status=failed_httperror`, optionally add label `http_status_class` (`2xx`/`3xx`/`4xx`/`5xx`).

## Worker threads

Worker threads are created per minute tick and exit when their batch finishes. Gauges should be updated at instrumentation points within the tick lifecycle.

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_worker_threads_started_total` | Counter | `job_type` | Worker threads started per tick (non-empty batches only) |
| `chronos_worker_inflight_jobs` | Gauge | `job_type` | Currently running HTTP requests across all worker threads |
| `chronos_worker_batch_jobs` | Counter | `job_type` | Jobs assigned to worker threads per tick |
| `chronos_worker_jitter_seconds` | Histogram | `job_type` | Scheduling jitter (`JobResult::jitter`, converted from ms) |

## UpdateThread

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_update_results_total` | Counter | — | Job results processed (persisted to SQLite + MySQL) |
| `chronos_update_queue_depth` | Gauge | — | Pending results in the UpdateThread queue |
| `chronos_update_batch_duration_seconds` | Histogram | — | Time to process one swapped batch |
| `chronos_sqlite_write_errors_total` | Counter | `operation` | SQLite write failures. `operation`: `joblog_insert`, `joblog_stats_insert`, `joblog_ssl_insert`, `histogram_update` |
| `chronos_mysql_write_errors_total` | Counter | `operation` | MySQL write failures. `operation`: `job_update`, `job_disable`, `notification_insert`, `ssl_cert_expiry_update` |

## NotificationThread

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_notifications_processed_total` | Counter | `type` | Notifications handled. `type`: `failure`, `success`, `disable`, `ssl_cert_expiry` |
| `chronos_notification_queue_depth` | Gauge | — | Pending notifications in the NotificationThread queue |
| `chronos_notification_batch_duration_seconds` | Histogram | — | Time to process one swapped batch |
| `chronos_emails_sent_total` | Counter | `type` | Emails handed off to SMTP successfully |
| `chronos_emails_suppressed_total` | Counter | — | Notifications skipped due to user-level suppression |
| `chronos_email_send_errors_total` | Counter | — | SMTP send failures (`curl_easy_perform` != `CURLE_OK`) |
| `chronos_notifications_dropped_total` | Counter | `reason` | Notifications not sent. `reason`: `user_details_failed`, `unknown_type` |

## Outbound master client

Executor nodes call `ChronosMaster` over Thrift for stats reporting, user details, phrases, and user groups.

| Metric | Type | Labels | Description |
|---|---|---|---|
| `chronos_master_client_requests_total` | Counter | `method` | Outbound RPC calls. `method`: `reportNodeStats`, `getUserDetails`, `getPhrases`, `getUserGroups` |
| `chronos_master_client_errors_total` | Counter | `method` | Outbound RPC failures (Thrift exceptions) |
| `chronos_phrase_sync_total` | Counter | — | Phrase cache refreshes |
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
| Node not executing on schedule | `chronos_schedule_lag_seconds` > 0, or `rate(chronos_schedule_jobs_selected_total[5m])` drops unexpectedly |
| Result backlog growing | `chronos_update_queue_depth` sustained above threshold |
| Notification backlog growing | `chronos_notification_queue_depth` sustained above threshold |
| Email delivery broken | `rate(chronos_email_send_errors_total[5m])` > 0, or `rate(chronos_master_client_errors_total{method="getUserDetails"}[5m])` > 0 |
| DNS problems fleet-wide | `rate(chronos_jobs_executed_total{status="failed_dns"}[5m])` spike |
| Connect/timeout problems | High rate on `failed_connect` / `failed_timeout`, or elevated p95 on `chronos_job_curl_phase_seconds{phase="connect"}` |
| SQLite/disk issues | `rate(chronos_sqlite_write_errors_total[5m])` > 0 |
| Master unreachable from executors | `rate(chronos_master_client_errors_total[5m])` > 0 |

## Implementation notes

- Instrument at natural boundaries: after queue swaps in UpdateThread/NotificationThread, in `WorkerThread::jobDone()`, at the end of `processJobs()`, and in Thrift handler wrappers.
- The `/metrics` endpoint should be bound to localhost or a restricted interface by default; the interface should be configurable via `chronos.cfg` consistent with other bind addresses used in the application
- Consider a `chronos_metrics_enable` config flag so metrics can be disabled on nodes where the endpoint is not wanted.
- Dockerfiles might need to be updated to install the `prometheus-cpp` dependency
