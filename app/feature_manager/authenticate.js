const { Sentry } = require('app/config.js');
const secureCompare = require('secure-compare');

module.exports = (app, secret, baseUri) => {
  const routes = [
    `${baseUri}/api/client/features`,
    `${baseUri}/api/client/register`,
    `${baseUri}/api/client`,
  ];

  app.use(routes, (req, res, next) => {

    const unleashAuthorizationHeader = req.headers['x-unleash-authorization'] || '';
    const isAuthorized = secureCompare(unleashAuthorizationHeader, secret);

    if (!isAuthorized) {
      const error = new Error('unauthorized request to unleash server');
      Sentry.captureException(error);
      res.sendStatus(401);
    } else {
      next();
    }
  })
};
