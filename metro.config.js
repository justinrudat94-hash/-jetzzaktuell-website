const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Clear resolver cache
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Block native-only packages on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.includes('react-native-google-mobile-ads')) {
    return {
      type: 'empty',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Reset cache
config.resetCache = true;

module.exports = config;