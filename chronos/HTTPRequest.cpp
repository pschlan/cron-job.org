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

#include <netinet/in.h>

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

curl_socket_t curlOpenSocketFunction(void *userdata, curlsocktype purpose, struct curl_sockaddr *address)
{
	if(purpose != CURLSOCKTYPE_IPCXN)
	{
		std::cerr << "Invalid socket purpose: " << purpose << std::endl;
		return CURL_SOCKET_BAD;
	}

	if(!static_cast<HTTPRequest *>(userdata)->verifyPeerAddress(address->addrlen, &address->addr))
	{
		return CURL_SOCKET_BAD;
	}

	return ::socket(address->family, address->socktype, address->protocol);
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

	if(headerList != nullptr)
	{
		curl_slist_free_all(headerList);
		headerList = nullptr;
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

bool HTTPRequest::verifyPeerAddress(unsigned int addressLength, const struct sockaddr *address) const
{
	//! @note We don't support IPv6 at the moment.
	if(address->sa_family != AF_INET)
	{
		std::cerr << "Unsupported sa_family: " << address->sa_family << std::endl;
		return false;
	}

	if(addressLength != sizeof(struct sockaddr_in))
	{
		std::cerr << "Invalid AF_INET address length: " << addressLength << std::endl;
		return false;
	}

	const struct sockaddr_in *inAddress = reinterpret_cast<const struct sockaddr_in *>(address);
	return !App::getInstance()->isIpAddressBlocked(inAddress->sin_addr.s_addr);
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

	getRes = curl_easy_getinfo(easy, CURLINFO_PRIMARY_PORT, 		&clientPort);
	if(getRes != CURLE_OK)
		clientPort = 0;
	if(clientPort > 0)
		result->peerPort = clientPort;

	curl_off_t timeNameLookup = 0;
	getRes = curl_easy_getinfo(easy, CURLINFO_NAMELOOKUP_TIME_T, 	&timeNameLookup);
	if (getRes != CURLE_OK)
		timeNameLookup = 0;
	result->timeNameLookup = timeNameLookup;

	curl_off_t timeConnect = 0;
	getRes = curl_easy_getinfo(easy, CURLINFO_CONNECT_TIME_T, 		&timeConnect);
	if (getRes != CURLE_OK)
		timeConnect = 0;
	result->timeConnect = timeConnect;

	curl_off_t timeAppConnect = 0;
	getRes = curl_easy_getinfo(easy, CURLINFO_APPCONNECT_TIME_T, 	&timeAppConnect);
	if (getRes != CURLE_OK)
		timeAppConnect = 0;
	result->timeAppConnect = timeAppConnect;

	curl_off_t timePreTransfer = 0;
	getRes = curl_easy_getinfo(easy, CURLINFO_PRETRANSFER_TIME_T, 	&timePreTransfer);
	if (getRes != CURLE_OK)
		timePreTransfer = 0;
	result->timePreTransfer = timePreTransfer;

	curl_off_t timeStartTransfer = 0;
	getRes = curl_easy_getinfo(easy, CURLINFO_STARTTRANSFER_TIME_T,	&timeStartTransfer);
	if (getRes != CURLE_OK)
		timeStartTransfer = 0;
	result->timeStartTransfer = timeStartTransfer;

	curl_off_t timeTotal = 0;
	getRes = curl_easy_getinfo(easy, CURLINFO_TOTAL_TIME_T,			&timeTotal);
	if (getRes != CURLE_OK)
		timeTotal = 0;
	result->timeTotal = timeTotal;

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

			if((httpCode >= 200) && (httpCode < 300))
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
	curl_easy_setopt(easy, CURLOPT_OPENSOCKETFUNCTION, 	curlOpenSocketFunction);
	curl_easy_setopt(easy, CURLOPT_OPENSOCKETDATA,		this);
	curl_easy_setopt(easy, CURLOPT_TIMEOUT,				App::getInstance()->config->getInt("request_timeout"));
	curl_easy_setopt(easy, CURLOPT_MAXFILESIZE,			maxSize);
	curl_easy_setopt(easy, CURLOPT_USERAGENT,			App::getInstance()->config->get("user_agent").c_str());
	curl_easy_setopt(easy, CURLOPT_SSL_VERIFYPEER,		0);
	curl_easy_setopt(easy, CURLOPT_SSL_VERIFYHOST,		0);
	curl_easy_setopt(easy, CURLOPT_CAINFO,				NULL);
	curl_easy_setopt(easy, CURLOPT_IPRESOLVE,			CURL_IPRESOLVE_V4);

	if(requestMethod == RequestMethod::POST || requestMethod == RequestMethod::PUT || requestMethod == RequestMethod::PATCH || requestMethod == RequestMethod::DELETE)
	{
		curl_easy_setopt(easy, CURLOPT_POSTFIELDSIZE,	requestBody.size());
		curl_easy_setopt(easy, CURLOPT_POSTFIELDS,	requestBody.c_str());
	}

	switch(requestMethod)
	{
	case RequestMethod::GET:
		curl_easy_setopt(easy, CURLOPT_HTTPGET,		1);
		break;

	case RequestMethod::POST:
		curl_easy_setopt(easy, CURLOPT_POST,		1);
		break;

	case RequestMethod::HEAD:
		curl_easy_setopt(easy, CURLOPT_NOBODY,		1);
		break;

	case RequestMethod::OPTIONS:
		curl_easy_setopt(easy, CURLOPT_CUSTOMREQUEST,	"OPTIONS");
		break;

	case RequestMethod::PUT:
		curl_easy_setopt(easy, CURLOPT_POST,		1);
		curl_easy_setopt(easy, CURLOPT_CUSTOMREQUEST, 	"PUT");
		break;

	case RequestMethod::DELETE:
		curl_easy_setopt(easy, CURLOPT_POST,		1);
		curl_easy_setopt(easy, CURLOPT_CUSTOMREQUEST,	"DELETE");
		break;

	case RequestMethod::TRACE:
		curl_easy_setopt(easy, CURLOPT_CUSTOMREQUEST,	"TRACE");
		break;

	case RequestMethod::CONNECT:
		curl_easy_setopt(easy, CURLOPT_CUSTOMREQUEST,	"CONNECT");
		break;

	case RequestMethod::PATCH:
		curl_easy_setopt(easy, CURLOPT_POST,            1);
		curl_easy_setopt(easy, CURLOPT_CUSTOMREQUEST,	"PATCH");
		break;
	}

	if(!requestHeaders.empty())
	{
		for(const auto &header : requestHeaders)
		{
			std::string lowerKey = Utils::toLower(header.first);
			if(lowerKey == "user-agent" || lowerKey == "connection")
				continue;
			std::string head = header.first + ": " + header.second;
			headerList = curl_slist_append(headerList, head.c_str());
		}

		curl_easy_setopt(easy, CURLOPT_HTTPHEADER,	headerList);
	}

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

