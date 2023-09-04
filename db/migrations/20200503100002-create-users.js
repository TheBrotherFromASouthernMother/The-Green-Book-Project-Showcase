module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        validate: {
          min: 0,
        },
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true,
          len: [7, 50],
        },
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [6, 100],
        },
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [5, 15],
        },
      },
      last_login: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      sms_activated: { type: Sequelize.BOOLEAN, defaultValue: false },
      verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      number_of_posts: { type: Sequelize.INTEGER, min: 0, defaultValue: 0 },
      uuid: {
        type: Sequelize.STRING,
        validate: {
          len: [0, 65],
        },
      },
      country_code: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'US',
        validate: {
          len: [0, 2],
        },
      },
      locale: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'en-US',
        validate: {
          len: [0, 5],
        },
      },
      login_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      push_token: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    }),
  down: queryInterface => queryInterface.dropTable('users'),
};
