set(NAME chronos)

set(CMAKE_INSTALL_RPATH "${CMAKE_INSTALL_PREFIX}/lib")

include(FetchContent)
set(ENABLE_PUSH OFF CACHE BOOL "" FORCE)
set(ENABLE_COMPRESSION OFF CACHE BOOL "" FORCE)
set(ENABLE_TESTING OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
	prometheus-cpp
	GIT_REPOSITORY https://github.com/jupp0r/prometheus-cpp.git
	GIT_TAG v1.3.0
)
FetchContent_MakeAvailable(prometheus-cpp)

execute_process(
	COMMAND git rev-parse --short HEAD
	WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
	OUTPUT_VARIABLE CHRONOS_GIT_SHA
	OUTPUT_STRIP_TRAILING_WHITESPACE
	ERROR_QUIET
)
if(NOT CHRONOS_GIT_SHA)
	set(CHRONOS_GIT_SHA "unknown")
endif()

set(SOURCES
	main.cpp
	App.cpp
	Config.cpp
	HTTPRequest.cpp
	MySQL_DB.cpp
	MySQL_Result.cpp
	SQLite.cpp
	UpdateThread.cpp
	Utils.cpp
	WorkerThread.cpp
	NodeService.cpp
	MasterService.cpp
	NotificationThread.cpp
	CurlWorker.cpp
	TestRunThread.cpp
	Metrics.cpp
	MetricsLabels.cpp
	MetricsExposer.cpp
	WorkerMetricsBatch.cpp
	ScheduleMetricsBatch.cpp
	RpcThrow.cpp
	RpcMetricsProcessorEventHandler.cpp
)

set(CCTZ_SOURCES
	cctz/src/civil_time_detail.cc
	cctz/src/time_zone_fixed.cc
	cctz/src/time_zone_format.cc
	cctz/src/time_zone_if.cc
	cctz/src/time_zone_impl.cc
	cctz/src/time_zone_info.cc
	cctz/src/time_zone_libc.cc
	cctz/src/time_zone_lookup.cc
	cctz/src/time_zone_posix.cc
	cctz/src/zone_info_source.cc
)

add_executable(${NAME} ${SOURCES} ${CCTZ_SOURCES})

target_compile_definitions(${NAME} PRIVATE CHRONOS_VERSION="${CHRONOS_GIT_SHA}")

find_package(MySQLClient REQUIRED)
find_package(CURL REQUIRED)
find_package(libev REQUIRED)
find_package(SQLite REQUIRED)
find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)

include_directories(
	cctz/include/
	${MySQLClient_INCLUDE_DIRS}
	${CURL_INCLUDE_DIRS}
	${LIBEV_INCLUDE_DIRS}
	${SQLITE_INCLUDE_DIRS}
	${OPENSSL_INCLUDE_DIR}
)
target_link_libraries(${NAME}
	${MySQLClient_LIBRARIES}
	${CURL_LIBRARIES}
	${LIBEV_LIBRARIES}
	${SQLITE_LIBRARIES}
	${CMAKE_THREAD_LIBS_INIT}
	${OPENSSL_CRYPTO_LIBRARY}
	chronos-protocol
	prometheus-cpp::core
	prometheus-cpp::pull
)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

install(TARGETS ${NAME} DESTINATION bin)
