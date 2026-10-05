import * as fs from "node:fs";
import * as path from "node:path";
import appJson from "./app.json";

function readRootEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const rootEnv = readRootEnv();
const expoConfig = appJson.expo as typeof appJson.expo & {
  extra?: Record<string, unknown>;
};
export default {
  ...appJson,
  expo: {
    ...expoConfig,
    plugins: [...(expoConfig.plugins || []), "expo-sharing"],
    extra: { ...(expoConfig.extra || {}), apiUrl: rootEnv.EXPO_PUBLIC_API_URL },
  },
};
