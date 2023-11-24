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

#include <iostream>
#include <stdexcept>

#include <string.h>
#include <unistd.h>

using namespace Chronos;

#define MYSQL_MAX_CONNECTION_ATTEMPTS	10
#define MYSQL_CONNECTION_ATTEMPT_DELAY 	500		// ms

MySQL_DB::MySQL_DB(const std::string &strHost, const std::string &strUser, const std::string &strPass,
					const std::string &strDB, const std::string &strSocket)
	: strHost{strHost}, strUser{strUser}, strPass{strPass}, strDB{strDB}, strSocket{strSocket}
{
	if(this->strHost.empty())
		this->strHost = "localhost";
	connect();
}

MySQL_DB::~MySQL_DB()
{
	if(handle != nullptr)
		mysql_close(handle);
}

void MySQL_DB::connect()
{
	if(handle != nullptr)
		mysql_close(handle);

	if((handle = mysql_init(nullptr)) == nullptr)
		throw std::runtime_error("MySQL driver initialization failed");

	int iAttempts = 0;
	bool bEstablished = false;

	while(!bEstablished && iAttempts < MYSQL_MAX_CONNECTION_ATTEMPTS)
	{
		iAttempts++;

		if(mysql_real_connect(handle,
			strHost.c_str(),
			strUser.c_str(),
			strPass.c_str(),
			strDB.c_str(),
			0,
			strSocket.empty() ? nullptr : strSocket.c_str(),
			0) != handle)
		{
			// too many connections?
			if(mysql_errno(handle) == 1203)
			{
				// delay for MYSQL_CONNECTION_ATTEMPT_DELAY ms to allow connection slots to free up
				usleep(MYSQL_CONNECTION_ATTEMPT_DELAY * 1000);
				continue;
			}

			// other error => fail
			else
			{
				break;
			}
		}
		else
		{
			bEstablished = true;
		}
	}

	if(!bEstablished)
		throw std::runtime_error(std::string("MySQL_DB::connect(): ") + std::string(mysql_error(handle)));

	this->query("SET NAMES utf8mb4");

	lastQuery = time(nullptr);
}

void MySQL_DB::libInit()
{
	if(mysql_library_init(0, nullptr, nullptr) != 0)
		throw std::runtime_error("MySQL_DB::LibInit(): mysql_library_init failed");
}

void MySQL_DB::libCleanup()
{
	mysql_library_end();
}

std::unique_ptr<MySQL_Result> MySQL_DB::query(const char *szQuery, ...)
{
	if(handle == nullptr)
		connect();
	else if(lastQuery < time(nullptr)-10)
		mysql_ping(handle);

	char szBuff[255], *szBuff2, *szArg;
	std::unique_ptr<MySQL_Result> res = nullptr;
	std::string strQuery;
	va_list arglist;

	// prepare query
	va_start(arglist, szQuery);
	for(int i=0; i<(int)strlen(szQuery); i++)
	{
		char c = szQuery[i],
			c2 = szQuery[i+1];
		if(c == '%')
		{
			switch(c2)
			{
			case '%':
				strQuery += '%';
				break;
			case 's':
				strQuery.append(va_arg(arglist, char *));
				break;
			case 'd':
				strQuery.append(std::to_string(va_arg(arglist, int)));
				break;
			case 'f':
				strQuery.append(std::to_string(va_arg(arglist, double)));
				break;
			case 'l':
				strQuery.append(std::to_string(va_arg(arglist, long int)));
				break;
			case 'u':
				strQuery.append(std::to_string(va_arg(arglist, unsigned long)));
				break;
			case 'v':
				strQuery.append(std::to_string(va_arg(arglist, long long)));
				break;
			case 'q':
				szArg = va_arg(arglist, char *);
				szBuff2 = new char[strlen(szArg)*2+1];
				mysql_real_escape_string(handle, szBuff2, szArg, (unsigned long)strlen(szArg));
				strQuery.append(szBuff2);
				delete[] szBuff2;
				break;
			};
			++i;
		}
		else
		{
			strQuery += c;
		}
	}
	va_end(arglist);

	// execute query
	lastQuery = time(nullptr);
	int iAttempts = 0;

tryQuery:
	if(mysql_real_query(handle, strQuery.c_str(), (unsigned long)strQuery.length()) == 0)
	{
		MYSQL_RES *result = mysql_store_result(handle);
		if(result != nullptr)
			res = std::unique_ptr<MySQL_Result>(new MySQL_Result(result));
	}
	else
	{
		// handling for timed out connections (mysql server gone away): attempt reconnect
		if(iAttempts == 0 && (mysql_errno(handle) == 2006))
		{
			connect();
			iAttempts++;
			goto tryQuery;
		}
		else if(iAttempts < 10 && mysql_errno(handle) == 1205)
		{
			std::cout << "Retrying query after lock timeout: " << strQuery << std::endl;
			iAttempts++;
			goto tryQuery;
		}
		else
		{
			throw std::runtime_error(std::string(mysql_error(handle)));
		}
	}

	return(res);
}

my_ulonglong MySQL_DB::insertId()
{
	return(mysql_insert_id(handle));
}

my_ulonglong MySQL_DB::affectedRows()
{
	return(mysql_affected_rows(handle));
}
