/*
 * chronos, the cron-job.org execution daemon
 * Copyright (C) 2017-2019 Patrick Schlangen <patrick@schlangen.me>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 */

#include "MasterService.h"

#include <iostream>

#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/server/TThreadedServer.h>
#include <thrift/transport/TServerSocket.h>
#include <thrift/transport/TBufferTransports.h>

#include "ChronosMaster.h"
#include "App.h"
#include "Utils.h"

using namespace ::apache::thrift;
using namespace ::apache::thrift::protocol;
using namespace ::apache::thrift::transport;
using namespace ::apache::thrift::server;

namespace {

class ChronosMasterHandler : virtual public ChronosMasterIf
{
public:
    ChronosMasterHandler()
    {
    }

    bool ping() override
    {
        std::cout << "ChronosMasterHandler::ping()" << std::endl;
        return true;
    }

    void reportNodeStats(const int32_t nodeId, const NodeStatsEntry &stats) override
    {
        using namespace Chronos;

        std::cout << "ChronosMasterHandler::reportNodeStats(" << nodeId << ")" << std::endl;

        try
        {
            std::unique_ptr<MySQL_DB> db(App::getInstance()->createMasterMySQLConnection());

            db->query("INSERT INTO `nodestats`(`nodeid`,`d`,`m`,`y`,`h`,`i`,`jobs`,`jitter`) VALUES(%v,%d,%d,%d,%d,%d,%v,%f) "
                "ON DUPLICATE KEY UPDATE `jobs`=`jobs`+%v,`jitter`=(`jobs`*`jitter`+%f)/(`jobs`+%v)",
                nodeId,
                stats.d, stats.m, stats.y, stats.h, stats.i,
                stats.jobs, stats.jitter,
                stats.jobs,
                stats.jobs * stats.jitter,
                stats.jobs);
        }
        catch(const std::exception &ex)
        {
            std::cout << "ChronosMasterHandler::reportNodeStats(): Exception: "  << ex.what() << std::endl;
            throw InternalError();
        }
    }

    void getUserDetails(UserDetails &_return, const int64_t userId) override
    {
        using namespace Chronos;

        std::cout << "ChronosMasterHandler::getUserDetails(" << userId << ")" << std::endl;

        try
        {
            std::unique_ptr<MySQL_DB> db(App::getInstance()->createMasterMySQLConnection());

	        MYSQL_ROW row;
            auto res = db->query("SELECT `userid`,`email`,`firstname`,`lastname`,`lastlogin_lang` "
                    "FROM `user` WHERE `userid`=%v",
                userId);
            if(res->numRows() == 0)
                throw ResourceNotFound();
            while((row = res->fetchRow()))
            {
                _return.userId      = std::stoll(row[0]);
                _return.email       = row[1];
                _return.firstName   = row[2];
                _return.lastName    = row[3];
                _return.language    = row[4];
            }
        }
        catch(const std::exception &ex)
        {
            std::cout << "ChronosMasterHandler::getUserDetails(): Exception: "  << ex.what() << std::endl;
            throw InternalError();
        }
    }

    void getPhrases(Phrases &_return) override
    {
        using namespace Chronos;

        std::cout << "ChronosMasterHandler::getPhrases()" << std::endl;

        try
        {
            std::unique_ptr<MySQL_DB> db(App::getInstance()->createMasterMySQLConnection());

	        MYSQL_ROW row;
            auto res = db->query("SELECT `lang`,`key`,`value` FROM `phrases`");
            while((row = res->fetchRow()))
            {
                _return.phrases[row[0]][row[1]] = row[2];
            }
        }
        catch(const std::exception &ex)
        {
            std::cout << "ChronosMasterHandler::getPhrases(): Exception: "  << ex.what() << std::endl;
            throw InternalError();
        }
    }
};

}

namespace Chronos {

MasterService::MasterService(const std::string &interface, int port)
    : server(std::make_shared<TThreadedServer>(
        std::make_shared<ChronosMasterProcessor>(std::make_shared<ChronosMasterHandler>()),
        std::make_shared<TServerSocket>(interface, port),
        std::make_shared<TBufferedTransportFactory>(),
        std::make_shared<TBinaryProtocolFactory>()
    ))
{
}

void MasterService::run()
{
    server->serve();
}

void MasterService::stop()
{
    server->stop();
}

} // Chronos