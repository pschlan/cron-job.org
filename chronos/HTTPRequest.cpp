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

#include "HTTPRequest.h"

#include <iostream>

#include <errno.h>
#include <string.h>

#include "WorkerThread.h"
#include "JobResult.h"
#include "Utils.h"
#include "App.h"

using namespace Chronos;

namespace {

size_t curlWriteFunction(char *buffer, size_t size, size_t nitems, void *userdata)
{
	size_t realSize = size * nitems;
	std::string data(buffer, realSize);
	if(!static_cast<HTTPRequest *>(userdata)->processData(data))
		return 0;
	return realSize;
}

size_t curlHeaderFunction(char *buffer, size_t size, size_t nitems, void *userdata)
{
	size_t realSize = size * nitems;
	std::string headerData(buffer, realSize);
	static_cast<HTTPRequest *>(userdata)->processHeaders(headerData);
	return realSize;
}

}

HTTPRequest::HTTPRequest()
	: result{std::make_unique<JobResult>()}
{
	maxSize = App::getInstance()->config->getInt("request_max_size");
	memset(curlError, 0, sizeof(curlError));
}

HTTPRequest::~HTTPRequest()
{
	if(easy != nullptr)
	{
		curl_multi_remove_handle(multiHandle, easy);
		curl_easy_cleanup(easy);
		easy = nullptr;
	}
}

void HTTPRequest::processHeaders(const std::string &headers)
{
	if(headers.length() > sizeof("HTTP/1.1 000")
		&& headers.find("HTTP/") == 0
		&& headers.at(8) == ' '
		&& headers.at(12) == ' ')
	{
		result->statusText = headers.substr(13);
		while(!result->statusText.empty()
			&& (result->statusText.back() == '\n'
				|| result->statusText.back() == '\r'))
		{
			result->statusText.pop_back();
		}
		return;
	}

	result->responseHeaders += headers;
}

bool HTTPRequest::processData(const std::string &data)
{
	result->responseBody += data;

	if(result->responseBody.length() > maxSize)
	{
		result->responseBody = {};
		return false;
	}

	return true;
}

void HTTPRequest::done(CURLcode res)
{
	char *clientIP = nullptr;
	int clientPort = 0;
	CURLcode getRes;

	getRes = curl_easy_getinfo(easy, CURLINFO_PRIMARY_IP,		&clientIP);
	if(getRes != CURLE_OK)
		clientIP = nullptr;
	if(clientIP != nullptr)
		result->peerAddress = clientIP;

	getRes = curl_easy_getinfo(easy, CURLINFO_PRIMARY_PORT, 	&clientPort);
	if(getRes != CURLE_OK)
		clientPort = 0;
	if(clientPort > 0)
		result->peerPort = clientPort;

	switch(res)
	{
	case CURLE_URL_MALFORMAT:
		result->status 			= JOBSTATUS_FAILED_URL;
		result->statusText 		= "Malformed URL";
		break;

	case CURLE_UNSUPPORTED_PROTOCOL:
		result->status 			= JOBSTATUS_FAILED_URL;
		result->statusText 		= "Unsupported protocol";
		break;

	case CURLE_COULDNT_CONNECT:
		result->status 			= JOBSTATUS_FAILED_CONNECT;
		result->statusText 		= std::string("Could not connect: ") + curlError;
		break;

	case CURLE_COULDNT_RESOLVE_HOST:
		result->status 			= JOBSTATUS_FAILED_DNS;
		result->statusText 		= std::string("Could not resolve host: ") + curlError;
		break;

	case CURLE_OPERATION_TIMEDOUT:
		result->status 			= JOBSTATUS_FAILED_TIMEOUT;
		break;

	case CURLE_FILESIZE_EXCEEDED:
	case CURLE_WRITE_ERROR:
		result->status 			= JOBSTATUS_FAILED_SIZE;
		break;

	case CURLE_LOGIN_DENIED:
	case CURLE_REMOTE_ACCESS_DENIED:
	case CURLE_OK:
		{
			long httpCode = 0;
			curl_easy_getinfo(easy, CURLINFO_RESPONSE_CODE, &httpCode);

			result->httpStatus = httpCode;

			if(httpCode == 200)
			{
				result->status 	= JOBSTATUS_OK;
			}
			else
			{
				result->status 	= JOBSTATUS_FAILED_HTTPERROR;
			}
		}
		break;

	default:
		result->status 			= JOBSTATUS_FAILED_OTHERS;
		result->statusText 		= std::string("Other error: ") + curlError + std::string(" (") + std::to_string(res) + std::string(")");
		break;
	}

	result->dateDone	= Utils::getTimestampMS();
	result->duration	= result->dateDone - result->dateStarted;

	if(onDone)
		onDone();
}

void HTTPRequest::submit(CURLM *curlMultiHandle)
{
	multiHandle 		= curlMultiHandle;

	result->dateStarted 	= Utils::getTimestampMS();
	result->jitter 			= result->dateStarted - result->datePlanned;

	if(!isValid)
	{
		strcpy(curlError, "Job not valid");
		done(CURLE_OBSOLETE);
		return;
	}

	easy = curl_easy_init();
	if(easy == nullptr)
	{
		std::cout << "Handle creation failed!" << std::endl;
		strcpy(curlError, "Failed to create handle!");
		done(CURLE_OBSOLETE);
		return;
	}

	curl_easy_setopt(easy, CURLOPT_DNS_CACHE_TIMEOUT,	0);
	curl_easy_setopt(easy, CURLOPT_FORBID_REUSE,		1);
	curl_easy_setopt(easy, CURLOPT_FRESH_CONNECT,		1);
	curl_easy_setopt(easy, CURLOPT_PRIVATE,				this);
	curl_easy_setopt(easy, CURLOPT_PROTOCOLS,			CURLPROTO_HTTP | CURLPROTO_HTTPS);
	curl_easy_setopt(easy, CURLOPT_FOLLOWLOCATION, 		0);
	curl_easy_setopt(easy, CURLOPT_URL, 				url.c_str());
	curl_easy_setopt(easy, CURLOPT_NOPROGRESS,			1);
	curl_easy_setopt(easy, CURLOPT_ERRORBUFFER,			curlError);
	curl_easy_setopt(easy, CURLOPT_WRITEFUNCTION,		curlWriteFunction);
	curl_easy_setopt(easy, CURLOPT_WRITEDATA,			this);
	curl_easy_setopt(easy, CURLOPT_HEADERFUNCTION,		curlHeaderFunction);
	curl_easy_setopt(easy, CURLOPT_HEADERDATA,			this);
	curl_easy_setopt(easy, CURLOPT_TIMEOUT,				App::getInstance()->config->getInt("request_timeout"));
	curl_easy_setopt(easy, CURLOPT_MAXFILESIZE,			maxSize);
	curl_easy_setopt(easy, CURLOPT_USERAGENT,			App::getInstance()->config->get("user_agent").c_str());
	curl_easy_setopt(easy, CURLOPT_SSL_VERIFYPEER,		0);
	curl_easy_setopt(easy, CURLOPT_SSL_VERIFYHOST,		0);
	curl_easy_setopt(easy, CURLOPT_IPRESOLVE,			CURL_IPRESOLVE_V4);

	if(useAuth)
	{
		curl_easy_setopt(easy, CURLOPT_HTTPAUTH,		CURLAUTH_BASIC);
		curl_easy_setopt(easy, CURLOPT_USERNAME,		authUsername.c_str());
		curl_easy_setopt(easy, CURLOPT_PASSWORD,		authPassword.c_str());
	}

	CURLMcode res = curl_multi_add_handle(multiHandle, easy);
	if(res != CURLM_OK)
	{
		sprintf(curlError, "Failed to add handle! (%d)", res);
		done(CURLE_OBSOLETE);
		return;
	}
}

HTTPRequest *HTTPRequest::fromURL(const std::string &url, int userID)
{
	HTTPRequest *req = new HTTPRequest();
	req->result->userID = userID;
	req->result->url = url;
	req->url = url;
	req->isValid = true;
	return req;
}

