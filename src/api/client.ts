// src/api/client.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

let authToken: string | null = null;
const AUTH_TOKEN_KEY = "jwt";

/**
 * Salva o token em memória e (se possível) no SecureStore.
 */
export async function setAuthToken(token: string | null) {
  authToken = token;

  // só tenta usar SecureStore se NÃO estiver rodando no Expo Go
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

/**
 * Carrega o token do SecureStore ao iniciar o app.
 * Retorna o token (ou null) e também seta em memória.
 */
export async function loadStoredToken(): Promise<string | null> {
  // se não for StoreClient, tentamos buscar do SecureStore
  if (Constants.executionEnvironment !== "storeClient") {
    try {
      const stored = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      authToken = stored ?? null;
      return authToken;
    } catch (e) {
      console.warn("SecureStore não disponível, continuando sem persistência.", e);
      return authToken;
    }
  }

  // em Expo Go, só usamos o que estiver em memória (ou null)
  return authToken;
}

/**
 * Axios instance central da API
 */
export const api = axios.create({
  baseURL: "https://api-sankhya-fila-conferencia-6bbe82fb50b8.herokuapp.com",
  timeout: 10000,
});

/**
 * Interceptor síncrono — usa token que está em memória
 */
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
