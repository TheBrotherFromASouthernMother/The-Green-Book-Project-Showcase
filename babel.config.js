module.exports = api => {
  api.cache(true);
  return {
    presets: [
      "@babel/preset-env",
      ["@babel/preset-react", {"runtime": "automatic"}]
    ],
    plugins: [
      [
        require.resolve('babel-plugin-module-resolver'),
        {
          root: './harlem',
          alias: {
            shared: './harlem/shared',
          },
        },
      ],
    ],
  };
};
