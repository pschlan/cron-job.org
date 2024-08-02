Creating cron jobs
==================

Cron job variables
------------------
In the URL, header values and request body of your cron jobs, you can use special variables. Those special
variables will be replaced with a corresponding value each time cron-job.org executes your job.

Supported variables
^^^^^^^^^^^^^^^^^^^
The following variables are supported by cron-job.org:

================    ========================================================== ===============
Variable            Description                                                Example
================    ========================================================== ===============
%cjo:unixtime%      Current unix timestamp                                     ``1722623610``
%cjo:uuid4%         A UUID v4 unique identifier (not for cryptographic usage)  ``bd901c8b-11ea-431c-9311-90348e9b3a7f``
================    ========================================================== ===============

Using a variable multiple times will cause the corresponding value to be re-generated for each occurence of
the variable. For example, using the ``%cjo:uuid4%`` variable twice will produce two different UUIDs.
