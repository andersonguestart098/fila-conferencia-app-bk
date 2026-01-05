// src/api/conferencia.ts
import { api } from "./client";
import type { DetalhePedido } from "../api/types/conferencia";

// controller compartilhado só pra essa rota
let pendentesController: AbortController | null = null;

// ✅ cache do último resultado bem-sucedido (para não "sumir tudo" quando falhar/cancelar)
let lastPendentesOk: DetalhePedido[] = [];
let lastPendentesOkAt = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// retry leve só para timeout/network
async function getComRetry<T>(url: string, config: any, tentativas = 2): Promise<T> {
  let lastErr: any;

  for (let i = 0; i <= tentativas; i++) {
    try {
      const resp = await api.get<T>(url, config);
      return resp.data as T;
    } catch (err: any) {
      lastErr = err;

      const isCanceled =
        err?.code === "ERR_CANCELED" ||
        err?.message?.toLowerCase?.().includes("canceled");

      if (isCanceled) throw err;

      const isTimeout =
        err?.code === "ECONNABORTED" || String(err?.message || "").includes("timeout");

      const isNetwork = !err?.response;

      const podeRetry = isTimeout || isNetwork;
      if (!podeRetry || i === tentativas) break;

      await sleep(400 * (i + 1));
    }
  }

  throw lastErr;
}

// ✅ Tipos e funções para gerenciamento de conferentes no localStorage (fallback)
type ConferenteByNunota = Record<number, { codUsuario: number; nome: string }>;

function loadConferenteByNunota(): ConferenteByNunota {
  try {
    return JSON.parse(localStorage.getItem("conferenteByNunota") || "{}");
  } catch {
    return {};
  }
}

function saveConferenteByNunota(next: ConferenteByNunota) {
  try {
    localStorage.setItem("conferenteByNunota", JSON.stringify(next));
  } catch {
    // ignore
  }
}

// ✅ Definir o tipo de filtro para pedidos pendentes
export type FiltroPedidosPendentes = {
  page: number;
  pageSize: number;
  status?: string | null;
  dataIni?: string | null;
  dataFim?: string | null;
  nunota?: number | null;
};

// ✅ Tipos mínimos para finalizar divergente (payload)
export type ItemFinalizacaoDivergente = {
  sequencia: number;
  codProd: number;
  qtdConferida: number;
};

export async function iniciarConferencia(
  nunota: number,
  codUsuario: number
): Promise<{ nuconf: number }> {
  console.log("🚀 Iniciando conferência:", { nunota, codUsuario });

  const response = await api.post("/api/conferencia/iniciar", {
    nunotaOrig: nunota,
    codUsuario,
  });

  return response.data;
}

export async function finalizarConferencia(nuconf: number, codUsuario: number): Promise<void> {
  console.log("✅ [API] Finalizando conferência NORMAL:", { nuconf, codUsuario });

  await api.post("/api/conferencia/finalizar", {
    nuconf,
    codUsuario,
  });
}

export async function finalizarConferenciaDivergente(
  nuconf: number,
  codUsuario: number,
  nunotaOrig: number,
  itens: Array<any>
): Promise<void> {
  const itensPayload: ItemFinalizacaoDivergente[] = (itens || []).map((i) => ({
    sequencia: Number(i.sequencia),
    codProd: Number(i.codProd),
    qtdConferida: Number(i.qtdConferida ?? 0),
  }));

  console.log("🟠 [API] Finalizando conferência DIVERGENTE:", {
    nuconf,
    codUsuario,
    nunotaOrig,
    totalItens: itensPayload.length,
  });

  await api.post("/api/conferencia/finalizar-divergente", {
    nuconf,
    codUsuario,
    nunotaOrig,
    itens: itensPayload,
  });
}

// ✅ Função para buscar conferentes (lista fixa)
export async function buscarConferentes(): Promise<{ codUsuario: number; nome: string }[]> {
  return [
    { codUsuario: 1, nome: "Manoel" },
    { codUsuario: 2, nome: "Anderson" },
    { codUsuario: 3, nome: "Felipe" },
    { codUsuario: 4, nome: "Matheus" },
    { codUsuario: 5, nome: "Cristiano" },
    { codUsuario: 6, nome: "Cristiano Sanhudo" },
    { codUsuario: 7, nome: "Eduardo" },
    { codUsuario: 8, nome: "Everton" },
    { codUsuario: 9, nome: "Maximiliano" },
  ];
}

/**
 * ✅ DEFINIR CONFERENTE (persistência Mongo)
 *
 * Observação: eu mantenho localStorage como fallback/cache,
 * mas a fonte da verdade agora é o backend.
 */
export async function definirConferente(
  nunota: number,
  codUsuario: number,
  nome: string
): Promise<void> {
  console.log("📝 Definindo conferente:", { nunota, codUsuario, nome });

  // 1) Persiste no backend (Mongo)
  await api.post("/api/conferencia/conferente", {
    nunota,
    nome,
    codUsuario,
  });

  console.log("✅ Conferente persistido no Mongo via backend");

  // 2) Cache local (opcional, ajuda UX/offline)
  const conferenteByNunota = loadConferenteByNunota();
  conferenteByNunota[nunota] = { codUsuario, nome };
  saveConferenteByNunota(conferenteByNunota);

  console.log("✅ Cache localStorage atualizado");
}

// ✅ (opcional) manter igual ao seu
export async function buscarConferentesDoBackend(): Promise<{ codUsuario: number; nome: string }[]> {
  return buscarConferentes();
}

export async function buscarPedidosPendentes(
  filtro?: FiltroPedidosPendentes
): Promise<DetalhePedido[]> {
  // ✅ controller local desta chamada (pra não dar corrida com o finally do request anterior)
  const controller = new AbortController();

  try {
    // aborta o anterior e registra o atual como "vigente"
    if (pendentesController) pendentesController.abort();
    pendentesController = controller;

    const params: any = {};
    if (filtro) {
      params.page = filtro.page;
      params.pageSize = filtro.pageSize;
      if (filtro.status) params.status = filtro.status;
      if (filtro.dataIni) params.dataIni = filtro.dataIni;
      if (filtro.dataFim) params.dataFim = filtro.dataFim;
      if (filtro.nunota) params.nunota = filtro.nunota;
    }

    console.log("📡 [API] Buscando pedidos pendentes...", { filtro, params });

    const data = await getComRetry<DetalhePedido[]>(
      "/api/conferencia/pedidos-pendentes",
      {
        signal: controller.signal,
        timeout: 60000,
        params,
      },
      1
    );

    // validação mínima
    const list = Array.isArray(data) ? data : [];

    console.log("✅ [API] Dados recebidos do backend:", {
      total: list.length,
      primeiroPedido: list[0]
        ? {
            nunota: list[0].nunota,
            conferenteId: (list[0] as any).conferenteId,
            conferenteNome: (list[0] as any).conferenteNome,
            nomeConferente: (list[0] as any).nomeConferente,
          }
        : null,
    });

    // ✅ se backend ainda não devolve conferenteId/nome,
    // você pode continuar usando cache local pra mostrar na UI:
    const conferenteByNunota = loadConferenteByNunota();
    list.forEach((pedido: any) => {
      if (!pedido.conferenteId && conferenteByNunota[pedido.nunota]) {
        pedido.conferenteId = conferenteByNunota[pedido.nunota].codUsuario;
        pedido.conferenteNome = conferenteByNunota[pedido.nunota].nome;
      }
    });

    // ✅ atualiza cache APENAS quando a resposta foi bem-sucedida
    lastPendentesOk = list;
    lastPendentesOkAt = Date.now();

    return list;
  } catch (error: any) {
    const isCanceled =
      error?.code === "ERR_CANCELED" ||
      error?.message?.toLowerCase?.().includes("canceled");

    if (isCanceled) {
      // ✅ cancelado pelo próximo poll: NÃO zera a lista na UI
      console.log("🟦 [API] Request cancelado (novo poll iniciou). Mantendo cache.", {
        cacheTotal: lastPendentesOk.length,
      });
      return lastPendentesOk;
    }

    console.error("❌ [API] ERRO ao buscar pedidos:", {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      url: error?.config?.url,
      data: error?.response?.data,
      cacheTotal: lastPendentesOk.length,
      cacheAgeMs: lastPendentesOkAt ? Date.now() - lastPendentesOkAt : null,
    });

    // ✅ falhou: mantém último resultado ok
    return lastPendentesOk;
  } finally {
    // ✅ só limpa se o controller vigente ainda for este
    if (pendentesController === controller) {
      pendentesController = null;
    }
  }
}

export { loadConferenteByNunota, saveConferenteByNunota };
