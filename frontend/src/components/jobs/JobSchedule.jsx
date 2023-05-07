import React, { useState, useEffect, useRef } from 'react';
import { RadioGroup, FormControlLabel, Radio, Select, MenuItem, makeStyles, FormControl, InputLabel, FormLabel, FormGroup, List, ListItem, ListItemText, TextField, InputAdornment, IconButton, Switch } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { predictNextExecutions, ExecutionDate } from '../../utils/ExecutionPredictor';
import { Alert } from '@material-ui/lab';
import { scheduleToCrontabExpression } from '../../utils/CrontabExpression';
import CopyIcon from '@material-ui/icons/FileCopy';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useSnackbar } from 'notistack';
import useViewport from '../../hooks/useViewport';

const useStyles = makeStyles((theme) => ({
  schedule: {
    '& > *': {
      '& > *': {
        marginRight: theme.spacing(1)
      },
      '& > span': {
        paddingTop: theme.spacing(0.5)
      },
      flexDirection: 'row'
    }
  },
  customSchedule: {
    '& > div': {
      marginRight: theme.spacing(4)
    },
    '& select[multiple]': {
      height: theme.spacing(20),
      minWidth: theme.spacing(12)
    },
    marginLeft: theme.spacing(4)
  },
  root: {
    width: '100%',
    flexDirection: 'row',
    display: 'flex'
  },
  firstColumn: {
    flexBasis: '70%'
  },
  secondColumn: {
    flexBasis: '30%'
  },
  helper: {
    borderLeft: `2px solid ${theme.palette.divider}`,
    paddingLeft: theme.spacing(1)
  },
  helperMobile: {
    borderTop: `2px solid ${theme.palette.divider}`,
    padding: theme.spacing(1),
    paddingTop: theme.spacing(2),
    marginTop: theme.spacing(2)
  },
  alert: {
    margin: theme.spacing(1),
    padding: theme.spacing(0.5, 1)
  },
  crontabExpression: {
    marginTop: theme.spacing(2),
    '& input': {
      fontFamily: '"Roboto Mono", courier',
      textAlign: 'center'
    }
  },
  scheduleExpiry: {
    marginTop: theme.spacing(2)
  },
  scheduleExpiryAt: {
    marginLeft: theme.spacing(6)
  }
}));

function isWildcard(array) {
  return array.length === 1 && array[0] === -1;
}

function parseMinutesSchedule({ hours, minutes, wdays, mdays, months }) {
  if (   (hours.length  === 24  || isWildcard(hours))
      && (wdays.length  === 7   || isWildcard(wdays))
      && (mdays.length  === 31  || isWildcard(mdays))
      && (months.length === 12  || isWildcard(months))) {
    let diffVal = -1;

    if (isWildcard(minutes) || minutes.length === 60) {
      diffVal = 1;
    } else if (minutes.length === 1 && minutes[0] === 0) {
      diffVal = 60;
    } else if (minutes.length > 1) {
      const multiplier = minutes[1] - minutes[0];
      const multiplierValidated =
            minutes.reduce((prev, cur, index) => prev && (index * multiplier) === cur, true)
        &&  minutes.length === Math.floor(60 / multiplier);
      if (multiplierValidated) {
        diffVal = multiplier;
      }
    }

    if (diffVal > 0) {
      return { minuteDiffVal: diffVal };
    }
  }
  return false;
}

function MinutesSchedule({ initialSchedule, onChange = () => null }) {
  const MINUTES = [ 1, 2, 5, 10, 15, 30, 60 ];
  const DEFAULT_MINUTE = 15;

  const { t } = useTranslation();
  const classes = useStyles();

  const onChangeHook = useRef(onChange, []);

  const [ minuteDiffVal, setMinuteDiffVal ] = useState(DEFAULT_MINUTE);

  useEffect(() => {
    if (initialSchedule) {
      const parsedSchedule = parseMinutesSchedule(initialSchedule);
      if (parsedSchedule) {
        setMinuteDiffVal(parsedSchedule.minuteDiffVal);
      }
    }
  }, [initialSchedule]);

  useEffect(() => {
    const minutes = [];
    if (minuteDiffVal === 1) {
      minutes.push(-1);
    } else {
     for (let i = 0; i < 60; i += minuteDiffVal) {
        minutes.push(i);
      }
    }

    onChangeHook.current({
      mdays:    [-1],
      wdays:    [-1],
      months:   [-1],
      hours:    [-1],
      minutes
    });
  }, [minuteDiffVal, onChangeHook]);

  return <span className={classes.schedule}>
    <FormControl>
      <span>{t('jobs.schedule.every')}</span>
      <Select value={minuteDiffVal} onChange={({target}) => setMinuteDiffVal(parseInt(target.value))}>
        {MINUTES.map(minute => <MenuItem value={minute} key={minute}>{minute}</MenuItem>)}
      </Select>
      <span>{t('jobs.schedule.minutesSmall')}</span>
    </FormControl>
  </span>;
}

function parseDayTimeSchedule({ hours, minutes, wdays, mdays, months }) {
  if (   (hours.length   === 1    && !isWildcard(hours))
      && (minutes.length === 1    && !isWildcard(minutes))
      && (wdays.length   === 7    ||  isWildcard(wdays))
      && (mdays.length   === 31   ||  isWildcard(mdays))
      && (months.length  === 12   ||  isWildcard(months))) {
    return {
      hour:   hours[0],
      minute: minutes[0]
    };
  }
  return false;
}

function DayTimeSchedule({ initialSchedule, onChange = () => null }) {
  const DEFAULT_HOUR = 0;
  const DEFAULT_MINUTE = 0;

  const { t } = useTranslation();
  const classes = useStyles();

  const onChangeHook = useRef(onChange, []);

  const [ hour, setHour ] = useState(DEFAULT_HOUR);
  const [ minute, setMinute ] = useState(DEFAULT_MINUTE);

  useEffect(() => {
    if (initialSchedule) {
      const parsedSchedule = parseDayTimeSchedule(initialSchedule);
      if (parsedSchedule) {
        setHour(parsedSchedule.hour);
        setMinute(parsedSchedule.minute);
      }
    }
  }, [initialSchedule]);

  useEffect(() => {
    onChangeHook.current({
      mdays:    [-1],
      wdays:    [-1],
      months:   [-1],
      hours:    [hour],
      minutes:  [minute]
    });
  }, [hour, minute, onChangeHook]);

  return <span className={classes.schedule}>
    <FormControl>
      <span>{t('jobs.schedule.everydayat')}</span>
      <Select value={hour} onChange={({target}) => setHour(parseInt(target.value))}>
        {[...Array(24).keys()].map(h => <MenuItem value={h} key={h}>{h}</MenuItem>)}
      </Select>
    </FormControl>
    <FormControl>
      <span>:</span>
      <Select value={minute} onChange={({target}) => setMinute(parseInt(target.value))}>
        {[...Array(60).keys()].map(m => <MenuItem value={m} key={m}>{('0'+m).slice(-2)}</MenuItem>)}
      </Select>
    </FormControl>
  </span>;
}

function parseMonthTimeSchedule({ hours, minutes, wdays, mdays, months }) {
  if (   (hours.length   === 1    && !isWildcard(hours))
      && (minutes.length === 1    && !isWildcard(minutes))
      && (wdays.length   === 7    ||  isWildcard(wdays))
      && (mdays.length   === 1    && !isWildcard(mdays))
      && (months.length  === 12   ||  isWildcard(months))) {
    return {
      hour:   [...hours].shift(),
      minute: [...minutes].shift(),
      mday:   [...mdays].shift()
    };
  }
  return false;
}

function MonthTimeSchedule({ initialSchedule, onChange = () => null }) {
  const DEFAULT_HOUR = 0;
  const DEFAULT_MINUTE = 0;
  const DEFAULT_MDAY = 1;

  const { t } = useTranslation();
  const classes = useStyles();

  const onChangeHook = useRef(onChange, []);

  const [ hour, setHour ] = useState(DEFAULT_HOUR);
  const [ minute, setMinute ] = useState(DEFAULT_MINUTE);
  const [ mday, setMday ] = useState(DEFAULT_MDAY);

  useEffect(() => {
    if (initialSchedule) {
      const parsedSchedule = parseMonthTimeSchedule(initialSchedule);
      if (parsedSchedule) {
        setHour(parsedSchedule.hour);
        setMinute(parsedSchedule.minute);
        setMday(parsedSchedule.mday);
      }
    }
  }, [initialSchedule]);

  useEffect(() => {
    onChangeHook.current({
      mdays:    [mday],
      wdays:    [-1],
      months:   [-1],
      hours:    [hour],
      minutes:  [minute]
    });
  }, [hour, minute, mday, onChangeHook]);

  return <span className={classes.schedule}>
    <FormControl>
      <span>{t('jobs.schedule.every2')}</span>
      <Select value={mday} onChange={({target}) => setMday(parseInt(target.value))}>
        {[...Array(31).keys()].map(md => <MenuItem value={md+1} key={md}>{md+1}.</MenuItem>)}
      </Select>
    </FormControl>
    <FormControl>
      <span>{t('jobs.schedule.ofthemonthat')}</span>
      <Select value={hour} onChange={({target}) => setHour(parseInt(target.value))}>
        {[...Array(24).keys()].map(h => <MenuItem value={h} key={h}>{h}</MenuItem>)}
      </Select>
    </FormControl>
    <FormControl>
      <span>:</span>
      <Select value={minute} onChange={({target}) => setMinute(parseInt(target.value))}>
        {[...Array(60).keys()].map(m => <MenuItem value={m} key={m}>{('0'+m).slice(-2)}</MenuItem>)}
      </Select>
    </FormControl>
  </span>;
}

function seqArray(from, to) {
  return [...Array(to - from + 1).keys()].map(x => x + from);
}

const DAYS_OF_MONTH = seqArray(1, 31);
const DAYS_OF_WEEK = [...seqArray(1, 6), 0];
const MONTHS = seqArray(1, 12);
const HOURS = seqArray(0, 23);
const MINUTES = seqArray(0, 59);

function parseOnceAYearTimeSchedule({ hours, minutes, wdays, mdays, months }) {
  if (   (hours.length   === 1    && !isWildcard(hours))
      && (minutes.length === 1    && !isWildcard(minutes))
      && (wdays.length   === 7    ||  isWildcard(wdays))
      && (mdays.length   === 1    && !isWildcard(mdays))
      && (months.length  === 1    && !isWildcard(months))) {
    return {
      hour:   [...hours].shift(),
      minute: [...minutes].shift(),
      mday:   [...mdays].shift(),
      month:  [...months].shift()
    };
  }
  return false;
}

function OnceAYearTimeSchedule({ initialSchedule, onChange = () => null }) {
  const DEFAULT_HOUR = 0;
  const DEFAULT_MINUTE = 0;
  const DEFAULT_MDAY = 1;
  const DEFAULT_MONTH = 1;

  const { t } = useTranslation();
  const classes = useStyles();

  const onChangeHook = useRef(onChange, []);

  const [ hour, setHour ] = useState(DEFAULT_HOUR);
  const [ minute, setMinute ] = useState(DEFAULT_MINUTE);
  const [ mday, setMday ] = useState(DEFAULT_MDAY);
  const [ month, setMonth ] = useState(DEFAULT_MONTH);

  useEffect(() => {
    if (initialSchedule) {
      const parsedSchedule = parseOnceAYearTimeSchedule(initialSchedule);
      if (parsedSchedule) {
        setHour(parsedSchedule.hour);
        setMinute(parsedSchedule.minute);
        setMday(parsedSchedule.mday);
        setMonth(parsedSchedule.month);
      }
    }
  }, [initialSchedule]);

  useEffect(() => {
    onChangeHook.current({
      mdays:    [mday],
      wdays:    [-1],
      months:   [month],
      hours:    [hour],
      minutes:  [minute]
    });
  }, [hour, minute, mday, month, onChangeHook]);

  return <span className={classes.schedule}>
    <FormControl>
      <span>{t('jobs.schedule.everyyearon')}</span>
      <Select value={mday} onChange={({target}) => setMday(parseInt(target.value))}>
        {[...Array(31).keys()].map(md => <MenuItem value={md+1} key={md}>{md+1}.</MenuItem>)}
      </Select>
    </FormControl>
    <FormControl>
      <Select value={month} onChange={({target}) => setMonth(parseInt(target.value))}>
        {MONTHS.map(m => <MenuItem value={m} key={m}>{t(`common.months.${m-1}`)}</MenuItem>)}
      </Select>
    </FormControl>
    <FormControl>
      <span>{t('jobs.schedule.at')}</span>
      <Select value={hour} onChange={({target}) => setHour(parseInt(target.value))}>
        {[...Array(24).keys()].map(h => <MenuItem value={h} key={h}>{h}</MenuItem>)}
      </Select>
    </FormControl>
    <FormControl>
      <span>:</span>
      <Select value={minute} onChange={({target}) => setMinute(parseInt(target.value))}>
        {[...Array(60).keys()].map(m => <MenuItem value={m} key={m}>{('0'+m).slice(-2)}</MenuItem>)}
      </Select>
    </FormControl>
  </span>;
}

function CustomSchedule({ initialSchedule, onChange = () => null }) {
  const { t } = useTranslation();
  const classes = useStyles();

  const onChangeHook = useRef(onChange, []);

  const [ daysOfMonth, setDaysOfMonth ] = useState(DAYS_OF_MONTH);
  const [ daysOfWeek, setDaysOfWeek ] = useState(DAYS_OF_WEEK);
  const [ months, setMonths ] = useState(MONTHS);
  const [ hours, setHours ] = useState(HOURS);
  const [ minutes, setMinutes ] = useState(MINUTES);

  useEffect(() => {
    if (initialSchedule) {
      setDaysOfMonth(isWildcard(initialSchedule.mdays) ? DAYS_OF_MONTH : initialSchedule.mdays);
      setDaysOfWeek(isWildcard(initialSchedule.wdays) ? DAYS_OF_WEEK : initialSchedule.wdays);
      setMonths(isWildcard(initialSchedule.months) ? MONTHS : initialSchedule.months);
      setHours(isWildcard(initialSchedule.hours) ? HOURS : initialSchedule.hours);
      setMinutes(isWildcard(initialSchedule.minutes) ? MINUTES : initialSchedule.minutes);
    }
  }, [initialSchedule]);

  useEffect(() => {
    onChangeHook.current({
      mdays:    daysOfMonth.length  === 31  ? [-1] : daysOfMonth.map(x => parseInt(x)),
      wdays:    daysOfWeek.length   === 7   ? [-1] : daysOfWeek.map(x => parseInt(x)),
      months:   months.length       === 12  ? [-1] : months.map(x => parseInt(x)),
      hours:    hours.length        === 24  ? [-1] : hours.map(x => parseInt(x)),
      minutes:  minutes.length      === 60  ? [-1] : minutes.map(x => parseInt(x))
    });
  }, [daysOfMonth, daysOfWeek, months, hours, minutes, onChangeHook]);

  function getSelectOptions({ options }) {
    return [...options].reduce((prev, cur) => cur.selected ? [...prev, cur.value] : prev, []);
  }

  return <div className={classes.customSchedule}>
    <FormControl>
      <InputLabel shrink>{t('jobs.schedule.daysOfMonth')}</InputLabel>
      <Select
        multiple
        native
        onChange={({target}) => setDaysOfMonth(getSelectOptions(target))}
        value={daysOfMonth}>
        {DAYS_OF_MONTH.map(mday => <option key={mday} value={mday}>{mday}</option>)}
      </Select>
    </FormControl>
    <FormControl>
      <InputLabel shrink>{t('jobs.schedule.daysOfWeek')}</InputLabel>
      <Select
        multiple
        native
        onChange={({target}) => setDaysOfWeek(getSelectOptions(target))}
        value={daysOfWeek}>
        {DAYS_OF_WEEK.map(wday => <option key={wday} value={wday}>{t(`common.weekDays.${wday}`)}</option>)}
      </Select>
    </FormControl>
    <FormControl>
      <InputLabel shrink>{t('jobs.schedule.months')}</InputLabel>
      <Select
        multiple
        native
        onChange={({target}) => setMonths(getSelectOptions(target))}
        value={months}>
        {MONTHS.map(month => <option key={month} value={month}>{t(`common.months.${month-1}`)}</option>)}
      </Select>
    </FormControl>
    <FormControl>
      <InputLabel shrink>{t('jobs.schedule.hours')}</InputLabel>
      <Select
        multiple
        native
        onChange={({target}) => setHours(getSelectOptions(target))}
        value={hours}>
        {HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}
      </Select>
    </FormControl>
    <FormControl>
      <InputLabel shrink>{t('jobs.schedule.minutes')}</InputLabel>
      <Select
        multiple
        native
        onChange={({target}) => setMinutes(getSelectOptions(target))}
        value={minutes}>
        {MINUTES.map(minute => <option key={minute} value={minute}>{minute}</option>)}
      </Select>
    </FormControl>
  </div>;
}

const SCHEDULE_TYPES = {
  'minutes': parseMinutesSchedule,
  'dayTime': parseDayTimeSchedule,
  'monthTime': parseMonthTimeSchedule,
  'onceAYearTime': parseOnceAYearTimeSchedule
};

function SchedulePreview({ schedule, scheduleType, expiresAt }) {
  const { t } = useTranslation();
  const classes = useStyles();

  const [ nextExecutions, setNextExecutions ] = useState([]);

  useEffect(() => {
    setNextExecutions(schedule ? predictNextExecutions({ ...schedule, expiresAt }, ExecutionDate.now(), 5) : null);
  }, [schedule, expiresAt]);

  return <>
    {(!nextExecutions || !nextExecutions.length) && scheduleType === 'custom' && <Alert severity="warning" className={classes.alert}>
        {t('jobs.schedule.noExecutionsWarning')}
      </Alert>}
    <List dense>
      {(nextExecutions||[]).map((x, index) => <ListItem key={index}>
          <ListItemText>
            {x.format('LLLL')}
          </ListItemText>
        </ListItem>)}
    </List>
  </>;
}

export default function JobSchedule({ initialSchedule, onChange = () => null }) {
  const classes = useStyles();
  const { t } = useTranslation();
  const [ scheduleType, setScheduleType ] = useState('');
  const [ scheduleArgs, setScheduleArgs ] = useState();
  const [ scheduleDoesExpire, setScheduleDoesExpire ] = useState(false);
  const [ scheduleExpiresAt, setScheduleExpiresAt ] = useState(null);
  const [ expiresAt, setExpiresAt ] = useState(0);
  const [ schedules, setSchedules ] = useState({});
  const [ crontabExpression, setCrontabExpression ] = useState(null);
  const onChangeHook = useRef(onChange, []);
  const { enqueueSnackbar } = useSnackbar();
  const { isMobile } = useViewport();

  useEffect(() => {
    const schedArgs = {
      hours:    Object.values(initialSchedule.hours).map(x => parseInt(x)),
      minutes:  Object.values(initialSchedule.minutes).map(x => parseInt(x)),
      wdays:    Object.values(initialSchedule.wdays).map(x => parseInt(x)),
      mdays:    Object.values(initialSchedule.mdays).map(x => parseInt(x)),
      months:   Object.values(initialSchedule.months).map(x => parseInt(x))
    };

    setScheduleArgs(schedArgs);
    setScheduleType(Object.keys(SCHEDULE_TYPES).reduce((prev, cur) =>
      prev || (SCHEDULE_TYPES[cur](schedArgs) && cur),
      false) || 'custom');

    if (initialSchedule.expiresAt && initialSchedule.expiresAt > 0) {
      setScheduleDoesExpire(true);

      const expiryStr = parseInt(initialSchedule.expiresAt).toString().padStart(14, '0');
      setScheduleExpiresAt({
        mday: parseInt(expiryStr.substring(6, 8)),
        month: parseInt(expiryStr.substring(4, 6)),
        year: parseInt(expiryStr.substring(0, 4)),
        hour: parseInt(expiryStr.substring(8, 10)),
        minute: parseInt(expiryStr.substring(10, 12))
      });

    } else {
      setScheduleDoesExpire(false);

      const date = new Date();
      setScheduleExpiresAt({
        mday: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear() + 1,
        hour: date.getHours(),
        minute: date.getMinutes()
      });
    }
  }, [initialSchedule]);

  useEffect(() => {
    setCrontabExpression(scheduleToCrontabExpression(schedules[scheduleType]));

    onChangeHook.current({
      ...schedules[scheduleType],
      expiresAt
    });
  }, [schedules, scheduleType, expiresAt, onChangeHook]);

  useEffect(() => {
    let newValue = 0;
    if (scheduleDoesExpire) {
      newValue = scheduleExpiresAt.year * 10000000000
        + scheduleExpiresAt.month * 100000000
        + scheduleExpiresAt.mday * 1000000
        + scheduleExpiresAt.hour * 10000
        + scheduleExpiresAt.minute * 100;
    }
    setExpiresAt(newValue);
  }, [scheduleDoesExpire, scheduleExpiresAt]);

  return <>
    <div className={!isMobile && classes.root}>
      <div className={classes.firstColumn}>
        <FormGroup>
          <RadioGroup value={scheduleType} onChange={({target}) => setScheduleType(target.value)}>
            <FormControlLabel
              value='minutes'
              control={<Radio />}
              label={<MinutesSchedule
                initialSchedule={scheduleArgs}
                onChange={minutes => setSchedules(schedules => ({...schedules, minutes}))}
                />}
              />
            <FormControlLabel
              value='dayTime'
              control={<Radio />}
              label={<DayTimeSchedule
                initialSchedule={scheduleArgs}
                onChange={dayTime => setSchedules(schedules => ({...schedules, dayTime}))}
                />}
              />
            <FormControlLabel
              value='monthTime'
              control={<Radio />}
              label={<MonthTimeSchedule
                initialSchedule={scheduleArgs}
                onChange={monthTime => setSchedules(schedules => ({...schedules, monthTime}))}
                />}
              />
            <FormControlLabel
              value='onceAYearTime'
              control={<Radio />}
              label={<OnceAYearTimeSchedule
                initialSchedule={scheduleArgs}
                onChange={onceAYearTime => setSchedules(schedules => ({...schedules, onceAYearTime}))}
                />}
              />
            <FormControlLabel
              value='custom'
              control={<Radio />}
              label={<span><span>{t('jobs.schedule.custom')}</span></span>}
              />
            {scheduleType==='custom' && <CustomSchedule
              initialSchedule={scheduleArgs}
              onChange={custom => setSchedules(schedules => ({...schedules, custom}))}
              />}
          </RadioGroup>
        </FormGroup>
      </div>
      <div className={clsx(classes.secondColumn, isMobile ? classes.helperMobile : classes.helper)}>
        <FormLabel component='legend'>{t('jobs.executionPreview')}</FormLabel>
        <SchedulePreview schedule={schedules[scheduleType]} scheduleType={scheduleType} expiresAt={expiresAt} />
      </div>
    </div>

    <div className={classes.crontabExpression}>
      <TextField
        value={crontabExpression || t('jobs.invalidSchedule')}
        label={t('jobs.crontabExpression')}
        variant='outlined'
        size='small'
        InputProps={{ endAdornment: crontabExpression && <InputAdornment position='end'>
            <CopyToClipboard
              text={crontabExpression}
              onCopy={(text, result) => enqueueSnackbar(t(result ? 'jobs.crontabExpressionCopySuccess' : 'jobs.crontabExpressionCopyFailed'), { variant: result ? 'success' : 'error' })}
              >
              <IconButton size='small'>
                <CopyIcon />
              </IconButton>
            </CopyToClipboard>
          </InputAdornment>
        }}
        fullWidth
        />
    </div>

    <div className={classes.scheduleExpiry}>
      <FormGroup>
        <FormControlLabel
          control={<Switch
            checked={scheduleDoesExpire}
            onChange={({target}) => setScheduleDoesExpire(target.checked)}
            />}
          label={t('jobs.schedule.expires')}
          />
      </FormGroup>
      {scheduleDoesExpire && <div className={clsx(classes.schedule, classes.scheduleExpiryAt)}>
        <FormControl>
          <span>{t('jobs.schedule.expiresAt')}</span>
          <Select value={scheduleExpiresAt.mday} onChange={({target}) => setScheduleExpiresAt(sched => ({ ...sched, mday: parseInt(target.value) }))}>
            {[...Array(31).keys()].map(md => <MenuItem value={md+1} key={md}>{md+1}.</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl>
          <Select value={scheduleExpiresAt.month} onChange={({target}) => setScheduleExpiresAt(sched => ({ ...sched, month: parseInt(target.value) }))}>
            {MONTHS.map(m => <MenuItem value={m} key={m}>{t(`common.months.${m-1}`)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl>
          <Select value={scheduleExpiresAt.year} onChange={({target}) => setScheduleExpiresAt(sched => ({ ...sched, year: parseInt(target.value) }))}>
            {[...Array(11).keys()].map(offset => (new Date().getFullYear()) + offset).map(y => <MenuItem value={y} key={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl>
          <span>{t('jobs.schedule.at')}</span>
          <Select value={scheduleExpiresAt.hour} onChange={({target}) => setScheduleExpiresAt(sched => ({ ...sched, hour: parseInt(target.value) } ))}>
            {[...Array(24).keys()].map(h => <MenuItem value={h} key={h}>{h}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl>
          <span>:</span>
          <Select value={scheduleExpiresAt.minute} onChange={({target}) => setScheduleExpiresAt(sched => ({ ...sched, minute: parseInt(target.value) } ))}>
            {[...Array(60).keys()].map(m => <MenuItem value={m} key={m}>{('0'+m).slice(-2)}</MenuItem>)}
          </Select>
        </FormControl>
      </div>}
    </div>
  </>;
}
