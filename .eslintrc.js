module.exports = {
  root: true,
  plugins: ['jest', 'security'],
  extends: [
    'airbnb',
    'plugin:jest/recommended',
    'plugin:security/recommended',
    'plugin:prettier/recommended',
    'prettier/react',
  ],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    node: true,
  },
  rules: {
    'prettier/prettier': 0,
    'import/extensions': 0,
  },

  overrides: [
    {
      files: 'app/assets/js/*',
      plugins: ['jquery'],
      globals: {
        '$': "readonly",
      },
    }
  ],
  settings: {
    'import/resolver': {
      alias: [
        ['app', './app'],
        ['db', './db'],
        ['models', './db/models'],
        ['lib', './lib'],
        ['test', './test'],
        ['config', './config'],
        ['workers', './workers'],
      ],
    },
  },
};
