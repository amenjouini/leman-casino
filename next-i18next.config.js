// next-i18next.config.js
const path = require('path');

module.exports = {
  i18n: {
    // These are all the locales you want to support
    locales: ['en', 'fr'],
    // This is the default locale
    defaultLocale: 'en',
  },
  // This is where your translations are stored
  localePath: path.resolve('./public/locales'),
};