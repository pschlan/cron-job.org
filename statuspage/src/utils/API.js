import axios from 'axios'
import { Config } from './Config';
import i18n from 'i18next';
import { getLanguageCode } from '../hooks/useLanguageCode';

function performRequest(method, payload) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Method': method,
      'X-UI-Language': getLanguageCode(i18n.languages),
    };
    const data = JSON.stringify(payload);

    axios.post(Config.apiURL, data, { headers })
      .then((response) => {
        resolve(response.data);
      })
      .catch((error ) => {
        reject(error);
      });
  });
}

export function getPublicStatusPage(domain) {
  return performRequest('GetPublicStatusPage', {
    domain
  });
}
