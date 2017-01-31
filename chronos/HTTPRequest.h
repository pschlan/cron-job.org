/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2017 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#ifndef _HTTPREQUEST_H_
#define _HTTPREQUEST_H_

#include <functional>
#include <memory>
#include <string>

#include <curl/curl.h>

namespace Chronos
{
	class WorkerThread;
	class JobResult;

	class HTTPRequest
	{
	private:
		HTTPRequest(CURLM *curlMultiHandle);

		HTTPRequest(const HTTPRequest &other) = delete;
		HTTPRequest(HTTPRequest &&other) = delete;
		HTTPRequest &operator=(const HTTPRequest &other) = delete;
		HTTPRequest &operator=(HTTPRequest &&other) = delete;

	public:
		~HTTPRequest();

	public:
		static HTTPRequest *fromURL(const std::string &url, int userID, const std::shared_ptr<WorkerThread> &wt);

		void submit();
		void done(CURLcode res);

		bool processData(const std::string &headers);
		void processHeaders(const std::string &headers);

	public:
		std::string url;
		bool useAuth = false;
		std::string authUsername;
		std::string authPassword;
		std::unique_ptr<JobResult> result;

		std::function<void()> onDone;

	private:
		CURL *easy = nullptr;
		CURLM *multiHandle = nullptr;
		bool isValid = false;
		char curlError[CURL_ERROR_SIZE];
		size_t maxSize;
	};
};

#endif
