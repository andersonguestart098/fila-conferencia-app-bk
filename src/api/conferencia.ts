// src/api/conferencia.ts
import api from "./client"; // 👈 usa o default export que acabamos de configurar
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
  const resp = await api.post<ConferenciaCriada>(`${BASE_PATH}/iniciar`, {
    nunotaOrig,
    codUsuario,
  });
  return resp.data;
}

/**
 * Finaliza conferência sem divergência (STATUS = F).
 */
export async function finalizarConferencia(
  nuconf: number,
  codUsuario: number
): Promise<void> {
  await api.post(`${BASE_PATH}/finalizar`, {
    nuconf,
    codUsuario,
  });
}

/**
 * 🔥 Finaliza conferência com divergência (STATUS = D).
 * Aqui vamos mandar:
 *  - nuconf
 *  - nunotaOrig
 *  - codUsuario
 *  - itens com qtdConferida, pra backend ajustar TGFCOI2 e TGFITE.
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

  await api.post(`${BASE_PATH}/finalizar-divergente`, payload);
}
