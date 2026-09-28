const fs = require('fs');
const path = require('path');

function readRootEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

const rootEnv = readRootEnv();
const appJson = require('./app.json');
module.exports = { ...appJson, expo: { ...appJson.expo, extra: { ...(appJson.expo.extra || {}), apiUrl: rootEnv.EXPO_PUBLIC_API_URL } } };