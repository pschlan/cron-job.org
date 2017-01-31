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

#ifndef _MYSQL_H_
#define _MYSQL_H_

#include <memory>
#include <stdio.h>
#include <string>
#include <stdexcept>
#include <stdarg.h>

#include <mysql.h>

namespace Chronos
{
	class MySQL_DB;

	class MySQL_Result
	{
	private:
		MySQL_Result(MYSQL_RES *res);

		MySQL_Result(const MySQL_Result &other) = delete;
		MySQL_Result(MySQL_Result &&other) = delete;
		MySQL_Result &operator=(const MySQL_Result &other) = delete;
		MySQL_Result &operator=(MySQL_Result &&other) = delete;

	public:
		~MySQL_Result();

	public:
		MYSQL_ROW fetchRow();
		MYSQL_FIELD *fetchFields();
		my_ulonglong numRows();
		my_ulonglong numFields();

	private:
		MYSQL_RES *result = nullptr;

		friend class MySQL_DB;
	};

	class MySQL_DB
	{
	public:
		MySQL_DB(const std::string &strHost,
			const std::string &strUser,
			const std::string &strPass,
			const std::string &strDB,
			const std::string &strSocket = {});
		~MySQL_DB();

	private:
		MySQL_DB(const MySQL_DB &other) = delete;
		MySQL_DB(MySQL_DB &&other) = delete;
		MySQL_DB &operator=(const MySQL_DB &other) = delete;
		MySQL_DB &operator=(MySQL_DB &&other) = delete;

	public:
		std::unique_ptr<MySQL_Result> query(const char *strQuery, ...);
		my_ulonglong insertId();
		my_ulonglong affectedRows();
		static void libInit();
		static void libCleanup();

	private:
		void connect();

	private:
		MYSQL *handle = nullptr;
		std::string strHost, strUser, strPass, strDB, strSocket;
		time_t lastQuery = 0;
	};
};

#endif
