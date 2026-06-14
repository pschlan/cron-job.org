/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2025 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#include "Metrics.h"

#include <stdexcept>

#include <prometheus/counter.h>
#include <prometheus/gauge.h>
#include <prometheus/histogram.h>

#include "MetricsLabels.h"

#ifndef CHRONOS_VERSION
#define CHRONOS_VERSION "unknown"
#endif

namespace Chronos
{

Metrics *Metrics::instance_ = nullptr;

namespace {

const std::vector<double> kJobDurationBuckets = {
	0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300
};

const std::vector<double> kJitterBuckets = kJobDurationBuckets;

const std::vector<double> kScheduleTickBuckets = {
	0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300
};

const std::vector<double> kWorkerThreadLifetimeBuckets = {
	0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 900
};

const std::vector<double> kBatchDurationBuckets = {
	0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60
};

const std::vector<double> kRpcDurationBuckets = {
	0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5
};

const char *kJobTypeLabels[] = { "default", "monitoring" };
const char *kStatusLabels[] = {
	"ok", "failed_dns", "failed_connect", "failed_httperror", "failed_timeout",
	"failed_size", "failed_url", "failed_internal", "failed_others", "unknown"
};
const char *kPriorityLabels[] = { "low", "default", "high" };

const char *kNotificationTypes[] = { "failure", "success", "disable", "ssl_cert_expiry" };

}

Metrics &Metrics::instance()
{
	if(instance_ == nullptr)
		throw std::runtime_error("Metrics not initialized");
	return *instance_;
}

void Metrics::init(const std::string &mode, int nodeId)
{
	if(instance_ != nullptr)
		return;
	instance_ = new Metrics(mode, nodeId);
}

void Metrics::shutdown()
{
	delete instance_;
	instance_ = nullptr;
}

Metrics::Metrics(const std::string &mode, int nodeId)
	: registry_(std::make_shared<prometheus::Registry>())
{
	for(int i = 0; i < WorkerMetricsBatch::NUM_JOB_TYPES; ++i)
	{
		workerThreads_[i] = 0;
		workerInflight_[i] = 0;
	}

	auto &infoFamily = prometheus::BuildGauge()
		.Name("chronos_info")
		.Help("Chronos process identity")
		.Register(*registry_);
	infoFamily.Add({
		{"version", CHRONOS_VERSION},
		{"node_id", std::to_string(nodeId)},
		{"mode", mode}
	}).Set(1);

	jobsExecutedFamily_ = &prometheus::BuildCounter()
		.Name("chronos_jobs_executed_total")
		.Help("Completed HTTP cron jobs")
		.Register(*registry_);
	for(int jt = 0; jt < WorkerMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		for(int st = 0; st < WorkerMetricsBatch::NUM_STATUSES; ++st)
		{
			jobsExecuted_[jt][st] = &jobsExecutedFamily_->Add({
				{"job_type", kJobTypeLabels[jt]},
				{"status", kStatusLabels[st]}
			});
		}
	}

	jobDurationFamily_ = &prometheus::BuildHistogram()
		.Name("chronos_job_duration_seconds")
		.Help("End-to-end job duration")
		.Register(*registry_);
	for(int jt = 0; jt < WorkerMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		jobDuration_[jt] = &jobDurationFamily_->Add(
			{{"job_type", kJobTypeLabels[jt]}}, kJobDurationBuckets);
	}

	workerJitterFamily_ = &prometheus::BuildHistogram()
		.Name("chronos_worker_jitter_seconds")
		.Help("Scheduling jitter (dateStarted - datePlanned)")
		.Register(*registry_);
	for(int jt = 0; jt < WorkerMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		workerJitter_[jt] = &workerJitterFamily_->Add(
			{{"job_type", kJobTypeLabels[jt]}}, kJitterBuckets);
	}

	scheduleJobsSelectedFamily_ = &prometheus::BuildCounter()
		.Name("chronos_schedule_jobs_selected_total")
		.Help("Jobs fetched from MySQL and assigned to workers per tick")
		.Register(*registry_);
	for(int jt = 0; jt < ScheduleMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		for(int pr = 0; pr < ScheduleMetricsBatch::NUM_PRIORITIES; ++pr)
		{
			scheduleJobsSelected_[jt][pr] = &scheduleJobsSelectedFamily_->Add({
				{"job_type", kJobTypeLabels[jt]},
				{"priority", kPriorityLabels[pr]}
			});
		}
	}

	workerThreadsStartedFamily_ = &prometheus::BuildCounter()
		.Name("chronos_worker_threads_started_total")
		.Help("Worker threads started per tick")
		.Register(*registry_);
	for(int jt = 0; jt < WorkerMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		workerThreadsStarted_[jt] = &workerThreadsStartedFamily_->Add({
			{"job_type", kJobTypeLabels[jt]}
		});
	}

	workerThreadsFamily_ = &prometheus::BuildGauge()
		.Name("chronos_worker_threads")
		.Help("Currently active worker threads (from run() until threadMain exits)")
		.Register(*registry_);
	for(int jt = 0; jt < WorkerMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		workerThreadsGauge_[jt] = &workerThreadsFamily_->Add({
			{"job_type", kJobTypeLabels[jt]}
		});
	}

	workerInflightFamily_ = &prometheus::BuildGauge()
		.Name("chronos_worker_inflight_jobs")
		.Help("Currently running HTTP requests across worker threads")
		.Register(*registry_);
	for(int jt = 0; jt < WorkerMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		workerInflightGauge_[jt] = &workerInflightFamily_->Add({
			{"job_type", kJobTypeLabels[jt]}
		});
	}

	workerThreadLifetimeFamily_ = &prometheus::BuildHistogram()
		.Name("chronos_worker_thread_lifetime_seconds")
		.Help("Wall-clock time from WorkerThread::threadMain() entry until exit")
		.Register(*registry_);
	for(int jt = 0; jt < WorkerMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		workerThreadLifetime_[jt] = &workerThreadLifetimeFamily_->Add(
			{{"job_type", kJobTypeLabels[jt]}}, kWorkerThreadLifetimeBuckets);
	}

	auto &schedulerLagFamily = prometheus::BuildGauge()
		.Name("chronos_scheduler_loop_lag_seconds")
		.Help("Delay from minute boundary to processJobs() invocation")
		.Register(*registry_);
	schedulerLoopLagGauge_ = &schedulerLagFamily.Add({});

	scheduleTickDurationFamily_ = &prometheus::BuildHistogram()
		.Name("chronos_schedule_tick_duration_seconds")
		.Help("Duration of processJobs() until workers are started")
		.Register(*registry_);
	scheduleTickDuration_ = &scheduleTickDurationFamily_->Add({}, kScheduleTickBuckets);

	scheduleTimezonesSkipped_ = &prometheus::BuildCounter()
		.Name("chronos_schedule_timezones_skipped_total")
		.Help("Time zones that failed to load")
		.Register(*registry_)
		.Add({});

	jobsAutoDisabled_ = &prometheus::BuildCounter()
		.Name("chronos_jobs_auto_disabled_total")
		.Help("Jobs automatically disabled after exceeding maxFailures")
		.Register(*registry_)
		.Add({});

	socketExhaustionFamily_ = &prometheus::BuildCounter()
		.Name("chronos_socket_exhaustion_total")
		.Help("socket() failures in curlOpenSocketFunction")
		.Register(*registry_);

	auto &updateQueueFamily = prometheus::BuildGauge()
		.Name("chronos_update_queue_depth")
		.Help("Pending results in UpdateThread queue")
		.Register(*registry_);
	updateQueueDepth_ = &updateQueueFamily.Add({});

	updateBatchDurationFamily_ = &prometheus::BuildHistogram()
		.Name("chronos_update_batch_duration_seconds")
		.Help("Time to process one UpdateThread batch")
		.Register(*registry_);
	updateBatchDuration_ = &updateBatchDurationFamily_->Add({}, kBatchDurationBuckets);

	updateResults_ = &prometheus::BuildCounter()
		.Name("chronos_update_results_total")
		.Help("Job results fully persisted")
		.Register(*registry_)
		.Add({});

	sqliteWriteErrorsFamily_ = &prometheus::BuildCounter()
		.Name("chronos_sqlite_write_errors_total")
		.Help("SQLite write failures in UpdateThread")
		.Register(*registry_);

	mysqlWriteErrorsFamily_ = &prometheus::BuildCounter()
		.Name("chronos_mysql_write_errors_total")
		.Help("MySQL write failures in UpdateThread")
		.Register(*registry_);

	auto &notificationQueueFamily = prometheus::BuildGauge()
		.Name("chronos_notification_queue_depth")
		.Help("Pending notifications in NotificationThread queue")
		.Register(*registry_);
	notificationQueueDepth_ = &notificationQueueFamily.Add({});

	notificationBatchDurationFamily_ = &prometheus::BuildHistogram()
		.Name("chronos_notification_batch_duration_seconds")
		.Help("Time to process one NotificationThread batch")
		.Register(*registry_);
	notificationBatchDuration_ = &notificationBatchDurationFamily_->Add({}, kBatchDurationBuckets);

	notificationsProcessedFamily_ = &prometheus::BuildCounter()
		.Name("chronos_notifications_processed_total")
		.Help("Notifications entered processNotification()")
		.Register(*registry_);

	emailsSentFamily_ = &prometheus::BuildCounter()
		.Name("chronos_emails_sent_total")
		.Help("Emails accepted by SMTP")
		.Register(*registry_);

	emailsSuppressedFamily_ = &prometheus::BuildCounter()
		.Name("chronos_emails_suppressed_total")
		.Help("Notifications skipped due to user suppression")
		.Register(*registry_);

	emailSendErrors_ = &prometheus::BuildCounter()
		.Name("chronos_email_send_errors_total")
		.Help("SMTP send failures")
		.Register(*registry_)
		.Add({});

	notificationsDroppedFamily_ = &prometheus::BuildCounter()
		.Name("chronos_notifications_dropped_total")
		.Help("Notifications abandoned before send attempt")
		.Register(*registry_);

	masterClientRequestsFamily_ = &prometheus::BuildCounter()
		.Name("chronos_master_client_requests_total")
		.Help("Outbound ChronosMaster RPC calls")
		.Register(*registry_);

	masterClientErrorsFamily_ = &prometheus::BuildCounter()
		.Name("chronos_master_client_errors_total")
		.Help("Outbound ChronosMaster RPC failures")
		.Register(*registry_);

	phraseSync_ = &prometheus::BuildCounter()
		.Name("chronos_phrase_sync_total")
		.Help("Phrase cache refreshes")
		.Register(*registry_)
		.Add({});

	phraseSyncErrors_ = &prometheus::BuildCounter()
		.Name("chronos_phrase_sync_errors_total")
		.Help("Phrase cache refresh failures")
		.Register(*registry_)
		.Add({});

	testrunSubmitted_ = &prometheus::BuildCounter()
		.Name("chronos_testrun_submitted_total")
		.Help("Test runs submitted via NodeService")
		.Register(*registry_)
		.Add({});

	testrunCompletedFamily_ = &prometheus::BuildCounter()
		.Name("chronos_testrun_completed_total")
		.Help("Test runs finished")
		.Register(*registry_);

	auto &testrunActiveFamily = prometheus::BuildGauge()
		.Name("chronos_testrun_active")
		.Help("Currently running test runs")
		.Register(*registry_);
	testrunActive_ = &testrunActiveFamily.Add({});

	auto &testrunQueueFamily = prometheus::BuildGauge()
		.Name("chronos_testrun_queue_depth")
		.Help("Pending test runs in TestRunThread queue")
		.Register(*registry_);
	testrunQueueDepth_ = &testrunQueueFamily.Add({});

	rpcRequestsFamily_ = &prometheus::BuildCounter()
		.Name("chronos_rpc_requests_total")
		.Help("Inbound Thrift RPC requests")
		.Register(*registry_);

	rpcRequestDurationFamily_ = &prometheus::BuildHistogram()
		.Name("chronos_rpc_request_duration_seconds")
		.Help("Inbound Thrift RPC latency")
		.Register(*registry_);

	rpcErrorsFamily_ = &prometheus::BuildCounter()
		.Name("chronos_rpc_errors_total")
		.Help("Inbound Thrift RPC errors by exception type")
		.Register(*registry_);
}

void Metrics::mergeWorkerBatch(const WorkerMetricsBatch &batch)
{
	for(int jt = 0; jt < WorkerMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		for(int st = 0; st < WorkerMetricsBatch::NUM_STATUSES; ++st)
		{
			if(batch.statusCount[jt][st] > 0)
				jobsExecuted_[jt][st]->Increment(static_cast<double>(batch.statusCount[jt][st]));
		}

		for(double v : batch.durationSeconds[jt])
			jobDuration_[jt]->Observe(v);

		for(double v : batch.jitterSeconds[jt])
			workerJitter_[jt]->Observe(v);

		workerInflightGauge_[jt]->Set(static_cast<double>(workerInflight_[jt].load()));
	}
}

void Metrics::mergeScheduleBatch(const ScheduleMetricsBatch &batch)
{
	for(int jt = 0; jt < ScheduleMetricsBatch::NUM_JOB_TYPES; ++jt)
	{
		for(int pr = 0; pr < ScheduleMetricsBatch::NUM_PRIORITIES; ++pr)
		{
			if(batch.counts[jt][pr] > 0)
				scheduleJobsSelected_[jt][pr]->Increment(static_cast<double>(batch.counts[jt][pr]));
		}
	}
}

void Metrics::incrementWorkerThreadsStarted(JobType_t jobType)
{
	workerThreadsStarted_[MetricsLabels::jobTypeIndex(jobType)]->Increment();
}

void Metrics::adjustWorkerThreads(JobType_t jobType, int delta)
{
	const int idx = MetricsLabels::jobTypeIndex(jobType);
	workerThreads_[idx] += delta;
	workerThreadsGauge_[idx]->Set(static_cast<double>(workerThreads_[idx].load()));
}

void Metrics::observeWorkerThreadLifetimeSeconds(JobType_t jobType, double seconds)
{
	workerThreadLifetime_[MetricsLabels::jobTypeIndex(jobType)]->Observe(seconds);
}

void Metrics::adjustWorkerInflight(JobType_t jobType, int delta)
{
	const int idx = MetricsLabels::jobTypeIndex(jobType);
	workerInflight_[idx] += delta;
	workerInflightGauge_[idx]->Set(static_cast<double>(workerInflight_[idx].load()));
}

void Metrics::setSchedulerLoopLagSeconds(double seconds)
{
	schedulerLoopLagGauge_->Set(seconds);
}

void Metrics::observeScheduleTickDurationSeconds(double seconds)
{
	scheduleTickDuration_->Observe(seconds);
}

void Metrics::incrementScheduleTimezonesSkipped()
{
	scheduleTimezonesSkipped_->Increment();
}

void Metrics::incrementJobsAutoDisabled()
{
	jobsAutoDisabled_->Increment();
}

void Metrics::incrementSocketExhaustion(const std::string &reason)
{
	socketExhaustionFamily_->Add({{"reason", reason}}).Increment();
}

void Metrics::setUpdateQueueDepth(double depth)
{
	updateQueueDepth_->Set(depth);
}

void Metrics::observeUpdateBatchDurationSeconds(double seconds)
{
	updateBatchDuration_->Observe(seconds);
}

void Metrics::incrementUpdateResults()
{
	updateResults_->Increment();
}

void Metrics::incrementSqliteWriteError(const std::string &operation)
{
	sqliteWriteErrorsFamily_->Add({{"operation", operation}}).Increment();
}

void Metrics::incrementMysqlWriteError(const std::string &operation)
{
	mysqlWriteErrorsFamily_->Add({{"operation", operation}}).Increment();
}

void Metrics::setNotificationQueueDepth(double depth)
{
	notificationQueueDepth_->Set(depth);
}

void Metrics::observeNotificationBatchDurationSeconds(double seconds)
{
	notificationBatchDuration_->Observe(seconds);
}

void Metrics::incrementNotificationsProcessed(const std::string &type)
{
	notificationsProcessedFamily_->Add({{"type", type}}).Increment();
}

void Metrics::incrementEmailsSent(const std::string &type)
{
	emailsSentFamily_->Add({{"type", type}}).Increment();
}

void Metrics::incrementEmailsSuppressed(const std::string &type)
{
	emailsSuppressedFamily_->Add({{"type", type}}).Increment();
}

void Metrics::incrementEmailSendErrors()
{
	emailSendErrors_->Increment();
}

void Metrics::incrementNotificationsDropped(const std::string &reason)
{
	notificationsDroppedFamily_->Add({{"reason", reason}}).Increment();
}

void Metrics::incrementMasterClientRequest(const std::string &method)
{
	masterClientRequestsFamily_->Add({{"method", method}}).Increment();
}

void Metrics::incrementMasterClientError(const std::string &method)
{
	masterClientErrorsFamily_->Add({{"method", method}}).Increment();
}

void Metrics::incrementPhraseSync()
{
	phraseSync_->Increment();
}

void Metrics::incrementPhraseSyncError()
{
	phraseSyncErrors_->Increment();
}

void Metrics::incrementTestrunSubmitted()
{
	testrunSubmitted_->Increment();
}

void Metrics::incrementTestrunCompleted(const std::string &status)
{
	testrunCompletedFamily_->Add({{"status", status}}).Increment();
}

void Metrics::setTestrunActive(double count)
{
	testrunActive_->Set(count);
}

void Metrics::setTestrunQueueDepth(double depth)
{
	testrunQueueDepth_->Set(depth);
}

void Metrics::recordRpcRequest(const std::string &service, const std::string &method,
	const std::string &result, const std::string &exception, double durationSeconds)
{
	rpcRequestsFamily_->Add({
		{"service", service},
		{"method", method},
		{"result", result}
	}).Increment();

	rpcRequestDurationFamily_->Add({
		{"service", service},
		{"method", method}
	}, kRpcDurationBuckets).Observe(durationSeconds);

	if(result == "error" && !exception.empty())
	{
		rpcErrorsFamily_->Add({
			{"service", service},
			{"method", method},
			{"exception", exception}
		}).Increment();
	}
}

}
