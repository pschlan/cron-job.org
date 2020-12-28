enum JobStatus
{
    UNKNOWN			    = 0,
    OK				    = 1,
    FAILED_DNS		    = 2,
    FAILED_CONNECT	    = 3,
    FAILED_HTTPERROR	= 4,
    FAILED_TIMEOUT	    = 5,
    FAILED_SIZE		    = 6,
    FAILED_URL		    = 7,
    FAILED_INTERNAL	    = 8,
    FAILED_OTHERS 	    = 9
}

enum RequestMethod
{
    GET                 = 0,
    POST                = 1,
    OPTIONS             = 2,
    HEAD                = 3,
    PUT                 = 4,
    DELETE              = 5,
    TRACE               = 6,
    CONNECT             = 7,
    PATCH               = 8
}

enum JobType
{
    DEFAULT             = 0,
    MONITORING          = 1
}

struct JobIdentifier
{
    1: i64 jobId;
    2: i64 userId;
}

struct JobMetadata
{
    1: bool enabled;
    2: string title;
    3: bool saveResponses;
    4: JobType type;
}

struct JobExecutionInfo
{
    1: JobStatus lastStatus;
    2: i64 lastFetch;
    3: i32 lastDuration;
    4: i32 failCounter;
}

struct JobData
{
    1: string url;
    2: RequestMethod requestMethod;
}

struct JobExtendedData
{
    1: string body;
    2: map<string, string> headers;
}

struct JobSchedule
{
    1: set<i8> hours;
    2: set<i8> mdays;
    3: set<i8> minutes;
    4: set<i8> months;
    5: set<i8> wdays;
    6: string timezone;
}

struct JobAuthentication
{
    1: bool enable;
    2: string user;
    3: string password;
}

struct JobNotification
{
    1: bool onFailure;
    2: bool onSuccess;
    3: bool onDisable;
}

struct Job
{
    1: required JobIdentifier identifier;
    2: optional JobMetadata metaData;
    3: optional JobExecutionInfo executionInfo;
    4: optional JobAuthentication authentication;
    5: optional JobNotification notification;
    6: optional JobSchedule schedule;
    7: optional JobData data;
    8: optional JobExtendedData extendedData;
}

struct NodeStatsEntry
{
    1: i8 d;
    2: i8 m;
    3: i16 y;
    4: i8 h;
    5: i8 i;
    6: i64 jobs;
    7: double jitter;
}

struct JobLogStatsEntry
{
    1: i32 nameLookup;
    2: i32 connect;
    3: i32 appConnect;
    4: i32 preTransfer;
    5: i32 startTransfer;
    6: i32 total;
}

struct JobLogEntry
{
    1: i64 jobLogId;
    2: JobIdentifier jobIdentifier;
    3: i64 date;
    4: i64 datePlanned;
    5: i32 jitter;
    6: string url;
    7: i32 duration;
    8: JobStatus status;
    9: string statusText;
    10: i16 httpStatus;
    11: i16 mday;
    12: i16 month;
    13: optional string headers;
    14: optional string body;
    15: optional JobLogStatsEntry stats;
}

struct UserDetails
{
    1: i64 userId;
    2: string email;
    3: string firstName;
    4: string lastName;
    5: string language;
}

struct Phrases
{
    1: map<string, map<string, string>> phrases;
}

enum NotificationType
{
    FAILURE             = 0,
    SUCCESS             = 1,
    DISABLE             = 2
}

struct NotificationEntry
{
    1: i64 notificationId;
    2: i64 jobLogId;
    3: JobIdentifier jobIdentifier;
    4: i64 date;
    5: NotificationType type;
    6: i64 dateStarted;
    7: i64 datePlanned;
    8: string url;
    9: JobStatus executionStatus;
    10: string executionStatusText;
    11: i16 httpStatus;
}

struct TimeSeriesDataEntry
{
    1: i64 date;
    2: i32 duration;
    3: i32 uptimeCounter;
    4: i32 uptimeDenominator;
}

struct TimeSeriesData
{
    1: list<TimeSeriesDataEntry> last24Hours;
    2: list<TimeSeriesDataEntry> last12Months;
}

exception ResourceNotFound  {}
exception Forbidden         {}
exception InvalidArguments  {}
exception InternalError     {}

service ChronosNode
{
    bool ping();

    list<Job> getJobsForUser(1: i64 userId) throws(1: InternalError ie);
    Job getJobDetails(1: JobIdentifier identifier) throws(1: ResourceNotFound rnf, 2: InternalError ie);

    list<JobLogEntry> getJobLog(1: JobIdentifier identifier, 2: i16 maxEntries) throws(1: InternalError ie, 2: InvalidArguments ia);
    JobLogEntry getJobLogDetails(1: i64 userId, 2: i16 mday, 3: i16 month, 4: i64 jobLogId) throws(1: ResourceNotFound rnf, 2: Forbidden ad, 3: InternalError ie, 4: InvalidArguments ia);

    void createOrUpdateJob(1: Job job) throws(1: ResourceNotFound rnf, 2: Forbidden ad, 3: InternalError ie, 4: InvalidArguments ia);

    list<NotificationEntry> getNotifications(1: i64 userId, 2: i16 maxEntries) throws(1: InternalError ie, 2: InvalidArguments ia);

    TimeSeriesData getTimeSeriesData(1: JobIdentifier identifier, 2: double p) throws(1: ResourceNotFound rnf, 2: InternalError ie);

    void deleteJob(1: JobIdentifier identifier) throws(1: ResourceNotFound rnf, 2: InternalError ie);

    void disableJobsForUser(1: i64 userId) throws(1: InternalError ie);
}

service ChronosMaster
{
    bool ping();

    void reportNodeStats(1: i32 nodeId, 2: NodeStatsEntry stats);
    UserDetails getUserDetails(1: i64 userId) throws(1: ResourceNotFound rnf, 2: InternalError ie);
    Phrases getPhrases() throws(1: InternalError ie);
}
