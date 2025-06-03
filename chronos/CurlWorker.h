/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2021-2025 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#ifndef _CURLWORKER_H_
#define _CURLWORKER_H_

#include <memory>
#include <functional>
#include <vector>

#include <curl/curl.h>

namespace Chronos
{
  class CurlWorker;

  class AsyncWatcher
  {
    struct PrivateData;
    std::unique_ptr<PrivateData> privateData;

    AsyncWatcher(CurlWorker *w, const std::function<void()> &callback);

    AsyncWatcher(const AsyncWatcher &) = delete;
    AsyncWatcher(AsyncWatcher &&) = delete;

    AsyncWatcher &operator=(const AsyncWatcher &) = delete;
    AsyncWatcher &operator=(AsyncWatcher &&) = delete;

  public:
    ~AsyncWatcher();

    void fire();

  private:
    std::function<void()> callback;

    friend class CurlWorker;
  };

  class CurlWorker
  {
    struct Callbacks;
    struct SockInfo;
    struct PrivateData;

  public:
    using DoneHandler = std::function<void(CURL *, CURLcode)>;

  public:
    CurlWorker();
    ~CurlWorker();

  private:
    CurlWorker(const CurlWorker &other) = delete;
    CurlWorker(CurlWorker &&other) = delete;
    CurlWorker &operator=(const CurlWorker &other) = delete;
    CurlWorker &operator=(CurlWorker &&other) = delete;

  public:
    void run();
    void stop();

    void onDone(const DoneHandler &handler)
    {
      this->doneHandler = handler;
    }

    bool add(CURL *handle);
    void remove(CURL *handle);

    int runningHandleCount() const
    {
      return curlStillRunning;
    }

    std::shared_ptr<AsyncWatcher> addAsyncWatcher(const std::function<void()> &handler);

  private:
    void checkResults();

  private:
    std::unique_ptr<PrivateData> privateData;
    int curlStillRunning = 0;
    DoneHandler doneHandler;
    std::vector<std::shared_ptr<AsyncWatcher>> asyncWatchers;

    friend class AsyncWatcher;
  };
};

#endif
