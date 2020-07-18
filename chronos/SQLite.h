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

#ifndef _SQLITE_H_
#define _SQLITE_H_

#include <memory>
#include <string>
#include <unordered_map>

#include <stdint.h>

struct sqlite3;
struct sqlite3_stmt;

namespace Chronos
{
	class SQLite_DB;

	class SQLite_Statement
	{
	public:
		~SQLite_Statement();

	private:
		SQLite_Statement(sqlite3_stmt *handle);

		SQLite_Statement(const SQLite_Statement &other) = delete;
		SQLite_Statement(SQLite_Statement &&other) = delete;
		SQLite_Statement &operator=(const SQLite_Statement &other) = delete;
		SQLite_Statement &operator=(SQLite_Statement &&other) = delete;

	public:
		void bind(const std::string &field, int val);
		void bind(const std::string &field, const std::string &val);
		bool execute();
		void reset();
		int intValue(const std::string &field);
		int intValue(int fieldNo);
		bool isNull(const std::string &field);
		std::string stringValue(const std::string &field);
		bool hasField(const std::string &field) const;

	private:
		int fieldIndex(const std::string &field);

	private:
		sqlite3_stmt *stmt = nullptr;
		bool columnsFetched = false;
		std::unordered_map<std::string, int> columns;

		friend class SQLite_DB;
	};

	class SQLite_DB
	{
	public:
		SQLite_DB(const std::string &fileName, const bool readOnly = false, const int BusyTimeoutMs = 2500);
		~SQLite_DB();

		SQLite_DB(const SQLite_DB &other) = delete;
		SQLite_DB(SQLite_DB &&other) = delete;
		SQLite_DB &operator=(const SQLite_DB &other) = delete;
		SQLite_DB &operator=(SQLite_DB &&other) = delete;

	public:
		std::unique_ptr<SQLite_Statement> prepare(const std::string &strQuery);
		int64_t insertId();
		int affectedRows();

	private:
		std::string strFileName;
		sqlite3 *handle = nullptr;
	};
};

#endif
