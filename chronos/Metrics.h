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

#ifndef _METRICS_H_
#define _METRICS_H_

#include <atomic>
#include <memory>
#include <string>

#include <prometheus/registry.h>

#include "JobResult.h"
#include "ScheduleMetricsBatch.h"
#include "WorkerMetricsBatch.h"

namespace Chronos
{
	class Metrics
	{
	public:
		static Metrics &instance();
		static void init(const std::string &mode, int nodeId);
		static void shutdown();

		std::shared_ptr<prometheus::Registry> registry() const { return registry_; }

		void mergeWorkerBatch(const WorkerMetricsBatch &batch);
		void mergeScheduleBatch(const ScheduleMetricsBatch &batch);

		void incrementWorkerThreadsStarted(JobType_t jobType);
		void adjustWorkerInflight(JobType_t jobType, int delta);

		void setSchedulerLoopLagSeconds(double seconds);
		void observeScheduleTickDurationSeconds(double seconds);

		void incrementScheduleTimezonesSkipped();
		void incrementJobsAutoDisabled();
		void incrementSocketExhaustion(const std::string &reason);

		void setUpdateQueueDepth(double depth);
		void observeUpdateBatchDurationSeconds(double seconds);
		void incrementUpdateResults();
		void incrementSqliteWriteError(const std::string &operation);
		void incrementMysqlWriteError(const std::string &operation);

		void setNotificationQueueDepth(double depth);
		void observeNotificationBatchDurationSeconds(double seconds);
		void incrementNotificationsProcessed(const std::string &type);
		void incrementEmailsSent(const std::string &type);
		void incrementEmailsSuppressed(const std::string &type);
		void incrementEmailSendErrors();
		void incrementNotificationsDropped(const std::string &reason);

		void incrementMasterClientRequest(const std::string &method);
		void incrementMasterClientError(const std::string &method);
		void incrementPhraseSync();
		void incrementPhraseSyncError();

		void incrementTestrunSubmitted();
		void incrementTestrunCompleted(const std::string &status);
		void setTestrunActive(double count);
		void setTestrunQueueDepth(double depth);

		void recordRpcRequest(const std::string &service, const std::string &method,
			const std::string &result, const std::string &exception, double durationSeconds);

	private:
		Metrics(const std::string &mode, int nodeId);
		~Metrics() = default;

		Metrics(const Metrics &) = delete;
		Metrics &operator=(const Metrics &) = delete;

		static Metrics *instance_;

		std::shared_ptr<prometheus::Registry> registry_;

		prometheus::Family<prometheus::Counter> *jobsExecutedFamily_ = nullptr;
		prometheus::Counter *jobsExecuted_[WorkerMetricsBatch::NUM_JOB_TYPES][WorkerMetricsBatch::NUM_STATUSES] = {};

		prometheus::Family<prometheus::Histogram> *jobDurationFamily_ = nullptr;
		prometheus::Histogram *jobDuration_[WorkerMetricsBatch::NUM_JOB_TYPES] = {};

		prometheus::Family<prometheus::Histogram> *workerJitterFamily_ = nullptr;
		prometheus::Histogram *workerJitter_[WorkerMetricsBatch::NUM_JOB_TYPES] = {};

		prometheus::Family<prometheus::Counter> *scheduleJobsSelectedFamily_ = nullptr;
		prometheus::Counter *scheduleJobsSelected_[ScheduleMetricsBatch::NUM_JOB_TYPES][ScheduleMetricsBatch::NUM_PRIORITIES] = {};

		prometheus::Family<prometheus::Counter> *workerThreadsStartedFamily_ = nullptr;
		prometheus::Counter *workerThreadsStarted_[WorkerMetricsBatch::NUM_JOB_TYPES] = {};

		std::atomic<int> workerInflight_[WorkerMetricsBatch::NUM_JOB_TYPES];
		prometheus::Family<prometheus::Gauge> *workerInflightFamily_ = nullptr;
		prometheus::Gauge *workerInflightGauge_[WorkerMetricsBatch::NUM_JOB_TYPES] = {};

		prometheus::Gauge *schedulerLoopLagGauge_ = nullptr;
		prometheus::Family<prometheus::Histogram> *scheduleTickDurationFamily_ = nullptr;
		prometheus::Histogram *scheduleTickDuration_ = nullptr;
		prometheus::Counter *scheduleTimezonesSkipped_ = nullptr;
		prometheus::Counter *jobsAutoDisabled_ = nullptr;
		prometheus::Family<prometheus::Counter> *socketExhaustionFamily_ = nullptr;

		prometheus::Gauge *updateQueueDepth_ = nullptr;
		prometheus::Family<prometheus::Histogram> *updateBatchDurationFamily_ = nullptr;
		prometheus::Histogram *updateBatchDuration_ = nullptr;
		prometheus::Counter *updateResults_ = nullptr;
		prometheus::Family<prometheus::Counter> *sqliteWriteErrorsFamily_ = nullptr;
		prometheus::Family<prometheus::Counter> *mysqlWriteErrorsFamily_ = nullptr;

		prometheus::Gauge *notificationQueueDepth_ = nullptr;
		prometheus::Family<prometheus::Histogram> *notificationBatchDurationFamily_ = nullptr;
		prometheus::Histogram *notificationBatchDuration_ = nullptr;
		prometheus::Family<prometheus::Counter> *notificationsProcessedFamily_ = nullptr;
		prometheus::Family<prometheus::Counter> *emailsSentFamily_ = nullptr;
		prometheus::Family<prometheus::Counter> *emailsSuppressedFamily_ = nullptr;
		prometheus::Counter *emailSendErrors_ = nullptr;
		prometheus::Family<prometheus::Counter> *notificationsDroppedFamily_ = nullptr;

		prometheus::Family<prometheus::Counter> *masterClientRequestsFamily_ = nullptr;
		prometheus::Family<prometheus::Counter> *masterClientErrorsFamily_ = nullptr;
		prometheus::Counter *phraseSync_ = nullptr;
		prometheus::Counter *phraseSyncErrors_ = nullptr;

		prometheus::Counter *testrunSubmitted_ = nullptr;
		prometheus::Family<prometheus::Counter> *testrunCompletedFamily_ = nullptr;
		prometheus::Gauge *testrunActive_ = nullptr;
		prometheus::Gauge *testrunQueueDepth_ = nullptr;

		prometheus::Family<prometheus::Counter> *rpcRequestsFamily_ = nullptr;
		prometheus::Family<prometheus::Histogram> *rpcRequestDurationFamily_ = nullptr;
		prometheus::Family<prometheus::Counter> *rpcErrorsFamily_ = nullptr;
	};
}

#endif
