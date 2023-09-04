const unleash = require('unleash-server');
const { startUnleash } = require('unleash-client');
const {
  infoLogger,
  errorLogger,
  warnLogger,
} = require('lib/logger');
const { Sentry } = require('app/config.js');
const { buildUnleashServerOptions, buildUnleashClientOptions } = require('app/feature_manager/config.js');


const createFeatureManager = async (app) => {
  try {
    const unleashServerOptions = buildUnleashServerOptions();
    const unleashContext = await unleash.create(unleashServerOptions);

    app.use(unleashContext.app);

    const unleashClientOptions = buildUnleashClientOptions();
    const unleashClient = await startUnleash(unleashClientOptions);

    unleashClient.on('error', (error) => {
      Sentry.captureException(error);
      errorLogger('feature manager: ', error.toString(), error.stack);
    });

    unleashClient.on('warn', (warningMessage) => {
      warnLogger(`feature manager: ${warningMessage}`);
    });

    unleashClient.on('count', (featureName, enabled) => {
      infoLogger(`feature manager: evaluating feature toggle ${featureName}, enabled: ${enabled}`);
    });

    unleashClient.on('changed', (data) => {
      infoLogger('feature manager: new feature toggle state change');
      infoLogger(data);
    });

    app.set('featureManager', unleashClient);
    infoLogger('feature manager: Unleash successfully set on app')

    return unleashContext;
  } catch (error) {
    Sentry.captureException(error);
    errorLogger(error.toString(), error.stack);
    return null;
  }
};

module.exports = createFeatureManager;
