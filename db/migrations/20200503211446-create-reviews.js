module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('reviews', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
          len: [5, 1000],
          notEmpty: true,
        },
      },
      isAnonymous: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isFlagged: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      color: { type: Sequelize.INTEGER },
      likeCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

  down: queryInterface => queryInterface.dropTable('reviews'),
};
