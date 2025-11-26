// src/api/auth.ts
import { api } from "./client";
import { AuthResponse } from "./types/auth";
import { setAuthToken } from "./client";

const API_BASE = "/api"; // vamos usar em combinação com api (que já tem baseURL)

// LOGIN por nome + senha
export async function login(nome: string, senha: string): Promise<AuthResponse> {
  const resp = await api.post<AuthResponse>(`${API_BASE}/auth/login`, {
    nome,
    senha,
  });
  return resp.data;
}

// UPDATE PUSH TOKEN - agora envia NOME + TOKEN no body
export async function updatePushToken(nome: string, pushToken: string) {
  await api.post(`${API_BASE}/auth/update-push-token`, {
    nome,
    pushToken,
  });
}

// REGISTER (se ainda estiver usando)
export async function register(
  nome: string,
  email: string,
  senha: string,
  avatarUrl?: string
): Promise<AuthResponse> {
  const resp = await api.post<AuthResponse>(`${API_BASE}/auth/register`, {
    nome,
    email,
    senha,
    avatarUrl,
  });
  return resp.data;
}

export async function logout() {
  await setAuthToken(null);
}