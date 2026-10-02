import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

const TOKEN_KEY = "homeservice_token";
const getToken = async () =>
  Platform.OS === "web"
    ? globalThis.localStorage?.getItem(TOKEN_KEY)
    : SecureStore.getItemAsync(TOKEN_KEY);
const setToken = async (token: string) => {
  if (Platform.OS === "web") globalThis.localStorage?.setItem(TOKEN_KEY, token);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
};
const removeToken = async () => {
  if (Platform.OS === "web") globalThis.localStorage?.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// Web runs on the backend computer; physical devices use the configured LAN URL.
const apiUrl = process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "http://localhost:3000/api";
export const api = axios.create({ baseURL: apiUrl });
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const saveToken = setToken;
export const clearToken = removeToken;
export const getStoredToken = getToken;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) await clearToken();
    return Promise.reject(error);
  },
);
