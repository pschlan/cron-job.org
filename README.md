cron-job.org
============

Structure
---------
* `database` contains the MySQL database structure.
* `chronos` is cron-job.org's cron job execution daemon and is responsible for fetching the jobs.
* `web` contains the web interface (coming soon)

chronos
-------
### Concept
chronos checks the MySQL database every minute to collect all jobs to execute. For every minute, a thread is spawned which processes all the jobs. Actual HTTP fetching is done using the excellent CURL multi library with libev as library used to provide the event loop. Together with the c-ares resovler this allows for thousands of parallel HTTP requests.

cron-job.org supports storing the job results for the user's convenience. This can quickly lead to I/O bottleneck when storing the result data in a MySQL database. (Which also has the downside that cleaning up old entries is extremely expensive.) To solve this issue, chronos stores the results in per-user per-day SQLite databases. Cleaning up old entries is as easy as deleting the corresponding day's databases.

The whole software is optimized on performance rather than on data integrity, i.e. when your server crashes or you have a power outage / hardware defect, the job history is most likely lost. Since this is volatile data anyway, it's not considered a big issue.

### Prerequisites
In order to build chronos, you need development files of:
* curl (preferably with c-ares as resolver)
* libev
* mysqlclient
* sqlite3

To build, you need a C++14 compiler and cmake.

### Building
1. Create and enter a build folder: `mkdir build && cd build`
2. Run cmake: `cmake -DCMAKE_BUILD_TYPE=Release ..`
3. Build the project: `make`

### Running
1. Ensure you've imported the DB scheme from the `database` folder
2. Customize `chronos.cfg` according to your system (especially add your MySQL login)
3. Execute `./chronos /path/to/chronos.cfg`

General notes
-------------
* Web interface and jitter correction algorithm are still missing in this repository and will be added as soon as they've been refactored to a presentable state.
* We strongly recommend to build CURL using the c-ares resolver. Otherwise every request might spawn its own thread for DNS resolving and your machine will run out of resources *very* soon.
* Before running chronos, ensure that the limit of open files/sockets is not set too low. You might want to run `ulimit -n 65536` or similar first.
* If data integrity is not important for you, we highly recommend to set `innodb_flush_log_at_trx_commit=0` and `innodb_flush_method=O_DIRECT` in your MySQL config for best performance. Otherwise the update thread (which is responsible for storing the job resuls) might lag behind the actual job executions quite soon.
* Parts of the source are quite old and from early stages of the project and might require a refactoring sooner or later.
