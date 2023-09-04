module.exports = (sequelize, DataTypes) => {
  const Likes = sequelize.define('likes', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [0, 35],
      },
    },
    date_posted: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
  });

  Likes.associate = models => {
    if (models.users) Likes.belongsTo(models.users);
  };

  return Likes;
};
