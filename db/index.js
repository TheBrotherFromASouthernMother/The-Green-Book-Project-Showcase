require('dotenv').config();

const migrating = !!process.env.MIGRATE;
if (migrating) {
  // necessary for running migrations
  require('module-alias/register'); // eslint-disable-line global-require
}

const fs = require('fs');
const path = require('path');
const { sqlLogger, errorLogger, infoLogger } = require('lib/logger.js');
const Sequelize = require('sequelize');

const env = process.env.NODE_ENV || 'development';
// eslint-disable-next-line security/detect-object-injection
const config = require('db/config.js')[env];

const logger = msg => sqlLogger(msg);
config.logging = env === 'development' ? logger : false;
const modelDirectory = `${__dirname}/models/`;
const models = {};
const modelFiles = {};

let sequelize;

if (env === 'development' || env === 'test') {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
} else {
  sequelize = new Sequelize(config.url, config);
}

sequelize
  .authenticate()
  .then(() => {
    infoLogger('Connection to Postgres databatase successful');
  })
  .catch(err => errorLogger(err.toString(), err.stack));

// eslint-disable-next-line security/detect-non-literal-fs-filename
fs.readdirSync(modelDirectory)
  .filter(file => file !== 'lib')
  .forEach(file => {
    const fileLocation = path.join(modelDirectory, file);
    const model = sequelize.import(fileLocation);
    models[model.tableName] = model;
    modelFiles[model.tableName] = fileLocation;
  });

Object.keys(models).forEach(modelName => {
  // eslint-disable-next-line security/detect-object-injection
  if ('associate' in models[modelName]) {
    // eslint-disable-next-line security/detect-object-injection
    models[modelName].associate(models);
  }
});

if (env === 'development' || env === 'test') {
  sequelize.sync();
}

module.exports = {
  sequelize,
  Sequelize,
  models,
  modelFiles,
};
