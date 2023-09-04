/* eslint-disable no-param-reassign */
const sanitizeHtml = require('lib/util/sanitize_html.js');

module.exports = (sequelize, DataTypes) => {
  const Users = sequelize.define('users', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      validate: {
        min: 0,
      },
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
        len: [7, 50],
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 100],
      },
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [5, 15],
      },
    },
    last_login: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    sms_activated: { type: DataTypes.BOOLEAN, defaultValue: false },
    verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    number_of_posts: { type: DataTypes.INTEGER, min: 0, defaultValue: 0 },
    uuid: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 65],
      },
    },
    country_code: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'US',
      validate: {
        len: [0, 2],
      },
    },
    locale: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en-US',
      validate: {
        len: [0, 5],
      },
    },
    login_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    sign_up_device_type: {
      type: DataTypes.STRING(15),
      defaultValue: 'unknown',
    },
  }, {
    hooks: {
      beforeValidate: (attributes) => {
        attributes.full_name = sanitizeHtml(attributes.full_name);
        attributes.email = sanitizeHtml(attributes.email);
        attributes.phone_number = sanitizeHtml(attributes.phone_number);
        attributes.country_code = sanitizeHtml(attributes.country_code);
        attributes.locale = sanitizeHtml(attributes.locale);
        attributes.sign_up_device_type = sanitizeHtml(attributes.sign_up_device_type);
      },

      beforeBulkUpdate: ({ attributes }) => {
        // Solution: https://github.com/sequelize/sequelize/issues/6253#issuecomment-233829414
        attributes.full_name = sanitizeHtml(attributes.full_name);
        attributes.email = sanitizeHtml(attributes.email);
        attributes.phone_number = sanitizeHtml(attributes.phone_number);
      },
    },
  });

  return Users;
};
