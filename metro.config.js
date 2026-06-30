const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Permet d'importer un fichier .lottie (format binaire) en plus du .json
// classique pour les animations Lottie (mascotte).
config.resolver.assetExts.push('lottie');

module.exports = withNativeWind(config, { input: './global.css' });
