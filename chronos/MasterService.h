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

#ifndef _MASTERSERVICE_H_
#define _MASTERSERVICE_H_

#include <string>
#include <memory>

namespace apache { namespace thrift { namespace server { class TThreadedServer; } } }

namespace Chronos
{
    class MasterService
    {
    public:
        MasterService(const std::string &interface, int port);

    public:
        void run();
        void stop();

    private:
        std::shared_ptr<::apache::thrift::server::TThreadedServer> server;
    };
};

#endif
