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

#include "MetricsLabels.h"

namespace Chronos
{
namespace MetricsLabels
{

std::string jobTypeLabel(JobType_t jobType)
{
	switch(jobType)
	{
	case JobType_t::MONITORING: return "monitoring";
	case JobType_t::DEFAULT:
	default:                    return "default";
	}
}

std::string statusLabel(JobStatus_t status)
{
	switch(status)
	{
	case JOBSTATUS_OK:                return "ok";
	case JOBSTATUS_FAILED_DNS:        return "failed_dns";
	case JOBSTATUS_FAILED_CONNECT:    return "failed_connect";
	case JOBSTATUS_FAILED_HTTPERROR:  return "failed_httperror";
	case JOBSTATUS_FAILED_TIMEOUT:    return "failed_timeout";
	case JOBSTATUS_FAILED_SIZE:       return "failed_size";
	case JOBSTATUS_FAILED_URL:        return "failed_url";
	case JOBSTATUS_FAILED_INTERNAL:   return "failed_internal";
	case JOBSTATUS_FAILED_OTHERS:     return "failed_others";
	case JOBSTATUS_UNKNOWN:
	default:                          return "unknown";
	}
}

std::string priorityBin(int8_t executionPriority)
{
	if(executionPriority < 0)
		return "low";
	if(executionPriority > 0)
		return "high";
	return "default";
}

std::string notificationTypeLabel(NotificationType_t type)
{
	switch(type)
	{
	case NOTIFICATION_TYPE_FAILURE:        return "failure";
	case NOTIFICATION_TYPE_SUCCESS:        return "success";
	case NOTIFICATION_TYPE_DISABLE:          return "disable";
	case NOTIFICATION_TYPE_SSL_CERT_EXPIRY:  return "ssl_cert_expiry";
	default:                                 return "unknown";
	}
}

std::string httpStatusClass(int httpStatus)
{
	if(httpStatus >= 200 && httpStatus < 300)
		return "2xx";
	if(httpStatus >= 300 && httpStatus < 400)
		return "3xx";
	if(httpStatus >= 400 && httpStatus < 500)
		return "4xx";
	if(httpStatus >= 500 && httpStatus < 600)
		return "5xx";
	return "unknown";
}

int jobTypeIndex(JobType_t jobType)
{
	return jobType == JobType_t::MONITORING ? 1 : 0;
}

int statusIndex(JobStatus_t status)
{
	switch(status)
	{
	case JOBSTATUS_OK:                return 0;
	case JOBSTATUS_FAILED_DNS:        return 1;
	case JOBSTATUS_FAILED_CONNECT:    return 2;
	case JOBSTATUS_FAILED_HTTPERROR:  return 3;
	case JOBSTATUS_FAILED_TIMEOUT:    return 4;
	case JOBSTATUS_FAILED_SIZE:       return 5;
	case JOBSTATUS_FAILED_URL:        return 6;
	case JOBSTATUS_FAILED_INTERNAL:   return 7;
	case JOBSTATUS_FAILED_OTHERS:     return 8;
	case JOBSTATUS_UNKNOWN:
	default:                          return 9;
	}
}

int priorityIndex(int8_t executionPriority)
{
	if(executionPriority < 0)
		return 0;
	if(executionPriority > 0)
		return 2;
	return 1;
}

}
}
