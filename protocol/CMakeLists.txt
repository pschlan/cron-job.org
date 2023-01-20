set(NAME chronos-protocol)

find_package(ThriftCompiler REQUIRED)
find_package(LibThrift REQUIRED)
find_package(Boost COMPONENTS headers)

thrift_compile(protocol.thrift cpp protocol-cpp)
thrift_compile(protocol.thrift php:nsglobal=chronos protocol-php)

set(ADDITIONAL_SOURCES)
if(EXISTS ${CMAKE_CURRENT_BINARY_DIR}/protocol-cpp/protocol_constants.cpp)
    set(ADDITIONAL_SOURCES ${CMAKE_CURRENT_BINARY_DIR}/protocol-cpp/protocol_constants.cpp)
endif()

add_library(${NAME} SHARED
    ${CMAKE_CURRENT_BINARY_DIR}/protocol-cpp/ChronosNode.cpp
    ${CMAKE_CURRENT_BINARY_DIR}/protocol-cpp/ChronosMaster.cpp
    ${CMAKE_CURRENT_BINARY_DIR}/protocol-cpp/protocol_types.cpp
    ${ADDITIONAL_SOURCES}
)
target_include_directories(${NAME}
    INTERFACE
        ${CMAKE_CURRENT_BINARY_DIR}/protocol-cpp/
    PUBLIC
        ${LIBTHRIFT_INCLUDE_DIRS}
        ${Boost_INCLUDE_DIRS}
)
target_link_libraries(${NAME}
    PUBLIC
        ${LIBTHRIFT_LDFLAGS}
)

install(TARGETS ${NAME} DESTINATION lib)
