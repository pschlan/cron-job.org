import moment from 'moment';

export function formatIncidentStartDate(unix, t) {
  const m = moment.unix(unix);
  const day = m.clone().startOf('day');
  const today = moment().startOf('day');
  const diffDays = day.diff(today, 'days');

  if (diffDays === 0) {
    return t('incidents.startedToday', { time: m.format('LT') });
  }

  if (diffDays === -1) {
    return t('incidents.startedYesterday', { time: m.format('LT') });
  }

  if (diffDays >= -6 && diffDays <= 6 && diffDays !== 0) {
    return t('incidents.startedWeekday', {
      weekday: m.format('dddd'),
      time: m.format('LT')
    });
  }

  return t('incidents.startedOn', { date: m.format('LLL') });
}
