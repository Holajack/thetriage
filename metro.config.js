const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 3D model file support
config.resolver.assetExts.push('glb', 'gltf', 'bin', 'obj', 'mtl');

// Configure SVG transformer
const assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
const sourceExts = [...config.resolver.sourceExts, 'svg'];

config.resolver.assetExts = assetExts;
config.resolver.sourceExts = sourceExts;

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

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
