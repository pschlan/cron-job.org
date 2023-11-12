/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2021 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#ifndef _TESTRUNTHREAD_H_
#define _TESTRUNTHREAD_H_

#include "HTTPRequest.h"
#include "JobResult.h"

#include <condition_variable>
#include <ctime>
#include <memory>
#include <mutex>
#include <queue>
#include <thread>
#include <string>
#include <unordered_set>
#include <unordered_map>
#include <atomic>

namespace Chronos
{
    class CurlWorker;
    class HTTPRequest;

    struct TestRun
    {
        struct Status
        {
            enum class State
            {
                Invalid,
                Initializing,
                Connecting,
                SendingHeaders,
                SendingData,
                ReceivingHeaders,
                ReceivingData,
                Done
            };

            State state = State::Invalid;

            JobStatus_t result = JobStatus_t::JOBSTATUS_UNKNOWN;
            int httpStatus = 0;
            std::string statusText;
            std::string peerAddress;
            int peerPort = 0;
            int duration = 0;            // in ms
            int timeNameLookup = 0;      // in us
            int timeConnect = 0;         // in us
            int timeAppConnect = 0;      // in us
            int timePreTransfer = 0;     // in us
            int timeStartTransfer = 0;   // in us
            int timeTotal = 0;           // in us

            std::string headers;
            std::string body;

            std::string headersIn;
            std::string headersOut;
            std::string dataIn;
            std::string dataOut;

            operator bool() const
            {
                return state != State::Invalid;
            }
        };

        bool removed = false;
        std::unique_ptr<HTTPRequest> request;

        std::mutex statusLock;
        Status status;

        std::time_t expiresAt = 0;
    };

    class TestRunThread
    {
    public:
        using Handle = std::string;

        TestRunThread();
        ~TestRunThread();

    private:
        TestRunThread(const TestRunThread &other) = delete;
        TestRunThread(TestRunThread &&other) = delete;
        TestRunThread &operator=(const TestRunThread &other) = delete;
        TestRunThread &operator=(TestRunThread &&other) = delete;

    public:
        static TestRunThread *getInstance();
        void run();
        void stopThread();

        Handle submit(std::unique_ptr<HTTPRequest> &&request);
        TestRun::Status getStatus(const Handle &handle);
        void remove(const Handle &handle);

    private:
        void processQueue(bool wait);
        void cleanUp();

    private:
        std::atomic<bool> stop{false};
        static TestRunThread *instance;
        std::unique_ptr<CurlWorker> curlWorker;
        std::mutex queueMutex;
        std::condition_variable queueSignal;
        std::queue<std::shared_ptr<TestRun>> queue;

        std::mutex testRunsMutex;
        std::unordered_map<Handle, std::shared_ptr<TestRun>> testRuns;

        std::unordered_set<std::shared_ptr<TestRun>> runningTestRuns;
    };
};

#endif
