
import React from 'react';
import { JobStatus } from '../../utils/Constants';
import ErrorIcon from '@material-ui/icons/ErrorOutline';
import JobDisabledIcon  from '@material-ui/icons/AlarmOff';
import JobEnabledIcon from '@material-ui/icons/Alarm';
import IconAvatar from '../misc/IconAvatar';

export default function JobIcon({ status, enabled, nextExecution = null }) {
  const iconProps = status > JobStatus.OK ?
    { color: 'orange', icon: ErrorIcon } : (enabled ?
    { color: nextExecution ? 'green' : 'orange', icon: JobEnabledIcon } :
    { color: 'default', icon: JobDisabledIcon });
  return <IconAvatar {...iconProps} />;
}
