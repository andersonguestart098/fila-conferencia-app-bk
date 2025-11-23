// src/api/conferencia.ts
import axios from "axios";
import { DetalhePedido, ConferenciaCriada } from "./types/conferencia";

const API_BASE = "https://api-sankhya-fila-conferencia-6bbe82fb50b8.herokuapp.com/api/conferencia";

export async function buscarPedidosPendentes(): Promise<DetalhePedido[]> {
  const resp = await axios.get<DetalhePedido[]>(`${API_BASE}/pedidos-pendentes`, {
    params: {
      page: 0,
      pageSize: 50,
    },
  });
  return resp.data;
}

export async function iniciarConferencia(
  nunotaOrig: number,
  codUsuario: number
): Promise<ConferenciaCriada> {
  const resp = await axios.post<ConferenciaCriada>(`${API_BASE}/iniciar`, {
    nunotaOrig,
    codUsuario,
  });
  return resp.data;
}

// 🔹 NOVO: finalizar conferência (backend espera { nuconf, codUsuario })
export async function finalizarConferencia(
  nuconf: number,
  codUsuario: number
): Promise<void> {
  await axios.post(`${API_BASE}/finalizar`, {
    nuconf,
    codUsuario,
  });
}
