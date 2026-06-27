// Config dynamique Expo : injecte la clé Google Maps depuis l'environnement
// (secret GitHub `GOOGLE_MAPS_API_KEY` au build, ou variable locale) afin de
// NE PAS committer la clé dans le dépôt public. Le reste vient de app.json.
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    config.android = config.android || {};
    config.android.config = {
      ...(config.android.config || {}),
      googleMaps: { apiKey: key },
    };
    config.ios = config.ios || {};
    config.ios.config = { ...(config.ios.config || {}), googleMapsApiKey: key };
  }
  return config;
};
