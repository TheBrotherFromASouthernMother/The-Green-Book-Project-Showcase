require('module-alias/register');
const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const graphqlHTTP = require('express-graphql');
const graphqlDepthLimit = require('graphql-depth-limit');

// Middleware imports
const authenticateHeaders = require('app/middleware/authenticate.js');
const identifyUser = require('app/middleware/identify.js');
const setUserContext = require('app/middleware/context.js');
const locationMiddleware = require('app/middleware/location.js');
const forceSSL = require('app/middleware/force_ssl.js');
const cookieHeader = require('app/middleware/cookie_header.js');

// Utilities
const { errorLogger, infoLogger } = require('lib/logger.js');
const { ENV, Sentry, PORT } = require('app/config.js');

// Side-effect Modules
const Router = require('app/router.js');
const schema = require('app/schema/index.js');
const createFeatureManager = require('app/feature_manager/index.js');
const appEventEmitter = require('app/events/index.js');
const { logQueue } = require('workers/queues.js');

// Seperate rate limiters for sensitive routes vs non-sensitive
const generalLimter = rateLimit({
  windowMs: minutes * seconds * milliseconds, // 1 minutes
  max: 100, // limit each IP to 100 requests per minute
  message: 'Too many requests, please try again later.',
});

const accountLimiter = rateLimit({
  windowMs: minutes * seconds * milliseconds, // 1 minutes
  max: 10, // limit each IP to 10 requests per minute
  message: 'Too many requests, please try again later.',
});


// configuration
const app = express();
const host = ip.address();

// Middleware
app.enable('trust proxy');
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(Sentry.Handlers.requestHandler());
app.use(express.static(`${__dirname}/assets`));
app.use(bodyParse());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(helmet());
app.use(logTraffic);
app.use(generalLimter);
app.use(forceSSL);
app.use(
  [
    '/verification_code/',
    '/login/',
    '/signup/',
    '/users/verify/',
    '/authenticate/',
    '/admin/login',
    '/admin/verify'
  ],
  accountLimiter
);
app.use(cookieHeader);
app.use(authenticateHeaders);
app.use(locationMiddleware);
app.use(identifyUser);

// Graphql Middleware
app.use(
  '/api/',
  graphqlHTTP(async (req, res) => ({
    schema,
    graphiql: ENV !== 'production',
    // Limits GraphQL query depth to prevent infinite loops / DOS vectors
    validationRules: [graphqlDepthLimit(8)],
    context: await setUserContext(req, res),
    customFormatErrorFn: err => {
      errorLogger(err.toString(), err.stack);
      Sentry.captureException(err);
      return err;
    },
  }))
);


// routes
app.use(Router);

app.use(Sentry.Handlers.errorHandler());

// Function wrapper for adding any jobs that need to be initiated at server boot
const startQueues = () => {
  try {
    logQueue.add(null, {
      repeat: {
        cron: '30 * * * *'
      },
      removeOnComplete: 100,
    });
    infoLogger('logging queue: job added');
  } catch (error) {
    Sentry.captureException(error);
    errorLogger(error.toString(), error.stack);
  }
}

// Server Initiation
app.listen(PORT, () => {
  if (ENV !== 'production') {
    if (ENV === 'development') {
      qrcode.generate(`http://${host}:${port}/`);
      fs.unlink('logs/sql-log.sql', err => {
        if (err) errorLogger(err.toString());
      });
    }
    infoLogger('server listening on port: ', PORT);
  }

  infoLogger('server listening for The Green Book Project API');
  createFeatureManager(app);
  startQueues();
  appEventEmitter.initiate();
});

module.exports.app = app;
