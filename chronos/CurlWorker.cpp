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

#include "CurlWorker.h"

#include <iostream>
#include <memory>
#include <stdexcept>

#include <curl/curl.h>
#include <ev.h>

using namespace Chronos;

struct CurlWorker::PrivateData
{
    CURLM *curlHandle = nullptr;
    struct ev_loop *evLoop = nullptr;
    struct ev_timer timerEvent;
};

struct CurlWorker::SockInfo
{
    curl_socket_t sockfd;
    CURL *easy;
    int action;
    long timeout;
    struct ev_io ev;
    int evset;
};

struct CurlWorker::Callbacks
{
    static int curlSocketFunction(CURL *e, curl_socket_t s, int what, void *userdata, void *sockp)
    {
        CurlWorker *worker = static_cast<CurlWorker *>(userdata);
        SockInfo *sockInfo = static_cast<SockInfo *>(sockp);

        if(what == CURL_POLL_REMOVE)
        {
            if(sockInfo->evset)
                ev_io_stop(worker->privateData->evLoop, &sockInfo->ev);
            delete sockInfo;
        }
        else
        {
            if(sockInfo == nullptr)
            {
                std::unique_ptr<SockInfo> newSockInfo = std::make_unique<SockInfo>();
                newSockInfo->evset = 0;
                setSocket(worker, newSockInfo.get(), e, s, what);
                curl_multi_assign(worker->privateData->curlHandle, s, newSockInfo.release());
            }
            else
            {
                setSocket(worker, sockInfo, e, s, what);
            }
        }
        return 0;
    }

    static int curlTimerFunction(CURLM *multi, long timeout_ms, void *userdata)
    {
        CurlWorker *worker = static_cast<CurlWorker *>(userdata);

        if(ev_is_active(&worker->privateData->timerEvent))
        {
            // Short cut for the case were curl asks for lots of timeout_ms = 0 timers
            // when adding the easy handles to the multi handle in a loop. We want to avoid
            // calling ev_timer_stop(), ev_timer_set(), ev_timer_start() for each of those.
            if(timeout_ms == 0)
            {
                ev_tstamp remaining = ev_timer_remaining(worker->privateData->evLoop, &worker->privateData->timerEvent);
                if (remaining < 10e-3)
                {
                    return 0;
                }
            }

            ev_timer_stop(worker->privateData->evLoop, &worker->privateData->timerEvent);
        }

        // Set timer
        if(timeout_ms >= 0)
        {
            double t = static_cast<double>(timeout_ms) / 1000.;
            ev_timer_set(&worker->privateData->timerEvent, t, 0);
            ev_timer_start(worker->privateData->evLoop, &worker->privateData->timerEvent);
        }

        // Stop timer
        else if (timeout_ms == -1)
        {

        }

        return 0;
    }

    static void evTimerFunction(EV_P_ struct ev_timer *w, int revents)
    {
        CurlWorker *worker = static_cast<CurlWorker *>(w->data);

        CURLMcode rc = curl_multi_socket_action(worker->privateData->curlHandle,
            CURL_SOCKET_TIMEOUT, 0, &worker->curlStillRunning);
        if(rc != CURLM_OK)
            throw std::runtime_error("curl_multi_socket_action failed (1)!");

        worker->checkResults();
    }

    static void evEventFunction(EV_P_ struct ev_io *w, int revents)
    {
        CurlWorker *worker = static_cast<CurlWorker *>(w->data);

        int action = (revents & EV_READ) ? CURL_POLL_IN : 0;
        action |= (revents & EV_WRITE) ? CURL_POLL_OUT : 0;

        CURLMcode rc = curl_multi_socket_action(worker->privateData->curlHandle,
            w->fd, action, &worker->curlStillRunning);
        if(rc != CURLM_OK)
            throw std::runtime_error("curl_multi_socket_action failed (2)!");

        worker->checkResults();

        if(worker->curlStillRunning <= 0)
            ev_timer_stop(worker->privateData->evLoop, &worker->privateData->timerEvent);
    }

private:
    static void setSocket(CurlWorker *worker, SockInfo *sockInfo, CURL *e, curl_socket_t s, int what)
    {
        int kind = ((what & CURL_POLL_IN) ? EV_READ : 0) | ((what & CURL_POLL_OUT) ? EV_WRITE : 0);
        sockInfo->sockfd = s;
        sockInfo->action = what;
        sockInfo->easy = e;
        if(sockInfo->evset)
            ev_io_stop(worker->privateData->evLoop, &sockInfo->ev);
        ev_io_init(&sockInfo->ev, evEventFunction, sockInfo->sockfd, kind);
        sockInfo->ev.data = worker;
        sockInfo->evset = 1;
        ev_io_start(worker->privateData->evLoop, &sockInfo->ev);
    }
};

CurlWorker::CurlWorker()
    : privateData{std::make_unique<PrivateData>()}
{
    privateData->evLoop = ev_loop_new(EVFLAG_AUTO);
    if(privateData->evLoop == nullptr)
        throw std::runtime_error("ev_loop_new() failed");

    privateData->curlHandle = curl_multi_init();
    if(privateData->curlHandle == nullptr)
        throw std::runtime_error("curl_multi_init() failed");

    ev_timer_init(&privateData->timerEvent, Callbacks::evTimerFunction, 0, 0);
    privateData->timerEvent.data = this;

    curl_multi_setopt(privateData->curlHandle, CURLMOPT_SOCKETFUNCTION,     Callbacks::curlSocketFunction);
    curl_multi_setopt(privateData->curlHandle, CURLMOPT_SOCKETDATA,         this);
    curl_multi_setopt(privateData->curlHandle, CURLMOPT_TIMERFUNCTION,      Callbacks::curlTimerFunction);
    curl_multi_setopt(privateData->curlHandle, CURLMOPT_TIMERDATA,          this);
}

CurlWorker::~CurlWorker()
{
    if(privateData->curlHandle != nullptr)
    {
        curl_multi_cleanup(privateData->curlHandle);
        privateData->curlHandle = nullptr;
    }

    if(privateData->evLoop != nullptr)
    {
        ev_loop_destroy(privateData->evLoop);
        privateData->evLoop = nullptr;
    }
}

void CurlWorker::run()
{
    ev_loop(privateData->evLoop, 0);
}

void CurlWorker::stop()
{
    ev_break(privateData->evLoop, EVBREAK_ALL);
}

void CurlWorker::checkResults()
{
    CURLMsg *msg;
    int msgsLeft;

    while((msg = curl_multi_info_read(privateData->curlHandle, &msgsLeft)))
    {
        if(msg->msg == CURLMSG_DONE)
        {
            CURL *easy = msg->easy_handle;
            CURLcode res = msg->data.result;

            if(doneHandler)
                doneHandler(easy, res);
        }
    }
}

bool CurlWorker::add(CURL *handle)
{
    CURLMcode res = curl_multi_add_handle(privateData->curlHandle, handle);
    if(res != CURLM_OK)
    {
        std::cerr << "Failed to add handle! " << res << std::endl;
        return false;
    }
    return true;
}

void CurlWorker::remove(CURL *handle)
{
    curl_multi_remove_handle(privateData->curlHandle, handle);
}
