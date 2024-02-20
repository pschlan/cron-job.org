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
import FolderIcon from '@material-ui/icons/FolderOutlined';
import StatusPagesIcon from '@material-ui/icons/NetworkCheck';

import translationEN from './locales/en/translation.json';
import translationDE from './locales/de/translation.json';
import translationIT from './locales/it/translation.json';
import translationRU from './locales/ru/translation.json';
import translationFR from './locales/fr/translation.json';
import translationZhTW from './locales/zh_TW/translation.json';
import translationRo from './locales/ro/translation.json';
import translationPL from './locales/pl/translation.json';

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
import 'moment/locale/ro';
import 'moment/locale/pl';
import 'moment/locale/zh-tw';
import moment from 'moment';
import useLanguageCode, { getLanguageCode } from './hooks/useLanguageCode';
import { Config } from './utils/Config';
import StatusPages from './components/statuspages/StatusPages';
import StatusPageEditor from './components/statuspages/StatusPageEditor';
import useViewport from './hooks/useViewport';
import { useDispatch, useSelector } from 'react-redux';
import { setUiSetting } from './redux/actions';
import useFolders from './hooks/useFolders';
import Folders from './components/jobs/Folders';

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
  zh_TW: {
    translation: translationZhTW,
  },
  ro: {
    translation: translationRo,
  },
  pl: {
    translation: translationPL,
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

function ConsoleMenu({ selectedId, onListItemClick, indentSubItems = false }) {
  const { t } = useTranslation();

  const folders = useFolders();

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
          href: '/jobs',
          subItems: folders.map(folder => (
            {
              id: 'folders/' + folder.folderId,
              text: folder.title,
              icon: <FolderIcon />,
              href: '/jobs/folders/' + folder.folderId
            }))
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

  return <AppMenu
    items={menuItems}
    selectedId={selectedId}
    onListItemClick={onListItemClick}
    indentSubItems={indentSubItems}
    />;
}

function getSelectedId(loc) {
  const locParts = loc.split('/');
  const item = locParts[1];

  if (item === 'jobs') {
    if (locParts[2] === 'folders' && locParts.length > 3) {
      return 'folders/' + locParts[3];
    }
  }

  return item;
}

function App() {
  const location = useLocation();
  const { t } = useTranslation();
  const { isMobile } = useViewport();
  const dispatch = useDispatch();

  const indentSubItems = !useSelector(state => state.ui && state.ui.menuClosed);

  const languageCode = useLanguageCode();

  diffLang(translationEN, translationDE);

  useEffect(() => {
    moment.updateLocale(languageCode, {
      calendar: LANGUAGE_RESOURCES[languageCode].translation.common.calendarFormat
    });
  }, [languageCode]);

  return (
    <SnackbarProvider maxSnack={5} autoHideDuration={5000} preventDuplicate={true}>
      <SnackbarReferenceProvider />
      <CssBaseline />
      <Authenticator>
        <AppLayout
          menuText={t('common.menu')}
          menu={<ConsoleMenu indentSubItems={indentSubItems} selectedId={getSelectedId(location.pathname)} onListItemClick={isMobile ? () => dispatch(setUiSetting('menuClosed', true)) : () => null} />}
          toolbar={<AppToolbar />}
          >
          <Switch>
            <Route path="/dashboard" exact component={Dashboard} />
            <Route path="/jobs/folders" exact component={Folders} />
            <Route path="/jobs/:jobId/history" exact component={History} />
            <Route path="/jobs/create" exact component={JobEditor} />
            <Route path="/jobs/:jobId" exact component={JobEditor} />
            <Route path="/jobs" exact component={Jobs} />
            <Route path="/jobs/folders/:folderId" exact component={Jobs} />
            <Route path="/jobs/folders/:folderId/:jobId/history" exact component={History} />
            <Route path="/jobs/folders/:folderId/create" exact component={JobEditor} />
            <Route path="/jobs/folders/:folderId/:jobId" exact component={JobEditor} />
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
