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

#include "MySQL.h"

using namespace Chronos;

MySQL_Result::MySQL_Result(MYSQL_RES *res)
{
	result = res;
}

MySQL_Result::~MySQL_Result()
{
	if(result != nullptr)
		mysql_free_result(result);
}

MYSQL_ROW MySQL_Result::fetchRow()
{
	return(mysql_fetch_row(result));
}

my_ulonglong MySQL_Result::numRows()
{
	return(mysql_num_rows(result));
}

my_ulonglong MySQL_Result::numFields()
{
	return(mysql_num_fields(result));
}

MYSQL_FIELD *MySQL_Result::fetchFields()
{
	return(mysql_fetch_fields(result));
}
