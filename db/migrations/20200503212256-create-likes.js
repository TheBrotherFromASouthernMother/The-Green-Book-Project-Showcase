module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('likes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          len: [0, 35],
        },
      },
      date_posted: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

  down: queryInterface => queryInterface.dropTable('likes'),
};
