import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Config } from '../utils/Config';

export function getLanguageCode(languages) {
  const filteredLanguages = languages.filter(x => x in Config.languages);
  if (filteredLanguages.length > 0) {
    return filteredLanguages[0];
  }
  return Config.fallbackLanguage;
}

export default function useLanguageCode() {
  const { i18n } = useTranslation();
  const [langCode, setLangCode] = useState(getLanguageCode(i18n.languages));

  useEffect(() => {
    setLangCode(getLanguageCode(i18n.languages));
  }, [i18n.languages]);

  return langCode;
}
