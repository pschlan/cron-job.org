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

The dashboard filters by `instance` (scrape target) and `node_id` (from `chronos_info`).

### Sections

| Row | What it shows |
|---|---|
| Overview | Throughput, success rate, scheduler lag, update backlog, worker threads & inflight, persist gap |
| Scheduling | Jobs selected per minute, tick duration, jitter |
| Workers & resources | Active threads & inflight by type, thread activity (started vs active), socket exhaustion, auto-disable |
| Persistence | Update queue, batch duration, executed vs persisted, SQLite/MySQL errors |
| Notifications | Queue depth, flow by type, email/phrase errors |
| RPC & master client | Inbound RPC rate/latency/errors, outbound master client |
| Test runs & nodes | Test run activity, node inventory table |

See [design/prometheus-metrics.md](../design/prometheus-metrics.md) for metric definitions and alerting suggestions.
