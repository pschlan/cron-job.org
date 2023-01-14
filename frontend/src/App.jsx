import React, { useEffect } from 'react';
import Authenticator from './components/auth/Authenticator';
import i18n from 'i18next';
import detector from 'i18next-browser-languagedetector';
import { initReactI18next, useTranslation } from 'react-i18next';
import { Redirect, Switch, Route, useLocation } from 'react-router-dom';
import { SnackbarProvider, useSnackbar } from 'notistack';
import { CssBaseline } from '@material-ui/core';
import DashboardIcon from '@material-ui/icons/Dashboard';
import ScheduleIcon from '@material-ui/icons/Schedule';
import SettingsIcon from '@material-ui/icons/Settings';
import BarChartIcon from '@material-ui/icons/BarChart';
import StatusPagesIcon from '@material-ui/icons/NetworkCheck';

import translationEN from './locales/en/translation.json';
import translationDE from './locales/de/translation.json';
import translationIT from './locales/it/translation.json';
import translationRU from './locales/ru/translation.json';
import translationFR from './locales/fr/translation.json';
import translationJA from './locales/ja/translation.json';
import translationKO from './locales/ko/translation.json';
import translationVI from './locales/vi/translation.json';

import AppMenu from './components/AppMenu';
import Dashboard from './components/dashboard/Dashboard';
import Jobs from './components/jobs/Jobs';
import JobEditor from './components/jobs/JobEditor';
import History from './components/jobs/History';
import NotFound from './components/misc/NotFound';
import Settings from './components/settings/Settings';
import ConfirmEmailChange from './components/auth/ConfirmEmailChange';
import AppToolbar from './components/AppToolbar';
import Statistics from './components/statistics/Statistics';
import AppLayout from './components/AppLayout';

import { updateUserLanguage } from './utils/API';

import 'moment/locale/de';
import 'moment/locale/it';
import 'moment/locale/ru';
import 'moment/locale/fr';
import 'moment/locale/ja';
import 'moment/locale/ko';
import 'moment/locale/vi';
import moment from 'moment';
import useLanguageCode, { getLanguageCode } from './hooks/useLanguageCode';
import { Config } from './utils/Config';
import StatusPages from './components/statuspages/StatusPages';
import StatusPageEditor from './components/statuspages/StatusPageEditor';
import useViewport from './hooks/useViewport';
import { useDispatch } from 'react-redux';
import { setUiSetting } from './redux/actions';

export let snackbarRef = null;

const LANGUAGE_RESOURCES = {
  en: {
    translation: translationEN
  },
  de: {
    translation: translationDE
  },
  it: {
    translation: translationIT
  },
  ru: {
    translation: translationRU
  },
  fr: {
    translation: translationFR
  },
  ja: {
    translation: translationJA
  },
  ko: {
    translation: translationKO
  },
  vi: {
    translation: translationVI
  },
};

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: LANGUAGE_RESOURCES,
    fallbackLng: Config.fallbackLanguage,
    interpolation: {
      escapeValue: false
    }
  });

i18n
  .on('languageChanged', () => {
    const lang = getLanguageCode(i18n.languages);
    updateUserLanguage(lang);
  });

function SnackbarReferenceProvider() {
  snackbarRef = useSnackbar();
  return <></>;
}

function diffLang(lang1, lang2, prefix = '') {
  for (let key in lang1) {
    if (typeof(lang2[key]) === 'undefined') {
      console.log(prefix + key);
    } else if (typeof(lang1[key]) === 'object') {
      diffLang(lang1[key], lang2[key], key + '.');
    }
  }
}

function App() {
  const location = useLocation();
  const { t } = useTranslation();
  const { isMobile } = useViewport();
  const dispatch = useDispatch();

  const languageCode = useLanguageCode();

  diffLang(translationEN, translationDE);

  useEffect(() => {
    moment.updateLocale(languageCode, {
      calendar: LANGUAGE_RESOURCES[languageCode].translation.common.calendarFormat
    });
  }, [languageCode]);

  const menuItems = [
    {
      items: [
        {
          id: 'dashboard',
          text: t('common.dashboard'),
          icon: <DashboardIcon />,
          href: '/dashboard'
        },
        {
          id: 'jobs',
          text: t('common.cronjobs'),
          icon: <ScheduleIcon />,
          href: '/jobs'
        },
        Config.enableStatusPages && {
          id: 'statuspages',
          text: t('common.statuspages'),
          icon: <StatusPagesIcon />,
          href: '/statuspages'
        },
        {
          id: 'statistics',
          text: t('common.statistics'),
          icon: <BarChartIcon />,
          href: '/statistics'
        }
      ]
    },
    {
      items: [
        {
          id: 'settings',
          text: t('common.settings'),
          icon: <SettingsIcon />,
          href: '/settings'
        }
      ]
    }
  ];

  return (
    <SnackbarProvider maxSnack={5} autoHideDuration={5000} preventDuplicate={true}>
      <SnackbarReferenceProvider />
      <CssBaseline />
      <Authenticator>
        <AppLayout
          menuText={t('common.menu')}
          menu={<AppMenu items={menuItems} selectedId={location.pathname.split('/')[1]} onListItemClick={isMobile ? () => dispatch(setUiSetting('menuClosed', true)) : () => null} />}
          toolbar={<AppToolbar />}
          >
          <Switch>
            <Route path="/dashboard" exact component={Dashboard} />
            <Route path="/jobs/:jobId/history" exact component={History} />
            <Route path="/jobs/create" exact component={JobEditor} />
            <Route path="/jobs/:jobId" exact component={JobEditor} />
            <Route path="/jobs" exact component={Jobs} />
            {Config.enableStatusPages && <Route path="/statuspages/:statusPageId" exact component={StatusPageEditor} />}
            {Config.enableStatusPages && <Route path="/statuspages" exact component={StatusPages} />}
            <Route path="/settings" exact component={Settings} />
            <Route path="/statistics" exact component={Statistics} />
            <Route path="/confirmEmailChange/:token" exact component={ConfirmEmailChange} />
            <Redirect from="/login" exact to="/dashboard" />
            <Redirect from="/signup" exact to="/dashboard" />
            <Redirect from="/" exact to="/dashboard" />
            <NotFound />
          </Switch>
        </AppLayout>
      </Authenticator>
    </SnackbarProvider>
  );
}

export default App;
