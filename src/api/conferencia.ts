// src/api/conferencia.ts
import api from "./client";
import {
  DetalhePedido,
  ConferenciaCriada,
  ItemConferenciaUI,
} from "./types/conferencia";

const BASE_PATH = "/api/conferencia";

/**
 * Busca pedidos pendentes de conferência, paginados.
 */
export async function buscarPedidosPendentes(): Promise<DetalhePedido[]> {
  const resp = await api.get<DetalhePedido[]>(
    `${BASE_PATH}/pedidos-pendentes`,
    {
      params: {
        page: 0,
        pageSize: 50,
      },
    }
  );
  return resp.data;
}

/**
 * Inicia a conferência de uma nota/pedido.
 * Backend cria o NUCONF e devolve { nuconf, nunotaOrig }.
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

  const resp = await api.post<ConferenciaCriada>(`${BASE_PATH}/iniciar`, payload);
  return resp.data;
}

/**
 * Finaliza conferência sem divergência (STATUS = F).
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

  await api.post(`${BASE_PATH}/finalizar`, payload);
}

/**
 * 🔥 Finaliza conferência com divergência (STATUS = D).
 * Envia:
 *  - nuconf
 *  - nunotaOrig
 *  - codUsuario
 *  - itens com qtdNeg (esperada) e qtdConferida (do input).
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

  // 🔍 LOG PRINCIPAL DO QUE VAI PRO BACKEND
  console.log(
    "[API] /finalizar-divergente - payload enviado:",
    JSON.stringify(payload, null, 2)
  );

  await api.post(`${BASE_PATH}/finalizar-divergente`, payload);
}
