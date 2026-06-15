import React from 'react';
import { Accordion, AccordionDetails, AccordionSummary, makeStyles, Paper, Typography } from '@material-ui/core';
import WarningIcon from '@material-ui/icons/WarningRounded';
import HistoryIcon from '@material-ui/icons/History';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { useTranslation } from 'react-i18next';
import { formatIncidentStartDate } from '../utils/formatIncidentStartDate';

const useStyles = makeStyles(theme => ({
  section: {
    marginBottom: theme.spacing(3)
  },
  pastSection: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(3)
  },
  sectionTitle: {
    marginBottom: theme.spacing(1.5),
    display: 'flex',
    alignItems: 'center',
    columnGap: theme.spacing(1)
  },
  activeIncident: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderLeft: `4px solid ${theme.palette.secondary.main}`
  },
  pastPanel: {
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(255, 255, 255, 0.04)'
      : theme.palette.grey[50],
    border: `1px solid ${theme.palette.divider}`,
    overflow: 'hidden'
  },
  pastIncident: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    '&:before': {
      display: 'none'
    },
    '&:not(:last-child)': {
      borderBottom: `1px solid ${theme.palette.divider}`
    }
  },
  pastIncidentSummary: {
    minHeight: 'unset !important',
    padding: theme.spacing(0.5, 1.5),
    '&.Mui-expanded': {
      minHeight: 'unset !important'
    },
    '& .MuiAccordionSummary-content': {
      margin: theme.spacing(0.25, 0),
      '&.Mui-expanded': {
        margin: theme.spacing(0.25, 0)
      }
    },
    '& .MuiAccordionSummary-expandIcon': {
      padding: theme.spacing(0.5)
    }
  },
  hiddenExpandIcon: {
    visibility: 'hidden'
  },
  pastIncidentHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    width: '100%',
    columnGap: theme.spacing(1),
    paddingRight: theme.spacing(0.5)
  },
  pastIncidentTitle: {
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: 1.3,
    minWidth: 0
  },
  pastIncidentDetails: {
    paddingTop: 0,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
    paddingBottom: theme.spacing(1)
  },
  incidentTitle: {
    fontWeight: theme.typography.fontWeightMedium,
    marginBottom: theme.spacing(0.5)
  },
  incidentMeta: {
    marginBottom: theme.spacing(1)
  },
  incidentDescription: {
    whiteSpace: 'pre-wrap'
  }
}));

export default function IncidentList({ incidents, section }) {
  const classes = useStyles();
  const { t } = useTranslation();

  const items = incidents || [];
  const activeIncidents = items.filter(incident => incident.status === 'active');
  const pastIncidents = items.filter(incident => incident.status === 'closed');

  const showActive = section === 'active' && activeIncidents.length > 0;
  const showPast = section === 'past' && pastIncidents.length > 0;

  if (!showActive && !showPast) {
    return null;
  }

  return <>
    {showActive && <div className={classes.section}>
      <Typography variant='h6' className={classes.sectionTitle}>
        <WarningIcon color='secondary' />
        {t('incidents.active')}
      </Typography>
      {activeIncidents.map((incident, index) =>
        <Paper key={`active-${index}`} className={classes.activeIncident}>
          <Typography className={classes.incidentTitle}>{incident.title}</Typography>
          <Typography variant='caption' color='textSecondary' className={classes.incidentMeta}>
            {formatIncidentStartDate(incident.startDate, t)}
          </Typography>
          {incident.description && <Typography variant='body2' className={classes.incidentDescription}>{incident.description}</Typography>}
        </Paper>)}
    </div>}

    {showPast && <div className={classes.pastSection}>
      <Typography variant='h6' className={classes.sectionTitle}>
        <HistoryIcon color='action' />
        {t('incidents.past')}
      </Typography>
      <Paper className={classes.pastPanel} elevation={0} square>
        {pastIncidents.map((incident, index) => {
          const hasDescription = Boolean(incident.description);
          return <Accordion
            key={`past-${index}`}
            className={classes.pastIncident}
            elevation={0}
            square
            {...(hasDescription ? {} : { expanded: false, onChange: () => {} })}>
            <AccordionSummary
              className={classes.pastIncidentSummary}
              expandIcon={
                <ExpandMoreIcon
                  fontSize='small'
                  className={hasDescription ? undefined : classes.hiddenExpandIcon}
                />
              }>
              <div className={classes.pastIncidentHeader}>
                <Typography variant='body2' className={classes.pastIncidentTitle}>{incident.title}</Typography>
                <Typography variant='caption' color='textSecondary' noWrap>
                  {formatIncidentStartDate(incident.startDate, t)}
                </Typography>
              </div>
            </AccordionSummary>
            {hasDescription && <AccordionDetails className={classes.pastIncidentDetails}>
              <Typography variant='body2' color='textSecondary' className={classes.incidentDescription}>
                {incident.description}
              </Typography>
            </AccordionDetails>}
          </Accordion>;
        })}
      </Paper>
    </div>}
  </>;
}
