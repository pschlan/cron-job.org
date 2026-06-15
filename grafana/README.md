# Grafana dashboards

## Chronos (`dashboards/chronos.json`)

Operational dashboard for chronos executor metrics exposed on `:9098/metrics`.

### Import

1. In Grafana: **Dashboards → New → Import**
2. Upload `dashboards/chronos.json` or paste its contents
3. Select your Prometheus datasource when prompted

### Prometheus scrape config

Example scrape job (adjust host/port per node):

```yaml
scrape_configs:
  - job_name: chronos
    static_configs:
      - targets: ['chronos-node-1:9098', 'chronos-node-2:9098']
```

The dashboard filters by `instance` (scrape target) and `node_id` (from `chronos_info`). Scheduler panels exclude non-executor nodes (e.g. master-only) via `chronos_info{mode=~".*executor.*"}` — those nodes expose `chronos_scheduler_loop_lag_seconds` as 0 because the executor loop never runs.

### Sections

| Row | What it shows |
|---|---|
| Overview | Throughput, success rate, scheduler lag, update backlog, worker threads & inflight, persist gap |
| Scheduling | Jobs selected per minute, tick duration, jitter |
| Workers & resources | Active threads & inflight, thread activity, thread lifetime, socket exhaustion |
| Persistence | Update queue, batch duration, executed vs persisted, SQLite/MySQL errors |
| Notifications | Queue depth, flow by type, email/phrase errors |
| RPC & master client | Inbound RPC rate/latency/errors, outbound master client |
| Test runs & nodes | Test run activity, node inventory table |

See [design/prometheus-metrics.md](../design/prometheus-metrics.md) for metric definitions.

## Alerting

Prometheus alert rules are in [`prometheus/alerts/chronos.yml`](../prometheus/alerts/chronos.yml). See [`prometheus/README.md`](../prometheus/README.md) for scrape config, rule loading, and Alertmanager routing notes.
