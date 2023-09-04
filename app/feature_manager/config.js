const url = require('url');
const { parseURL } = require('whatwg-url');
const first = require('lodash/first');
const {
  infoLogger,
  errorLogger,
  warnLogger,
  debugLogger,
} = require('lib/logger');
const { getEnv, Sentry } = require('app/config.js');
const authenticationHook = require('app/feature_manager/authenticate.js');

const UNLEASH_SECRET = 'UNLEASH_SECRET';
const UNLEASH_BASE_URI_PATH = '/v1/feature_manager';

const parseDatabaseUrl = (databaseUrl) => {
  const parsedDatabaseUrl = parseURL(databaseUrl) || {};

  return {
    user: parsedDatabaseUrl.username,
    password: parsedDatabaseUrl.password,
    database: first(parsedDatabaseUrl.path),
    host: parsedDatabaseUrl.host,
    port: parsedDatabaseUrl.port,
    ssl: {
      rejectUnauthorized: false
    },
  }
};

const buildUnleashServerOptions = () => {
  const env = getEnv('ENV');
  const databaseUrl = getEnv('HEROKU_POSTGRESQL_BLACK_URL');
  const port = getEnv('PORT');

  const baseDatabaseCredentials = {
    pool: {
      min: 0,
      max: 4,
      idleTimeoutMillis: 30000,
    },
  };

  let databaseCredentials;

  if (env === 'development') {
    databaseCredentials = Object.assign(baseDatabaseCredentials, {
      username: process.env.DEV_DB_USER,
      password: process.env.DEV_DB_PWD,
      database: 'unleash',
      host: process.env.DEV_DB_HOST,
      port: 5432,
    });
  } else {
    const parsedDatabaseCredentials = parseDatabaseUrl(databaseUrl);
    databaseCredentials = Object.assign(
      baseDatabaseCredentials,
      // Have to pass in `url` here in order to connect to a secondary db because Unleash uses the db-migrate library
      // which by default runs migrations and seeds on whichever database is connected to the enviorment variable $DATABASE_URL
      // Reference: https://github.com/db-migrate/node-db-migrate/blob/68fd0d58909401e1eea24b4b1ec01b56ad94ca3a/lib/config.js#L136
      { ...parsedDatabaseCredentials, url: databaseUrl }
    );
  }

  return {
    port,
    db: databaseCredentials,
    adminAuthentication: 'custom',
    preRouterHook: app => authenticationHook(app, UNLEASH_SECRET, UNLEASH_BASE_URI_PATH),
    serverMetrics: true,
    enableRequestLogger: true,
    baseUriPath: UNLEASH_BASE_URI_PATH,
    getLogger: () => ({
      info: infoLogger,
      error: error => {
        /*
          Adding Sentry error reporting here based on the result of this Slack thread:
          https://thegreenbookproject.slack.com/archives/C02FNJU8KN0/p1654794423578019
        */
        Sentry.captureException(error);
        errorLogger(error);
      },
      warn: warnLogger,
      debug: debugLogger,
    })
  }
};

const getHerokuReviewAppHostName = () => {
  const PR_NUMBER = process.env.HEROKU_PR_NUMBER;
  return `the-green-book-pr-${PR_NUMBER}.herokuapp.com`;
};

const buildUnleashClientUrl = () => {
  const env = getEnv('ENV');

  if (env === 'development') {
    const port = getEnv('PORT');
    return url.format({
      port,
      protocol: 'http',
      hostname: 'localhost',
      pathname: `${UNLEASH_BASE_URI_PATH}/api`,
    });
  }

  if (env === 'production') {
    return url.format({
      protocol: 'https',
      hostname: 'www.thegreenbook.io',
      pathname: `${UNLEASH_BASE_URI_PATH}/api`,
    });
  }


  if (env === 'review') {
    return url.format({
      protocol: 'https',
      hostname: getHerokuReviewAppHostName(),
      pathname: `${UNLEASH_BASE_URI_PATH}/api`,
    });
  }
  return '';
};


const buildUnleashClientOptions = () => ({
  appName: 'the-green-book-project-unleash-app',
  url: buildUnleashClientUrl(),
  refreshInterval: 300000,
  customHeaders: {
    'x-unleash-authorization': UNLEASH_SECRET,
  },
})

module.exports = {
  buildUnleashClientOptions,
  buildUnleashServerOptions,
};
