// src/api/conferencia.ts
import { api } from "./client";
import { DetalhePedido, ConferenciaCriada } from "./types/conferencia";

const BASE_PATH = "/api/conferencia";

export async function buscarPedidosPendentes(): Promise<DetalhePedido[]> {
  const resp = await api.get<DetalhePedido[]>(`${BASE_PATH}/pedidos-pendentes`, {
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
  const resp = await api.post<ConferenciaCriada>(`${BASE_PATH}/iniciar`, {
    nunotaOrig,
    codUsuario,
  });
  return resp.data;
}

// Finalizar normal (STATUS = F)
export async function finalizarConferencia(
  nuconf: number,
  codUsuario: number
): Promise<void> {
  await api.post(`${BASE_PATH}/finalizar`, {
    nuconf,
    codUsuario,
  });
}

// Finalizar divergente (STATUS = D)
export async function finalizarConferenciaDivergente(
  nuconf: number,
  codUsuario: number
): Promise<void> {
  await api.post(`${BASE_PATH}/finalizar-divergente`, {
    nuconf,
    codUsuario,
  });
}
