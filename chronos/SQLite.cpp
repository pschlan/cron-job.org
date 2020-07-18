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

#include "SQLite.h"

#include <sstream>
#include <stdexcept>

#include <sqlite3.h>

using namespace Chronos;

SQLite_DB::SQLite_DB(const std::string &fileName, const bool readOnly, const int BusyTimeoutMs) : strFileName(fileName)
{
	int res = sqlite3_open_v2(strFileName.c_str(), &handle,
		readOnly ? SQLITE_OPEN_READONLY : SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, nullptr);
	if(res != SQLITE_OK)
	{
		std::stringstream err;
		err << "Failed to open database " << strFileName
			<< ": " << sqlite3_errstr(res);
		throw std::runtime_error(err.str());
	}

	res = sqlite3_busy_timeout(handle, BusyTimeoutMs);
	if(res != SQLITE_OK)
	{
		std::stringstream err;
		err << "Failed to set busy timeout:"
			<< sqlite3_errstr(res);
		throw std::runtime_error(err.str());
	}
}

SQLite_DB::~SQLite_DB()
{
	if(handle != nullptr)
	{
		sqlite3_close(handle);
		handle = nullptr;
	}
}

std::unique_ptr<SQLite_Statement> SQLite_DB::prepare(const std::string &strQuery)
{
	sqlite3_stmt *stmt = nullptr;
	int res = sqlite3_prepare_v2(handle, strQuery.c_str(), strQuery.size(), &stmt, nullptr);
	if(res != SQLITE_OK)
	{
		std::stringstream err;
		err << "Failed to prepare query " << strQuery
			<< ": " << sqlite3_errstr(res) << ", "
			<< sqlite3_errmsg(handle);
		throw std::runtime_error(err.str());
	}
	return std::unique_ptr<SQLite_Statement>(new SQLite_Statement(stmt));
}

int64_t SQLite_DB::insertId()
{
	return sqlite3_last_insert_rowid(handle);
}

int SQLite_DB::affectedRows()
{
	return sqlite3_changes(handle);
}

SQLite_Statement::SQLite_Statement(sqlite3_stmt *handle) : stmt(handle)
{
}

SQLite_Statement::~SQLite_Statement()
{
	if(stmt != nullptr)
	{
		sqlite3_finalize(stmt);
		stmt = nullptr;
	}
}

void SQLite_Statement::bind(const std::string &field, int val)
{
	int res = sqlite3_bind_int(stmt, fieldIndex(field), val);
	if(res != SQLITE_OK)
	{
		std::stringstream err;
		err << "Failed to bind int value " << field
			<< ": " << sqlite3_errstr(res);
		throw std::runtime_error(err.str());
	}
}

void SQLite_Statement::bind(const std::string &field, const std::string &val)
{
	int res = sqlite3_bind_text(stmt, fieldIndex(field), val.c_str(), val.size(), SQLITE_TRANSIENT);
	if(res != SQLITE_OK)
	{
		std::stringstream err;
		err << "Failed to bind string value " << field
			<< ": " << sqlite3_errstr(res);
		throw std::runtime_error(err.str());
	}
}

int SQLite_Statement::fieldIndex(const std::string &field)
{
	int index = sqlite3_bind_parameter_index(stmt, field.c_str());
	if(index == 0)
	{
		std::stringstream err;
		err << "Field not found: " << field;
		throw std::runtime_error(err.str());
	}
	return index;
}

bool SQLite_Statement::execute()
{
	int res = sqlite3_step(stmt);
	if(res != SQLITE_OK && res != SQLITE_DONE && res != SQLITE_ROW)
	{
		std::stringstream err;
		err << "Failed to execute query: "
			<< sqlite3_errstr(res);
		throw std::runtime_error(err.str());
	}
	if((res == SQLITE_OK || res == SQLITE_ROW) && !columnsFetched)
	{
		columns.clear();
		for(int i = 0; i < sqlite3_column_count(stmt); ++i)
		{
			columns.emplace(std::string(sqlite3_column_name(stmt, i)), i);
		}
		columnsFetched = true;
	}
	return(res == SQLITE_OK || res == SQLITE_ROW);
}

void SQLite_Statement::reset()
{
	columnsFetched = false;
	columns.clear();
	sqlite3_reset(stmt);
}

int SQLite_Statement::intValue(const std::string &field)
{
	auto it = columns.find(field);
	if(it == columns.end())
		throw std::runtime_error("Field not found: " + field);
	return sqlite3_column_int(stmt, it->second);
}

int SQLite_Statement::intValue(int fieldNo)
{
	return sqlite3_column_int(stmt, fieldNo);
}

bool SQLite_Statement::isNull(const std::string &field)
{
	auto it = columns.find(field);
	if(it == columns.end())
		throw std::runtime_error("Field not found: " + field);
	return sqlite3_column_type(stmt, it->second) == SQLITE_NULL;
}

std::string SQLite_Statement::stringValue(const std::string &field)
{
	auto it = columns.find(field);
	if(it == columns.end())
		throw std::runtime_error("Field not found: " + field);
	const unsigned char *columnText = sqlite3_column_text(stmt, it->second);
	if(columnText == nullptr)
		return {};
	return std::string(reinterpret_cast<const char *>(columnText));
}

bool SQLite_Statement::hasField(const std::string &field) const
{
	return(columns.find(field) != columns.end());
}
