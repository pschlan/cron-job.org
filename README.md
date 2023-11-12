cron-job.org
============

![Build Status](https://github.com/pschlan/cron-job.org/actions/workflows/chronos.yml/badge.svg) ![Build Status](https://github.com/pschlan/cron-job.org/actions/workflows/docs.prod.yml/badge.svg) ![Build Status](https://github.com/pschlan/cron-job.org/actions/workflows/frontend.prod.yml/badge.svg)  ![Build Status](https://github.com/pschlan/cron-job.org/actions/workflows/statuspage.prod.yml/badge.svg)

Structure
---------
* `database` contains the MySQL database structure.
* `chronos` is cron-job.org's cron job execution daemon and is responsible for fetching the jobs.
* `protocol` contains the interface definitions for interaction between system nodes.
* `frontend` contains the web interface
* `statuspage` contains the status page UI
* `api` contains the server API used by web interface and status page UI.

chronos
-------
### Concept
chronos checks the MySQL database every minute to collect all jobs to execute. For every minute, a thread is spawned which processes all the jobs. Actual HTTP fetching is done using the excellent curl multi library with libev as library used to provide the event loop. Together with the c-ares resolver this allows for thousands of parallel HTTP requests.

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
* Copy the `api/` folder to your webserver
* Create a copy of `config/config.inc.default.php` as `lib/config.inc.php` and customize it according to your environment

### Notes
* When changing the thrift protocol, don't forget to re-compile the PHP glue code and copy it to `lib/protocol/`. When committing, include the updated PHP code. Currently, this is a manual step.

Frontend
--------
The frontend is written in JavaScript using React and material-ui. You need `npm` to build it.

### Prerequisites
* Node.js

### Getting started
* Go to the `frontend/` folder
* Install all required dependencies by running `npm install`
* Create a copy of `src/utils/Config.default.js` as `src/utils/Config.js` and customize it according to your environment
* Run the web interface via `npm start`

Status Page Frontend
--------------------
The status page frontend is written in JavaScript using React and material-ui. You need `npm` to build it.

### Prerequisites
* Node.js

### Getting started
* Go to the `statuspage/` folder
* Install all required dependencies by running `npm install`
* Create a copy of `src/utils/Config.default.js` as `src/utils/Config.js` and customize it according to your environment
* Run the web interface via `npm start`

Example Environment (using Docker Compose)
--------------------
To quickly start an example environment of most of the cron-job.org system, you can use `docker-compose`:
* Initialize/update submodules: `git submodule init && git submodule update`
* Copy `.env.example` to `.env` and open it in a text editor
* Change the variables in `.env` as desired. As an absolute minimum, fill the `*_SECRET` variables with randomly generated secrets and specify a SMTP server in `SMTP_SERVER`. No authentication is used for the SMTP session, so ensure that the SMTP server is allowing relaying for your machine's IP address.
* Start via `docker compose up` and wait until all containers are built and all services have been started. This can take a while, especially on first run.
* Open `http://localhost:8010/` in your browser (assuming you kept the default port and host name settings).

*Important:* The Docker environment contained in this repo is intended as an example / development environment and is not tailored for production usage, especially with regard to security.

The following containers will be started:
* `mysql-master` for the master service database which also stores users, groups, job -> node associations etc.
* `mysql-node` for the node service database. Used to store per-executor information like job details with their schedules, etc.
* `redis` used as a cache for certain features like rate limiting.
* `api` for the PHP-based API backend used by the frontend. Uses php-fpm.
* `frontend` which hosts the built frontend code.
* `wwww` as the frontend nginx-powered HTTP server which connects to `frontend` (HTTP reverse proxy) and `api` (FastCGI).
* `chronos` which runs chronos in a combined master and node service mode.

General notes
-------------
* We strongly recommend to build curl using the c-ares resolver. Otherwise every request might spawn its own thread for DNS resolving and your machine will run out of resources *very* soon.
* Before running chronos, ensure that the limit of open files/sockets is not set too low. You might want to run `ulimit -n 65536` or similar first.
* If data integrity is not important for you, we highly recommend to set `innodb_flush_log_at_trx_commit=0` and `innodb_flush_method=O_DIRECT` in your MySQL config for best performance. Otherwise the update thread (which is responsible for storing the job resuls) might lag behind the actual job executions quite soon.
* Parts of the source are quite old and from early stages of the project and might require a refactoring sooner or later.
