export const Config = {
  //! @note Adjust project name, domains and URLs accordingly.
  'productName': 'cron-job.org OSS',
  'baseURL': 'https://example.com',

  //! @note The URL of the API webserver (/api/ folder in this repo)
  'apiURL': 'https://api.example.com/',

  //! @note Domain to use whe opening the status page from localhost (e.g. dev environment)
  'devDomain': 'status.example.com',

  /****************************************************************************************
   ******** The following settings might be kept as is. Customization is optional. ********
   ****************************************************************************************/

  //! @note List of supported languages. When adding new language file, be sure
  //!       to add the new language code here.
  'languages': {
    'en': 'English',
    'de': 'Deutsch',
    'it': 'Italiano',
    'fr': 'Français',
    'ru': 'Русский',
    'zh_TW': '正體中文',
    'ro': 'Română',
    'pl': 'Polski'
  },

  //! @note Fallback language to use when the user's auto-determined language is not supported.
  'fallbackLanguage': 'en',
};
