const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  url: require.resolve('react-native-url-polyfill'),
  stream: require.resolve('stream-browserify'),
  events: require.resolve('events/'),
  assert: require.resolve('assert'),
  util: require.resolve('util/'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  net: require.resolve('react-native-tcp'),
  tls: require.resolve('react-native-tcp'),
  zlib: require.resolve('browserify-zlib'),
  path: require.resolve('path-browserify'),
  os: require.resolve('os-browserify/browser'),
  crypto: require.resolve('react-native-crypto'),
  fs: require.resolve('react-native-fs'),
};

module.exports = config;
