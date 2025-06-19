const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname, {
  // Add these resolver options
  resolver: {
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['require', 'import', 'react-native']
  }
});

module.exports = withNativeWind(config, { 
  input: './app/global.css',
  // Add this if using React 18
  projectRoot: __dirname 
});