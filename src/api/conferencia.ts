// src/api/conferencia.ts
import api, { isOfflineError } from "./client";
import {
  DetalhePedido,
  ConferenciaCriada,
  ItemConferenciaUI,
} from "./types/conferencia";
import { enqueueOfflineMutation } from "./offlineQueue";

const BASE_PATH = "/api/conferencia";

/**
 * Filtros para busca de pedidos pendentes.
 *
 * dataIni / dataFim no formato "YYYY-MM-DD"
 */
export type FiltroPedidosPendentes = {
  page?: number;
  pageSize?: number;
  status?: string | null; // ex: "A", "AC", "F", etc.
  dataIni?: string | null; // "2025-12-01"
  dataFim?: string | null; // "2025-12-31"
};

/**
 * Busca pedidos pendentes de conferência, paginados e com filtros.
 */
export async function buscarPedidosPendentes(
  filtro: FiltroPedidosPendentes = {}
): Promise<DetalhePedido[]> {
  const {
    page = 0,
    pageSize = 20,
    status = null,
    dataIni = null,
    dataFim = null,
  } = filtro;

  const params: Record<string, any> = {
    page,
    pageSize,
  };

  if (status) params.status = status;
  if (dataIni) params.dataIni = dataIni;
  if (dataFim) params.dataFim = dataFim;

  const resp = await api.get<DetalhePedido[]>(
    `${BASE_PATH}/pedidos-pendentes`,
    { params }
  );

  return resp.data;
}

/**
 * Inicia a conferência de uma nota/pedido.
 * (aqui deixamos online-only mesmo)
 */
export async function iniciarConferencia(
  nunotaOrig: number,
  codUsuario: number
): Promise<ConferenciaCriada> {
  const payload = { nunotaOrig, codUsuario };

  console.log(
    "[API] /iniciar - payload enviado:",
    JSON.stringify(payload, null, 2)
  );

  const resp = await api.post<ConferenciaCriada>(
    `${BASE_PATH}/iniciar`,
    payload
  );
  return resp.data;
}

/**
 * Finaliza conferência sem divergência (STATUS = F).
 * Se estiver offline, enfileira a requisição e retorna void mesmo assim.
 */
export async function finalizarConferencia(
  nuconf: number,
  codUsuario: number
): Promise<void> {
  const payload = { nuconf, codUsuario };

  console.log(
    "[API] /finalizar - payload enviado:",
    JSON.stringify(payload, null, 2)
  );

  try {
    await api.post(`${BASE_PATH}/finalizar`, payload);
  } catch (e) {
    if (isOfflineError(e)) {
      console.log(
        "[API] /finalizar - offline detectado, enfileirando mutação..."
      );
      await enqueueOfflineMutation({
        method: "POST",
        url: `${BASE_PATH}/finalizar`,
        body: payload,
      });
      // considera sucesso local: a fila vai enviar quando voltar a internet
      return;
    }
    throw e;
  }
}

/**
 * Finaliza conferência com divergência (STATUS = D).
 * Se estiver offline, também enfileira pra enviar depois.
 */
export async function finalizarConferenciaDivergente(
  nuconf: number,
  codUsuario: number,
  nunotaOrig: number,
  itens: ItemConferenciaUI[]
): Promise<void> {
  const payload = {
    nuconf,
    nunotaOrig,
    codUsuario,
    itens: itens.map((i) => ({
      sequencia: i.sequencia,
      codProd: i.codProd,
      qtdNeg: i.qtdNeg,
      qtdConferida: i.qtdConferida,
    })),
  };

  console.log(
    "[API] /finalizar-divergente - payload enviado:",
    JSON.stringify(payload, null, 2)
  );

  try {
    await api.post(`${BASE_PATH}/finalizar-divergente`, payload);
  } catch (e) {
    if (isOfflineError(e)) {
      console.log(
        "[API] /finalizar-divergente - offline detectado, enfileirando mutação..."
      );
      await enqueueOfflineMutation({
        method: "POST",
        url: `${BASE_PATH}/finalizar-divergente`,
        body: payload,
      });
      return;
    }
    throw e;
  }
}
