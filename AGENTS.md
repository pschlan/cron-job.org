# Agent notes

Guidance for automated and human contributors working in this repository.

## Prometheus metrics (chronos)

Full metric names, labels, buckets, and alerting ideas live in [`design/prometheus-metrics.md`](design/prometheus-metrics.md). The Grafana dashboard is in [`grafana/dashboards/chronos.json`](grafana/dashboards/chronos.json).

When touching job execution, persistence, notifications, or RPC, assume metrics correctness matters — especially on the **hot path** (~100M executions/day fleet-wide).

### Hot path: batch, never per-job prometheus calls

Job completion runs at very high volume. **Do not** call `Metrics::instance()` or prometheus-cpp from `WorkerThread::jobDone()`.

| Location | Pattern |
|---|---|
| `WorkerThread::jobDone()` | `WorkerMetricsBatch::record()` only |
| End of `WorkerThread::threadMain()` | `Metrics::mergeWorkerBatch()` once |
| `App::processJobsForTimeZone()` | `ScheduleMetricsBatch::add()` per assigned job |
| End of `App::processJobs()` | `Metrics::mergeScheduleBatch()` once |

`WorkerMetricsBatch` and `ScheduleMetricsBatch` use fixed-size arrays indexed via `MetricsLabels::*Index()`. If you add enum values (job type, status, priority), update **both** the label helpers and the `NUM_*` constants / pre-cached counter arrays in `Metrics.cpp`.

### Label mapping (`MetricsLabels`)

All bounded label strings and batch indices go through [`chronos/MetricsLabels.h`](chronos/MetricsLabels.h) / [`chronos/MetricsLabels.cpp`](chronos/MetricsLabels.cpp).

When adding or renaming a label value:

1. Update the `*Label()` function (used by direct instrumentation and Grafana).
2. Update the matching `*Index()` function and array sizes in `WorkerMetricsBatch` / `ScheduleMetricsBatch` if applicable.
3. Update pre-cached metric families in `Metrics::Metrics()` constructor (`Metrics.cpp`) — new label combinations must be created at init, not on the hot path via `.Add({...})`.
4. Update `design/prometheus-metrics.md` and relevant Grafana panels.

Keep label cardinality low: no `job_id`, `user_id`, `url`, or raw HTTP status codes. Use binned values (`priority`, `http_status_class`, bounded `operation` / `reason` strings).

Convert durations to **seconds** at instrumentation time (ms/µs → s).

### Inbound Thrift RPC

Use [`RpcThrow`](chronos/RpcThrow.h) for **declared** Thrift exceptions in `NodeService.cpp` and `MasterService.cpp`:

```cpp
Chronos::RpcThrow::resourceNotFound();  // not throw ResourceNotFound();
```

Declared exceptions are serialized as normal replies; `RpcMetricsProcessorEventHandler` reads a thread-local label in `postWrite()` to populate `chronos_rpc_errors_total{exception=...}`.

- Do **not** wrap handlers in a decorator implementing `ChronosNodeIf` / `ChronosMasterIf`.
- Wire metrics via `processor->setEventHandler(std::make_shared<RpcMetricsProcessorEventHandler>("node"))` (or `"master"`) on the generated processor in the service constructor.
- Undeclared `std::exception` types reach `handlerError()` and are recorded as `internal_error` automatically.

When adding a new declared exception to `protocol.thrift`, add matching `RpcThrow::` helpers and an `exception` label value in the design doc / metrics spec.

### Outbound master client

Wrap `ChronosMasterClient` calls with [`callMaster()`](chronos/MasterClientMetrics.h):

```cpp
callMaster("getUserGroups", [&]() { masterClient->getUserGroups(userGroups); });
```

Use a stable `method` string matching the Thrift method name. Used from `App::syncUserGroups()`, `WorkerThread::addStat()`, and `NotificationThread`.

### Cold-path threads (UpdateThread, NotificationThread, TestRunThread)

These run at lower frequency; direct `Metrics::instance()` calls are fine.

**UpdateThread**

- Set `chronos_update_queue_depth` from `tempQueue.size()` after the queue **swap**, not in `addResult()`.
- Observe batch duration around the drain loop; reset depth to 0 after processing.
- Increment `chronos_update_results_total` only after full success (SQLite + MySQL).
- Wrap MySQL writes in try/catch; increment `chronos_mysql_write_errors_total{operation=...}` and return — do not let exceptions kill the thread.
- SQLite failures: increment `chronos_sqlite_write_errors_total{operation=...}` with a bounded operation name.

**NotificationThread**

- Queue depth on `addNotification()` and after batch swap (see design doc for exact semantics).
- Pass notification `type` into email metrics (`incrementEmailsSent`, `incrementEmailsSuppressed`).
- Use `callMaster()` for `getUserDetails` / `getPhrases`.

**Workers**

- Increment/decrement `chronos_worker_threads` via `Metrics::adjustWorkerThreads()` in `WorkerThread::run()` / end of `threadMain()` (not from `App`).
- Observe `chronos_worker_thread_lifetime_seconds` once at end of `threadMain()` (one call per thread per tick — not on the per-job hot path).
- Inflight jobs use `Metrics::adjustWorkerInflight()` in `runJobs()` / `jobDone()`.
- Each `WorkerThread` is constructed with a fixed `job_type` (default vs monitoring slot).

**TestRunThread**

- Update queue/active gauges when queue is swapped or test runs start/complete.

### Adding a new metric family

1. Register the family in `Metrics::Metrics()` with all bounded label combinations pre-cached.
2. Expose a method on `Metrics` (avoid calling prometheus-cpp from call sites directly).
3. Instrument at a natural boundary (see design doc).
4. Update `design/prometheus-metrics.md`.
5. Add or extend panels in `grafana/dashboards/chronos.json`.
6. Add or update alerts in `prometheus/alerts/chronos.yml` when the change affects operability or SLOs.

Config keys: `metrics_enable`, `metrics_port`, `metrics_interface` in `chronos/chronos.cfg` and `docker/chronos/chronos.cfg`. Use `Config::get(key, default)` / `getInt(key, default)` for optional keys.

Build: prometheus-cpp is vendored via CMake `FetchContent` in `chronos/CMakeLists.txt` (requires CMake ≥ 3.14; Docker build installs Kitware CMake).

### Checklist before merging metrics-related changes

- [ ] No prometheus-cpp calls on the per-job hot path (`jobDone`, inner HTTP loop).
- [ ] New label values added to `MetricsLabels` and pre-cached in `Metrics.cpp`.
- [ ] Thrift throw sites use `Chronos::RpcThrow::`, not raw `throw X()`.
- [ ] Outbound master calls use `callMaster()`.
- [ ] Durations exported in seconds; bounded labels only.
- [ ] Design doc, Grafana dashboard, and Prometheus alerts updated if metric names, labels, or semantics changed.
