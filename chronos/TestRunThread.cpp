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

#include "TestRunThread.h"

#include <ctime>
#include <iostream>
#include <random>

#include "App.h"
#include "CurlWorker.h"
#include "Utils.h"

using namespace Chronos;

namespace {

struct HandleGenerator
{
    static std::string generate()
    {
        std::string result;
        result.resize(LENGTH);

        {
            std::unique_lock<std::mutex> lock(rngMutex);
            for(std::size_t i = 0; i < LENGTH; ++i)
            {
                result[i] = CHARS[dist(rng)];
            }
        }

        return result;
    }

private:
    static constexpr const std::size_t LENGTH = 64;
    static constexpr const char CHARS[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/._-=?:!()*$";
    static std::mutex rngMutex;
    static std::mt19937 rng;
    static std::uniform_int_distribution<> dist;
};

constexpr const char HandleGenerator::CHARS[];
std::mutex HandleGenerator::rngMutex;
std::mt19937 HandleGenerator::rng{std::random_device{}()};
std::uniform_int_distribution<> HandleGenerator::dist(0, sizeof(HandleGenerator::CHARS)-2);

const int TESTRUN_RESULT_EXPIRY_SECONDS = 60;

}

TestRunThread *TestRunThread::instance = nullptr;

TestRunThread::TestRunThread()
    : curlWorker{std::make_unique<CurlWorker>()}
{
    if(TestRunThread::instance != nullptr)
        throw std::runtime_error("Test run thread instance already exists");

    TestRunThread::instance = this;

    curlWorker->onDone([this] (CURL *easy, CURLcode res) {
        HTTPRequest *req = nullptr;
        if(curl_easy_getinfo(easy, CURLINFO_PRIVATE, &req) != CURLE_OK || req == nullptr)
            throw std::runtime_error("Failed to retrieve associated HTTPRequest!");
        req->done(res);

        processQueue(false);
    });
}

TestRunThread::~TestRunThread()
{
    TestRunThread::instance = nullptr;
}

TestRunThread *TestRunThread::getInstance()
{
    if(TestRunThread::instance == nullptr)
        throw std::runtime_error("No update thread instance available");
    return(TestRunThread::instance);
}

void TestRunThread::stopThread()
{
    stop = true;
    curlWorker->stop();

    std::unique_lock<std::mutex> lock(queueMutex);
    queueSignal.notify_all();
}

void TestRunThread::run()
{
    std::cout << "TestRunThread::run(): Entered" << std::endl;

    stop = false;
    while(!stop)
    {
        processQueue(true);
        if(stop)
            break;
        curlWorker->run();
    }

    std::cout << "TestRunThread::run(): Finished" << std::endl;
}

void TestRunThread::cleanUp()
{
    std::time_t currentTime = std::time(nullptr);

    {
        std::unique_lock<std::mutex> lock(testRunsMutex);

        for(auto it = testRuns.begin(); it != testRuns.end(); )
        {
            if(it->second->expiresAt != 0 && it->second->expiresAt < currentTime)
                it = testRuns.erase(it);
            else
                ++it;
        }
    }
}

void TestRunThread::processQueue(bool wait)
{
    cleanUp();

    decltype(queue) tempQueue;
    {
        std::unique_lock<std::mutex> lock(queueMutex);
        if(wait && queue.empty() && !stop)
            queueSignal.wait(lock);
        if(stop)
            return;
        queue.swap(tempQueue);
    }

    if(!tempQueue.empty())
    {
        while(!tempQueue.empty())
        {
            std::shared_ptr<TestRun> testRun = std::move(tempQueue.front());
            tempQueue.pop();

            if(testRun->removed)
            {
                //! @note Nothing to do here, just ignore the run request.
            }
            else
            {
                testRun->request->verbose = true;
                testRun->request->onVerboseData = [testRunPtr = std::weak_ptr<TestRun>(testRun)] (HTTPRequest::VerboseDataType dt, const std::string &data) {
                    if(auto testRun = testRunPtr.lock())
                    {
                        std::unique_lock<std::mutex> lock(testRun->statusLock);
                        switch(dt)
                        {
                        case HTTPRequest::VerboseDataType::HEADER_IN:
                            testRun->status.state = TestRun::Status::State::SendingHeaders;
                            testRun->status.headersIn.append(data);
                            break;
                        case HTTPRequest::VerboseDataType::HEADER_OUT:
                            testRun->status.state = TestRun::Status::State::ReceivingHeaders;
                            testRun->status.headersOut.append(data);
                            break;
                        case HTTPRequest::VerboseDataType::DATA_IN:
                            testRun->status.state = TestRun::Status::State::SendingData;
                            testRun->status.dataIn.append(data);
                            break;
                        case HTTPRequest::VerboseDataType::DATA_OUT:
                            testRun->status.state = TestRun::Status::State::ReceivingData;
                            testRun->status.dataOut.append(data);
                            break;
                        }
                    }
                };
                testRun->request->onDone = [testRunPtr = std::weak_ptr<TestRun>(testRun), this] () {
                    if(auto testRun = testRunPtr.lock())
                    {
                        std::unique_lock<std::mutex> lock(testRun->statusLock);
                        testRun->status.state               = TestRun::Status::State::Done;
                        testRun->status.result              = testRun->request->result->status;
                        testRun->status.httpStatus          = testRun->request->result->httpStatus;
                        testRun->status.statusText          = testRun->request->result->statusText;
                        testRun->status.peerAddress         = testRun->request->result->peerAddress;
                        testRun->status.peerPort            = testRun->request->result->peerPort;
                        testRun->status.duration            = testRun->request->result->duration;
                        testRun->status.headers             = testRun->request->result->responseHeaders;
                        testRun->status.body                = testRun->request->result->responseBody;
                        testRun->status.timeNameLookup      = testRun->request->result->timeNameLookup;
                        testRun->status.timeConnect         = testRun->request->result->timeConnect;
                        testRun->status.timeAppConnect      = testRun->request->result->timeAppConnect;
                        testRun->status.timePreTransfer     = testRun->request->result->timePreTransfer;
                        testRun->status.timeStartTransfer   = testRun->request->result->timeStartTransfer;
                        testRun->status.timeTotal           = testRun->request->result->timeTotal;
                        testRun->expiresAt                  = std::time(nullptr) + TESTRUN_RESULT_EXPIRY_SECONDS;

                        runningTestRuns.erase(testRun);
                    }
                };
                {
                    std::unique_lock<std::mutex> lock(testRun->statusLock);
                    testRun->status.state = TestRun::Status::State::Connecting;
                }
                runningTestRuns.insert(testRun);
                testRun->request->submit(curlWorker.get());
            }
        }
    }
}

TestRunThread::Handle TestRunThread::submit(std::unique_ptr<HTTPRequest> &&request)
{
    Handle handle = HandleGenerator::generate();

    auto testRun = std::make_shared<TestRun>();
    testRun->status.state = TestRun::Status::State::Initializing;
    testRun->request = std::move(request);

    {
        std::unique_lock<std::mutex> lock(testRunsMutex);
        testRuns.emplace(handle, testRun);
    }

    {
        std::unique_lock<std::mutex> lock(queueMutex);
        queue.push(testRun);
        queueSignal.notify_one();
    }

    return handle;
}

TestRun::Status TestRunThread::getStatus(const Handle &handle)
{
    std::shared_ptr<TestRun> testRun = nullptr;
    {
        std::unique_lock<std::mutex> lock(testRunsMutex);
        auto it = testRuns.find(handle);
        if(it != testRuns.end())
        {
            testRun = it->second;
        }
    }

    if(testRun == nullptr)
    {
        return {};
    }

    std::unique_lock<std::mutex> lock(testRun->statusLock);
    return testRun->status;
}

void TestRunThread::remove(const Handle &handle)
{
    std::unique_lock<std::mutex> lock(testRunsMutex);
    auto it = testRuns.find(handle);
    if(it != testRuns.end())
    {
        it->second->removed = true;
        testRuns.erase(it);
    }
}
