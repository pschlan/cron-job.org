find_path(libmodsecurity_INCLUDE_DIRS modsecurity/modsecurity.h)

find_library(libmodsecurity_LIBRARIES NAMES libmodsecurity modsecurity)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(libmodsecurity DEFAULT_MSG libmodsecurity_LIBRARIES libmodsecurity_INCLUDE_DIRS)
mark_as_advanced(libmodsecurity_INCLUDE_DIRS libmodsecurity_LIBRARIES)
