// src/api/client.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

let authToken: string | null = null;
const AUTH_TOKEN_KEY = "jwt";

// 🔥 helper p/ saber se é erro de conexão/offline
export function isOfflineError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  if (!error.response) return true;

  if (
    error.code === "ECONNABORTED" ||
    (error.message || "").toLowerCase().includes("network error")
  ) {
    return true;
  }

  return false;
}

export async function setAuthToken(token: string | null) {
  authToken = token;

  if (Constants.executionEnvironment !== "storeClient") {
    try {
      if (token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn("SecureStore indisponível, usando apenas memória.", e);
    }
  }
}

export async function loadStoredToken(): Promise<string | null> {
  if (Constants.executionEnvironment !== "storeClient") {
    try {
      const stored = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      authToken = stored ?? null;
      return authToken;
    } catch (e) {
      console.warn(
        "SecureStore não disponível, continuando sem persistência.",
        e
      );
      return authToken;
    }
  }
  return authToken;
}

// 👇 instancia principal do Axios que o app todo vai usar
export const api = axios.create({
  baseURL: "https://api-sankhya-fila-conferencia-6bbe82fb50b8.herokuapp.com",
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export default api;
