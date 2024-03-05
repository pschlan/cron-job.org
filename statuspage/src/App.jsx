import React, { useEffect } from 'react';
import './App.css';
import { Container, CssBaseline } from '@material-ui/core';
import { Switch, Route } from 'react-router-dom';
import StatusPage from './components/StatusPage';
import ErrorPage from './components/ErrorPage';

import i18n from 'i18next';
import detector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import useLanguageCode from './hooks/useLanguageCode';

import translationEN from './locales/en/translation.json';
import translationDE from './locales/de/translation.json';
import translationIT from './locales/it/translation.json';
import translationFR from './locales/fr/translation.json';
import translationRU from './locales/ru/translation.json';
import translationZhTW from './locales/zh_TW/translation.json';
import translationRo from './locales/ro/translation.json';
import translationPL from './locales/pl/translation.json';

import 'moment/locale/de';
import 'moment/locale/it';
import 'moment/locale/ru';
import 'moment/locale/pl';
import moment from 'moment';
import { Config } from './utils/Config';

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
  fr: {
    translation: translationFR
  },
  ru:{
    translation: translationRU
  },
  zh_TW:{
    translation: translationZhTW
  },
  ro:{
    translation: translationRo
  },
  pl:{
    translation: translationPL
  }
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

function App() {
  const languageCode = useLanguageCode();

  useEffect(() => {
    moment.locale(languageCode);
  }, [languageCode]);

  return <>
    <CssBaseline />
    <Container maxWidth='md'>
      <Switch>
        <Route path="/" exact component={StatusPage} />
        <Route>
          <ErrorPage is404={true} />
        </Route>
      </Switch>
    </Container>
  </>;
}

export default App;
