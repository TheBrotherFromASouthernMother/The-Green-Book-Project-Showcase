/* eslint-disable no-param-reassign */
const _ = require('lodash');
const sanitizeHtml = require('lib/util/sanitize_html.js');

module.exports = (sequelize, DataTypes) => {
  const Reviews = sequelize.define('reviews', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [5, 1000],
        notEmpty: true,
      },
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isFlagged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    color: { type: DataTypes.STRING },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    place_name: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  }, {
    hooks: {
      beforeValidate: (attributes) => {
        attributes.description = sanitizeHtml(attributes.description);
        attributes.color = sanitizeHtml(attributes.color);
        attributes.place_name = sanitizeHtml(attributes.place_name);
      },

      beforeBulkUpdate: ({ attributes }) => {
        // Solution: https://github.com/sequelize/sequelize/issues/6253#issuecomment-233829414
        attributes.description = sanitizeHtml(attributes.description);
        attributes.color = sanitizeHtml(attributes.color);
        attributes.place_name = sanitizeHtml(attributes.place_name);
      },
    },
  });

  Reviews.associate = models => {
    _.forOwn(models, model => {
      if (model.tableName === 'likes') {
        model.belongsTo(Reviews);
        Reviews.hasMany(model);
      }
      if (model.tableName === 'users') Reviews.belongsTo(model);
      if (model.tableName === 'places') Reviews.belongsTo(model);
      if (model.tableName === 'intersection_tags') Reviews.hasMany(model);
    });
  };

  return Reviews;
};
