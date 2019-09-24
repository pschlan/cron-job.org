find_program(THRIFT_COMPILER NAMES thrift)

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(thrift DEFAULT_MSG THRIFT_COMPILER)
mark_as_advanced(THRIFT_COMPILER)

macro(thrift_compile FILENAME GENERATOR OUTPUTDIR)
    file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/${OUTPUTDIR})
    execute_process(COMMAND ${THRIFT_COMPILER} --gen ${GENERATOR} -out ${CMAKE_CURRENT_BINARY_DIR}/${OUTPUTDIR} ${CMAKE_CURRENT_SOURCE_DIR}/${FILENAME}
        RESULT_VARIABLE RES)
    if(RES)
        message(FATAL_ERROR "Failed to compile ${FILENAME} with thrift generator ${GENERATOR}")
    endif()
endmacro(thrift_compile)
