module.exports = {
  development: {
    username: process.env.DEV_DB_USER,
    password: process.env.DEV_DB_PWD,
    database: process.env.DEV_DB,
    host: process.env.DEV_DB_HOST,
    dialect: 'postgres',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
    migrationStorageTableName: 'sequelize_migrations',
    logging: true,
    redisOptions: {
      host: process.env.DEV_REDIS_HOST,
      port: process.env.DEV_REDIS_PORT,
      user: process.env.DEV_REDIS_USER,
      password: process.env.DEV_REDIS_PASSWORD,
    },
  },
  test: {
    username: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PWD,
    database: process.env.TEST_DB,
    host: process.env.TEST_DB_HOST,
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_migrations',
    logging: false,
    redisOptions: {
      host: process.env.TEST_REDIS_HOST,
      port: process.env.TEST_REDIS_PORT,
      user: process.env.TEST_REDIS_USER,
      password: process.env.TEST_REDIS_PASSWORD,
    },
  },
  review: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
    migrationStorageTableName: 'sequelize_migrations',
    dialectOptions: {
      ssl: {
        required: true,
        rejectUnauthorized: false,
      },
    },
    redisOptions: {
      url: process.env.REDIS_URL,
    },
  },
  production: {
    url: process.env.DATABASE_URL,
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
    migrationStorageTableName: 'sequelize_migrations',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        // Solution found from the following sources:
        // https://stackoverflow.com/questions/58965011/sequelizeconnectionerror-self-signed-certificate/61350416#61350416
        // https://github.com/brianc/node-postgres/issues/2009
        // Solves the issue "SequelizeConnectionError: self signed certificate"
        required: true,
        rejectUnauthorized: false,
      },
    },
    redisOptions: {
      url: process.env.REDIS_URL,
    },
  },
};
