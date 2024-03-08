export const Config = {
  //! @note Adjust project name, domains and URLs accordingly.
  'productName': 'cron-job.org OSS',
  'baseURL': 'https://example.com',
  'twitterURL': 'https://twitter.com/CronJobOrg',
  'githubURL': 'https://github.com/pschlan/cron-job.org',
  'privacyPolicyURL': 'https://example.com/privacy/',
  'termsOfServiceURL': 'https://example.com/tos/',
  'returnPolicyURL': 'https://example.com/returnpolicy/',
  'apiDocsURL': 'https://example.com/docs/rest-api.html',

  //! @note The URL of the API webserver (/api/ folder in this repo)
  'apiURL': 'https://api.example.com/',

  //! @note Put your reCAPTCHA site key here.
  'recaptchaSiteKey': 'PLACE_RECAPTCHA_SITE_KEY_HERE',

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
    'zh_TW': '正體中文',
    'ro': 'Română',
    'pl': 'Polski'
  },

  //! @note Fallback language to use when the user's auto-determined language is not supported.
  'fallbackLanguage': 'en',

  //! @note Session token refresh interval in ms.
  'sessionRefreshInterval': 10*60*1000,

  //! @note A donation box can be enabled here. It will be shown when the user exceeds the
  //!       configured successful job count threshold.
  'donationBox': {
    'enable': false,
    'successfulJobsThreshold': 1,
    'hostedButtonId': 'PLACE_PAYPAL_HOSTED_BUTTON_ID_HERE'
  },

  //! @note If you want to offer a membership, define the amounts here.
  'sustainingMembership': {
    'enable': false,
    'amountsAMonth': [5, 10, 20],
    'amountsAYear': [12, 24, 36],
    'box': {
      'enable': false,
      'successfulJobsThreshold': 1
    }
  },

  //! @note Status pages support can be optionally enabled here.
  'enableStatusPages': false,
  'statusPageDomain': 'status.example.com',
  'maxLogoSize': 1024 * 128,

  'enableYubicoOTP': true,
};
