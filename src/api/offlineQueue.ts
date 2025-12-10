// src/api/offlineQueue.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { isOfflineError } from "./client";

export type OfflineMutation = {
  id: string;
  method: "POST" | "PUT" | "DELETE";
  url: string;
  body?: any;
  createdAt: string;
};

const STORAGE_KEY = "@fila_offline_mutations_v1";

/**
 * Lê a fila inteira do AsyncStorage
 */
async function getQueue(): Promise<OfflineMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineMutation[];
  } catch (e) {
    console.log("[OFFLINE_QUEUE] Erro ao ler fila:", e);
    return [];
  }
}

/**
 * Salva a fila inteira no AsyncStorage
 */
async function saveQueue(queue: OfflineMutation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.log("[OFFLINE_QUEUE] Erro ao salvar fila:", e);
  }
}

/**
 * Adiciona uma nova mutação à fila
 */
export async function enqueueOfflineMutation(input: {
  method: "POST" | "PUT" | "DELETE";
  url: string;
  body?: any;
}) {
  const queue = await getQueue();

  const mutation: OfflineMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method: input.method,
    url: input.url,
    body: input.body,
    createdAt: new Date().toISOString(),
  };

  const novaFila = [...queue, mutation];
  await saveQueue(novaFila);

  console.log(
    "[OFFLINE_QUEUE] Mutação enfileirada:",
    mutation.url,
    "método=",
    mutation.method,
    "tamanhoFila=",
    novaFila.length
  );
}

/**
 * Tenta reenviar todas as mutações pendentes.
 * - Tenta independente de "saber" se está online ou não.
 * - Se der erro de rede (offline), para e mantém na fila.
 * - Se der erro HTTP 4xx/5xx, remove da fila (pra não travar tudo).
 */
export async function flushOfflineMutations() {
  console.log("[OFFLINE_QUEUE] flushOfflineMutations() chamado");

  let queue = await getQueue();
  if (queue.length === 0) {
    console.log("[OFFLINE_QUEUE] Nenhuma mutação pendente.");
    return;
  }

  console.log("[OFFLINE_QUEUE] Reenviando", queue.length, "mutações...");

  const aindaPendentes: OfflineMutation[] = [];

  for (const mut of queue) {
    try {
      console.log(
        "[OFFLINE_QUEUE] Enviando:",
        mut.method,
        mut.url,
        "id=",
        mut.id
      );

      await api.request({
        method: mut.method,
        url: mut.url,
        data: mut.body,
      });

      console.log("[OFFLINE_QUEUE] Sucesso ao reenviar id=", mut.id);
    } catch (e: any) {
      console.log(
        "[OFFLINE_QUEUE] Erro ao reenviar id=",
        mut.id,
        "=>",
        e?.message || e
      );

      // se for erro de rede, interrompe o processamento — tenta de novo depois
      if (isOfflineError(e)) {
        console.log(
          "[OFFLINE_QUEUE] Parece offline durante o flush, parando e mantendo o restante na fila."
        );
        aindaPendentes.push(mut);
        // o restante da fila original ainda não foi processado → mantém também
        const idx = queue.indexOf(mut);
        if (idx >= 0) {
          const restantes = queue.slice(idx + 1);
          aindaPendentes.push(...restantes);
        }
        break;
      }

      // se for erro do servidor 4xx/5xx, remove da fila (pra não travar tudo)
      const status = e?.response?.status;
      if (status && status >= 400 && status < 600) {
        console.log(
          "[OFFLINE_QUEUE] Removendo mutação com erro HTTP",
          status,
          "id=",
          mut.id
        );
        // não reinsere
      } else {
        // erro desconhecido — mantém na fila pra tentar de novo
        aindaPendentes.push(mut);
      }
    }
  }

  await saveQueue(aindaPendentes);
  console.log(
    "[OFFLINE_QUEUE] Flush finalizado. Pendentes restantes:",
    aindaPendentes.length
  );
}

/**
 * Loop simples que tenta fazer flush periódico em background.
 */
let flushIntervalId: ReturnType<typeof setInterval> | null = null;

export function startOfflineQueueBackgroundFlush(intervalMs = 15000) {
  if (flushIntervalId) {
    // já está rodando
    return;
  }

  console.log(
    "[OFFLINE_QUEUE] Iniciando flush em background a cada",
    intervalMs,
    "ms"
  );

  flushIntervalId = setInterval(() => {
    flushOfflineMutations().catch((err) => {
      console.log("[OFFLINE_QUEUE] Erro no flush periódico:", err);
    });
  }, intervalMs);
}

export function stopOfflineQueueBackgroundFlush() {
  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
    console.log("[OFFLINE_QUEUE] Flush em background parado.");
  }
}
