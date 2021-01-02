cron-job.org
============

[![Build Status](https://travis-ci.org/pschlan/cron-job.org.svg?branch=master)](https://travis-ci.org/pschlan/cron-job.org)

Structure
---------
* `database` contains the MySQL database structure.
* `chronos` is cron-job.org's cron job execution daemon and is responsible for fetching the jobs.
* `protocol` contains the interface definitions for interaction between system nodes.
* `frontend` contains the web interface (console; coming soon)
* `statuspage` contains the status page UI (coming soon)
* `api` contains the server API used by web interface and status page UI.

chronos
-------
### Concept
chronos checks the MySQL database every minute to collect all jobs to execute. For every minute, a thread is spawned which processes all the jobs. Actual HTTP fetching is done using the excellent CURL multi library with libev as library used to provide the event loop. Together with the c-ares resolver this allows for thousands of parallel HTTP requests.

cron-job.org supports storing the job results for the user's convenience. This can quickly lead to I/O bottlenecks when storing the result data in a MySQL database. (Which also has the downside that cleaning up old entries is extremely expensive.) To solve this issue, chronos stores the results in per-user per-day SQLite databases. Cleaning up old entries is as easy as deleting the corresponding day's databases.

The whole software is optimized on performance rather than on data integrity, i.e. when your server crashes or you have a power outage / hardware defect, the job history is most likely lost. Since this is volatile data anyway, it's not considered a big issue.

`chronos` can now run on multiple nodes. Each node requires an own MySQL server/database and stores its own jobs. The host
running the web interface also manages the user database and an association between job and node. The web interface can
create, delete, update and fetch jobs and job logs from the particular node via a Thrift-based protocol defined in the
`protocol` folder.

### Prerequisites
In order to build chronos, you need development files of:
* curl (preferably with c-ares as resolver and libidn2 for IDN support)
* libev
* mysqlclient
* sqlite3
* thrift (compiler and libthrift)

To build, you need a C++14 compiler and cmake.

### Building
1. Create and enter a build folder: `mkdir build && cd build`
2. Run cmake: `cmake -DCMAKE_BUILD_TYPE=Release ..`
3. Build the project: `make`

### Running
1. Ensure you've imported the DB scheme from the `database` folder
2. Customize `chronos.cfg` according to your system (especially add your MySQL login)
3. Execute `./chronos /path/to/chronos.cfg`

API
---
The API is written in PHP and needs to be hosted on a webserver (cron-job.org uses nginx with php-fpm). It is used by the console and the status page UI.

### Prerequisites
* nginx with php-fpm (PHP 7)
* Optionally, a redis instance to support API call rate limiting

### Getting started
* Copy the api/ folder to your webserver
* Create a copy of `config/config.inc.default.php` as `lib/config.inc.php` and customize it according to your environment

### Notes
* When changing the thrift protocol, don't forget to re-compile the PHP glue code and copy it to `lib/protocol/`. When committing, include the updated PHP code. Currently, this is a manual step.

General notes
-------------
* Web interface is still missing in this repository and will be added as soon.
* We strongly recommend to build CURL using the c-ares resolver. Otherwise every request might spawn its own thread for DNS resolving and your machine will run out of resources *very* soon.
* Before running chronos, ensure that the limit of open files/sockets is not set too low. You might want to run `ulimit -n 65536` or similar first.
* If data integrity is not important for you, we highly recommend to set `innodb_flush_log_at_trx_commit=0` and `innodb_flush_method=O_DIRECT` in your MySQL config for best performance. Otherwise the update thread (which is responsible for storing the job resuls) might lag behind the actual job executions quite soon.
* Parts of the source are quite old and from early stages of the project and might require a refactoring sooner or later.
