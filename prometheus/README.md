# Prometheus monitoring for chronos

Alerting rules and setup notes for chronos metrics on `:9098/metrics`.

## Scrape configuration

Add a scrape job to `prometheus.yml` (one target per executor node):

```yaml
scrape_configs:
  - job_name: chronos
    scrape_interval: 30s
    static_configs:
      - targets:
          - chronos-node-1:9098
          - chronos-node-2:9098
```

The Grafana dashboard lives in [`grafana/dashboards/chronos.json`](../grafana/dashboards/chronos.json).

## Alert rules

[`alerts/chronos.yml`](alerts/chronos.yml) defines recording rules and alerts aligned with [`design/prometheus-metrics.md`](../design/prometheus-metrics.md).

### Load rules

```yaml
# prometheus.yml
rule_files:
  - /etc/prometheus/alerts/chronos.yml
```

Reload or restart Prometheus after deploying the file.

### Alert summary

| Alert | Severity | What it detects |
|---|---|---|
| `ChronosSchedulerLagHigh` | warning | Main loop starts `processJobs()` >1s late |
| `ChronosTimezoneSkipped` | warning | Invalid timezone skipped during scheduling |
| `ChronosJobSuccessRateLow` | warning | Success ratio <80% with sustained throughput |
| `ChronosJobDurationHigh` | warning | p95 job duration >30s |
| `ChronosWorkerJitterHigh` | warning | p95 scheduling jitter >45s |
| `ChronosDnsFailureSpike` | warning | >10% jobs failing with `failed_dns` |
| `ChronosConnectFailureSpike` | warning | >10% jobs failing with `failed_connect` |
| `ChronosTimeoutFailureSpike` | warning | >10% jobs failing with `failed_timeout` |
| `ChronosSocketExhaustion` | critical | `socket()` exhaustion in curl |
| `ChronosHungWorkerThreads` | warning | Active workers but no scheduling for 25m |
| `ChronosWorkerLifetimeHigh` | warning | p95 worker thread lifetime >10m |
| `ChronosUpdateQueueBacklog` | warning | Queue depth >500 with persist gap >0.1/s for 10m |
| `ChronosPersistGap` | critical | Executed rate exceeds persisted rate |
| `ChronosSqliteWriteErrors` | critical | SQLite joblog write failures |
| `ChronosMysqlWriteErrors` | critical | MySQL job update failures |
| `ChronosNotificationQueueBacklog` | warning | Notification queue depth >50 for 10m |
| `ChronosEmailSendErrors` | warning | SMTP send failures |
| `ChronosPhraseSyncErrors` | warning | Phrase cache sync failures |
| `ChronosMasterClientErrors` | warning | Outbound master Thrift errors |
| `ChronosMasterGetUserDetailsErrors` | warning | User lookup failures (blocks email) |
| `ChronosRpcErrors` | warning | Inbound RPC error rate elevated |

Tune thresholds (queue depths, ratios, `for` durations) for your fleet before production use.

## Grafana alerting

These rules work with **Grafana Alerting** when Grafana uses the same Prometheus datasource:

1. Ensure Prometheus loads `alerts/chronos.yml` and is scraped by Grafana.
2. **Alerting → Alert rules → New alert rule** can mirror any rule, or use Grafana's built-in Prometheus alert state if you configure Grafana to manage Prometheus rules via provisioning.

For Alertmanager routing, label alerts with `severity` (`critical`, `warning`, `info`) as defined in the rule file.

### Example Alertmanager route

```yaml
route:
  routes:
    - matchers:
        - severity = critical
      receiver: pagerduty
    - matchers:
        - severity = warning
      receiver: slack
    - matchers:
        - severity = info
      receiver: slack-info
```

## Validate rules

```bash
promtool check rules prometheus/alerts/chronos.yml
```

If `promtool` is not installed locally, run inside a Prometheus container:

```bash
docker run --rm -v "$PWD/prometheus/alerts:/rules" prom/prometheus promtool check rules /rules/chronos.yml
```
