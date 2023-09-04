const path = require('path');
// const HtmlWebpackPlugin = require("html-webpack-plugin");
const Dotenv = require('dotenv-webpack');

// Credit to this article for the initial configuration: https://dev.to/deadwing7x/setup-a-react-app-with-webpack-and-babel-4o3k
const ENV = process.env.NODE_ENV || 'development';
const isDevelopment = ENV === 'development';

module.exports = {
  entry: {
    public: path.join(__dirname, "harlem", "Public/App.jsx"),
    admin: path.join(__dirname, "harlem", "Admin/App.jsx"),
  }, // Entry files for React Apps
  output: {
    path: path.join(__dirname, "app/assets/jsx"),
    filename: "[name].bundle.js",
    publicPath: path.join(__dirname, "app/assets/jsx"),
  }, // Output file for React assets
  optimization: {
    minimize: true,
  },
  mode: ENV, // Environment to run on e.g. development or production
  resolve: {
    modules: [path.resolve(__dirname), "node_modules"],
    extensions: ['.js', '.jsx', '.scss'],
   }, // Path for getting node_modules
  module: {
    rules: [
      {
          test: /\.(js|jsx)$/, // Specifies which file types to accept and transform
          exclude: /node_modules/,
          use: ["babel-loader"]
      },
      // Styling config based off: https://www.developerhandbook.com/webpack/how-to-configure-scss-modules-for-webpack/
      {
        test: /\.module\.s(a|c)ss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: isDevelopment
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: isDevelopment
            }
          }
        ]
      },
      {
        test: /\.s(a|c)ss$/,
        exclude: /\.module.(s(a|c)ss)$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: isDevelopment
            }
          }
        ]
      },
      {
          test: /\.(jpg|jpeg|png|gif|mp3|svg)$/,
          use: ["file-loader"]
      },
    ],
  },
  plugins: [
    new Dotenv(),
  ],
};
