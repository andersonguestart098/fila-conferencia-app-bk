/**
 * Fila de Conferência - Pedidos Pendentes
 *
 * ✅ Polling melhorado:
 * - Loop com setTimeout (não empilha requests)
 * - 2s quando tela focada + app ativo
 * - Pausa no background
 * - Backoff em falha
 * - Mantém cache quando falhar (API já devolve cache)
 * - Proteção anti-race (reqSeq)
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Animated,
  Easing,
  DimensionValue,
  AppState,
  AppStateStatus,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/RootNavigator";
import { DetalhePedido } from "../api/types/conferencia";
import { buscarPedidosPendentes, FiltroPedidosPendentes } from "../api/conferencia";

import Navbar from "../components/Navbar";
import { isOfflineError } from "../api/client";
import { logout } from "../api/auth";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// ------------------- MAPAS DE STATUS ---------------------------- //

const statusMap: Record<string, string> = {
  A: "Em andamento",
  AC: "Aguardando conferência",
  AL: "Aguardando liberação p/ conferência",
  C: "Aguardando liberação de corte",
  D: "Finalizada divergente",
  F: "Finalizada OK",
  R: "Aguardando recontagem",
  RA: "Recontagem em andamento",
  RD: "Recontagem finalizada divergente",
  RF: "Recontagem finalizada OK",
  Z: "Aguardando finalização",
};

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  A: { bg: "#EEF2FF", border: "#C7D2FE", text: "#1D4ED8" },
  AC: { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E" },
  AL: { bg: "#F3F4F6", border: "#E5E7EB", text: "#4B5563" },
  C: { bg: "#F3F4F6", border: "#E5E7EB", text: "#4B5563" },
  D: { bg: "#FEE2E2", border: "#FCA5A5", text: "#B91C1C" },
  F: { bg: "#DCFCE7", border: "#86EFAC", text: "#15803D" },
  R: { bg: "#FFEDD5", border: "#FED7AA", text: "#9A3412" },
  RA: { bg: "#EEF2FF", border: "#C7D2FE", text: "#1D4ED8" },
  RD: { bg: "#FEE2E2", border: "#FCA5A5", text: "#B91C1C" },
  RF: { bg: "#DCFCE7", border: "#86EFAC", text: "#15803D" },
  Z: { bg: "#F3F4F6", border: "#E5E7EB", text: "#4B5563" },
};

const statusOptions = [
  { label: "Todos", value: null },
  { label: "Em andamento", value: "A" },
  { label: "Aguard. conf.", value: "AC" },
  { label: "Aguard. liberação", value: "AL" },
  { label: "Finalizada OK", value: "F" },
  { label: "Divergente", value: "D" },
];

type PeriodoFiltro = "MES_ATUAL" | "HOJE" | "7_DIAS" | "30_DIAS";

const formatDate = (d: Date) => d.toISOString().slice(0, 10);

function getDateRange(periodo: PeriodoFiltro) {
  const hoje = new Date();

  if (periodo === "MES_ATUAL") {
    return {
      dataIni: formatDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
      dataFim: formatDate(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
    };
  }

  const fim = new Date(hoje);

  if (periodo === "HOJE") return { dataIni: formatDate(fim), dataFim: formatDate(fim) };

  if (periodo === "7_DIAS") {
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - 6);
    return { dataIni: formatDate(ini), dataFim: formatDate(fim) };
  }

  if (periodo === "30_DIAS") {
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - 29);
    return { dataIni: formatDate(ini), dataFim: formatDate(fim) };
  }

  return { dataIni: null, dataFim: null };
}

// ------------------- SKELETON COM SHIMMER ----------------------- //

const ShimmerEffect = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => shimmerAnim.stopAnimation();
  }, []);

  const translateX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] });

  return (
    <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX }] }]} />
  );
};

const SkeletonHeader = () => (
  <View style={[styles.skeletonLineContainer, styles.skeletonHeader]}>
    <View style={[styles.skeletonLineBase, styles.skeletonHeaderInner]} />
    <ShimmerEffect />
  </View>
);

const SkeletonText = () => (
  <View style={[styles.skeletonLineContainer, styles.skeletonText]}>
    <View style={[styles.skeletonLineBase, styles.skeletonTextInner]} />
    <ShimmerEffect />
  </View>
);

const SkeletonMetaShort = () => (
  <View style={[styles.skeletonLineContainer, styles.skeletonMetaShort]}>
    <View style={[styles.skeletonLineBase, styles.skeletonMetaShortInner]} />
    <ShimmerEffect />
  </View>
);

const SkeletonMetaLong = () => (
  <View style={[styles.skeletonLineContainer, styles.skeletonMetaLong]}>
    <View style={[styles.skeletonLineBase, styles.skeletonMetaLongInner]} />
    <ShimmerEffect />
  </View>
);

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonIconWrapper}>
      <View style={styles.skeletonEmoji}>
        <ShimmerEffect />
      </View>
    </View>
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonHeaderRow}>
        <SkeletonHeader />
      </View>
      <View style={{ marginBottom: 10 }}>
        <SkeletonText />
      </View>
      <View style={styles.skeletonMetaRow}>
        <SkeletonMetaShort />
        <SkeletonMetaLong />
      </View>
    </View>
  </View>
);

const SkeletonButton = () => (
  <View style={styles.skeletonButtonContainer}>
    <View style={styles.skeletonButton}>
      <ShimmerEffect />
    </View>
  </View>
);

// ================================================================= //
// ======================   COMPONENTE PRINCIPAL   ================= //
// ================================================================= //

type Props = NativeStackScreenProps<RootStackParamList, "PedidosPendentes">;

export default function PedidosPendentesScreen({ navigation }: Props) {
  const [pedidos, setPedidos] = useState<DetalhePedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Paginação
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const [pageSize] = useState(100);
  const [hasMore, setHasMore] = useState(true);

  // Filtros
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("MES_ATUAL");
  const [nunotaFiltro, setNunotaFiltro] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [aplicandoFiltros, setAplicandoFiltros] = useState(false);
  const [limpandoFiltros, setLimpandoFiltros] = useState(false);

  // Polling control
  const [pollingEnabled, setPollingEnabled] = useState(true);

  // Anti-race
  const reqSeqRef = useRef(0);

  // Cache local (extra segurança, mas sua API já mantém cache) :contentReference[oaicite:2]{index=2}
  const lastOkRef = useRef<DetalhePedido[]>([]);
  const lastOkAtRef = useRef<number>(0);

  // Estado de foco/app
  const isFocusedRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Loop control
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const backoffLevelRef = useRef(0); // 0..6

  // Skeletons
  const skeletonCount = 6;
  const skeletonData = useMemo(() => Array.from({ length: skeletonCount }, (_, i) => i), []);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const montarFiltro = (pagina: number): FiltroPedidosPendentes => {
    const { dataIni, dataFim } = getDateRange(periodoFiltro);

    const nunota =
      nunotaFiltro.trim().length > 0 && !isNaN(Number(nunotaFiltro))
        ? Number(nunotaFiltro)
        : null;

    return {
      page: pagina,
      pageSize,
      status: statusFiltro,
      dataIni,
      dataFim,
      nunota,
    };
  };

const carregarPagina = useCallback(
  async (novaPagina: number, origem: "poll" | "manual" = "manual") => {
    // ✅ PRIMEIRO: regras de bloqueio (sem mexer no seq)
    if (origem === "poll") {
      if (loading) return;
      if (aplicandoFiltros) return;
      if (limpandoFiltros) return;
      if (refreshing) return;
    }

    // ✅ SÓ AGORA incrementa o seq (vai realmente fazer request)
    const seq = ++reqSeqRef.current;

    const manterListaAtual = (motivo: string) => {
      console.log(`[PEDIDOS] Mantendo lista atual (${motivo})`, {
        atual: pedidos.length,
        lastOk: lastOkRef.current.length,
        lastOkAgeMs: lastOkAtRef.current ? Date.now() - lastOkAtRef.current : null,
      });
    };

    try {
      if (origem === "manual") {
        if (novaPagina === 0) setLoading(true);
      }

      setErro(null);

      const filtro = montarFiltro(novaPagina);
      const lista = await buscarPedidosPendentes(filtro);

      // ✅ se outra request mais nova começou, ignora esta
      if (seq !== reqSeqRef.current) return;

      const isEmpty = !lista || lista.length === 0;

      if (origem === "poll" && isEmpty && (pedidos.length > 0 || lastOkRef.current.length > 0)) {
        manterListaAtual("poll retornou vazio (provável intermitência)");
        return;
      }

      setPedidos(lista);
      lastOkRef.current = lista;
      lastOkAtRef.current = Date.now();

      setPage(novaPagina);
      pageRef.current = novaPagina;

      setHasMore(lista.length > 0);
    } catch (e: any) {
      if (seq !== reqSeqRef.current) return;

      setErro(isOfflineError(e) ? "Você está offline." : "Erro ao atualizar. Mantendo pedidos.");
      manterListaAtual("erro na request");
    } finally {
      if (seq !== reqSeqRef.current) return;

      if (origem === "manual") {
        setLoading(false);
        setRefreshing(false);
        setAplicandoFiltros(false);
        setLimpandoFiltros(false);
      }
    }
  },
  [pageSize, statusFiltro, periodoFiltro, nunotaFiltro, loading, aplicandoFiltros, limpandoFiltros, refreshing, pedidos.length]
);


  // 1) Primeiro carregamento
  useEffect(() => {
    carregarPagina(0, "manual");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Listener de foco/blur (pra “quase real-time” sem depender de clique)
  useEffect(() => {
    const onFocus = () => {
      isFocusedRef.current = true;
      // puxa imediato ao focar/voltar
      if (!showFilters) setPollingEnabled(true);
      // “kick” imediato
      kickPolling("focus");
    };

    const onBlur = () => {
      isFocusedRef.current = false;
      // não precisa ficar martelando fora de foco
    };

    const unsubFocus = navigation.addListener("focus", onFocus);
    const unsubBlur = navigation.addListener("blur", onBlur);

    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation, showFilters]);

  // 3) AppState (pausa em background e dá kick ao voltar)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // voltou pro foreground
      if (prev.match(/inactive|background/) && nextState === "active") {
        kickPolling("app-active");
      }
    });

    return () => sub.remove();
  }, []);

  // Helpers polling
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const computeIntervalMs = () => {
    // Base “real-time”
    const FAST = 2000;   // 2s (tela ativa)
    const SLOW = 9000;   // 9s (quando não dá pra ficar batendo muito)
    const MAX = 30000;

    const appActive = appStateRef.current === "active";
    const focused = isFocusedRef.current;

    // se não tá ativo/focado, desacelera bastante
    let base = appActive && focused ? FAST : SLOW;

    // se usuário está mexendo em filtros/paginação/refresh, desacelera um pouco
    if (showFilters || aplicandoFiltros || limpandoFiltros || refreshing) {
      base = SLOW;
    }

    // backoff: 0..6 => 1x,2x,4x...
    const mul = Math.pow(2, Math.min(backoffLevelRef.current, 6));
    return Math.min(MAX, base * mul);
  };

const shouldPollNow = () => {
  if (!pollingEnabled) return false;
  if (!isFocusedRef.current) return false;
  if (appStateRef.current !== "active") return false;
  if (showFilters) return false;

  // ✅ BLOQUEIOS IMPORTANTES
  if (loading) return false;
  if (refreshing) return false;
  if (aplicandoFiltros) return false;
  if (limpandoFiltros) return false;

  return true;
};


  const runPollOnce = async () => {
    if (!shouldPollNow()) return;

    // não empilha
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      // polling sempre na página atual
      await carregarPagina(pageRef.current, "poll");

      // sucesso: zera backoff
      backoffLevelRef.current = 0;
    } catch {
      // (quase nunca cai aqui, porque carregarPagina já trata)
      backoffLevelRef.current = Math.min(backoffLevelRef.current + 1, 6);
    } finally {
      inFlightRef.current = false;
    }
  };

  const scheduleNext = () => {
    clearTimer();
    const ms = computeIntervalMs();
    timerRef.current = setTimeout(async () => {
      await runPollOnce();
      scheduleNext();
    }, ms);
  };

  const kickPolling = (reason: string) => {
    // kick = faz 1 poll agora e re-agenda o loop
    console.log("[POLL] kick:", reason);
    clearTimer();
    (async () => {
      await runPollOnce();
      scheduleNext();
    })();
  };

  // 4) Inicia o loop e mantém reagendando conforme flags mudam
  useEffect(() => {
    // sempre que essas flags mudarem, re-planeja
    kickPolling("deps-change");
    return () => {
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pollingEnabled,
    showFilters,
    aplicandoFiltros,
    limpandoFiltros,
    refreshing,
    statusFiltro,
    periodoFiltro,
    nunotaFiltro,
    page, // se muda página, queremos “kick” imediato
  ]);

  // Refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    setPollingEnabled(false);
    await carregarPagina(0, "manual");
    setPollingEnabled(true);
  };

  // Aplicar / Limpar Filtros
  const handleAplicarFiltros = async () => {
    setAplicandoFiltros(true);
    setHasMore(true);
    setPollingEnabled(false);
    await carregarPagina(0, "manual");
    setShowFilters(false);
    setPollingEnabled(true);
  };

  const handleLimparFiltros = async () => {
    setLimpandoFiltros(true);
    setHasMore(true);
    setPollingEnabled(false);

    try {
      setNunotaFiltro("");
      setStatusFiltro(null);
      setPeriodoFiltro("MES_ATUAL");
      await carregarPagina(0, "manual");
      setShowFilters(false);
    } finally {
      setPollingEnabled(true);
    }
  };

  // Paginação
  const handleIrPaginaAnterior = async () => {
    if (page === 0 || loading) return;
    setPollingEnabled(false);
    await carregarPagina(page - 1, "manual");
    setPollingEnabled(true);
  };

  const handleIrProximaPagina = async () => {
    if (!hasMore || loading) return;
    setPollingEnabled(false);
    await carregarPagina(page + 1, "manual");
    setPollingEnabled(true);
  };

  // Lista (sem filtro local)
  const pedidosFiltrados = pedidos;

  // SKELETON
  if (loading && pedidos.length === 0) {
    return (
      <View style={styles.container}>
        <Navbar title="Fila de Conferência" onLogout={handleLogout} />

        <View style={styles.filtersToggleRow}>
          <SkeletonButton />
        </View>

        <FlatList
          data={skeletonData}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={styles.listContent}
          renderItem={() => <SkeletonCard />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navbar title="Fila de Conferência" onLogout={handleLogout} />

      {/* Botão de filtros */}
      <View style={styles.filtersToggleRow}>
        <TouchableOpacity
          style={styles.filterToggleButton}
          onPress={() =>
            setShowFilters((prev) => {
              const novo = !prev;
              setPollingEnabled(!novo);
              return novo;
            })
          }
        >
          <MaterialCommunityIcons name="filter-variant" size={20} color="#111827" style={{ marginRight: 6 }} />
          <Text style={styles.filterToggleText}>{showFilters ? "Fechar" : "Filtrar"}</Text>
        </TouchableOpacity>
      </View>

      {/* Erro sem sumir lista */}
      {erro && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ color: "#B91C1C", fontWeight: "600" }}>{erro}</Text>
        </View>
      )}

      {/* FILTROS */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.filterChipsRow}>
            {statusOptions.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.chip, statusFiltro === opt.value && styles.chipActive]}
                onPress={() => setStatusFiltro(opt.value)}
              >
                <Text style={[styles.chipText, statusFiltro === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.filterLabel}>NUNOTA</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Ex: 15840"
              keyboardType="numeric"
              value={nunotaFiltro}
              onChangeText={(text) => {
                setNunotaFiltro(text);
                setPollingEnabled(false);
              }}
            />
          </View>

          <View style={styles.filterActionsRow}>
            <TouchableOpacity
              style={[styles.clearButton, (limpandoFiltros || aplicandoFiltros) && styles.clearButtonDisabled]}
              onPress={handleLimparFiltros}
              disabled={limpandoFiltros || aplicandoFiltros}
            >
              {limpandoFiltros && <ActivityIndicator size="small" color="#374151" style={{ marginRight: 6 }} />}
              <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyButton} onPress={handleAplicarFiltros} disabled={aplicandoFiltros}>
              {aplicandoFiltros && <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />}
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* LISTA */}
      <FlatList
        data={pedidosFiltrados}
        keyExtractor={(item) => String(item.nunota)}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={{ marginTop: 20 }}>
            {loading && pedidos.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                {[1, 2, 3].map((item) => (
                  <SkeletonCard key={`skeleton-footer-${item}`} />
                ))}
              </View>
            )}

            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
                disabled={page === 0}
                onPress={handleIrPaginaAnterior}
              >
                <Text style={styles.pageButtonText}>Anterior</Text>
              </TouchableOpacity>

              <Text style={styles.paginationText}>Página {page + 1}</Text>

              <TouchableOpacity
                style={[styles.pageButton, !hasMore && styles.pageButtonDisabled]}
                disabled={!hasMore}
                onPress={handleIrProximaPagina}
              >
                <Text style={styles.pageButtonText}>Próxima</Text>
              </TouchableOpacity>
            </View>

            {pedidosFiltrados.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📦</Text>
                <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const status = item.statusConferencia;
          const colors = statusColors[status] || statusColors.AL;
          const qtdItens = item.itens ? item.itens.length : 0;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("DetalhePedido", { detalhePedido: item })}
            >
              <View style={styles.cardIconWrapper}>
                <Text style={styles.cardEmoji}>📦</Text>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.pedidoNumber}>Pedido #{item.nunota}</Text>
                </View>

                <Text style={styles.pedidoCliente} numberOfLines={1}>
                  {item.nomeParc}
                </Text>

                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMetaText}>{qtdItens} item(s)</Text>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        maxWidth: 160,
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: colors.text }]} />
                    <Text
                      style={[styles.statusText, { color: colors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {statusMap[status]}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ------------------- STYLES -------------------------------- //

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },

  filtersToggleRow: { paddingHorizontal: 16, paddingTop: 8 },
  filterToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  filterToggleText: { fontSize: 13, fontWeight: "500", color: "#111827" },

  filtersContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  filterLabel: { fontSize: 12, marginBottom: 4, color: "#6B7280", fontWeight: "500" },
  filterChipsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginRight: 8,
    marginBottom: 6,
  },
  chipActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  chipText: { fontSize: 12, color: "#374151" },
  chipTextActive: { color: "#FFFFFF", fontWeight: "600" },

  searchInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    fontSize: 13,
    color: "#111827",
  },

  filterActionsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  clearButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
  },
  clearButtonDisabled: { opacity: 0.5 },
  clearButtonText: { fontSize: 13, color: "#374151" },
  applyButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  applyButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    marginBottom: 18,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardIconWrapper: { marginRight: 14 },
  cardEmoji: { fontSize: 40 },
  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  pedidoNumber: { fontWeight: "700", fontSize: 19, color: "#111827" },
  pedidoCliente: { fontSize: 15, color: "#6B7280", marginBottom: 10 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardMetaText: { fontSize: 14, color: "#4B5563" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusDot: { width: 8, height: 8, borderRadius: 999, marginRight: 6 },
  statusText: { fontWeight: "600", fontSize: 12, flexShrink: 1 },

  paginationRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, alignItems: "center" },
  pageButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pageButtonDisabled: { opacity: 0.4 },
  pageButtonText: { fontWeight: "600", fontSize: 13, color: "#111827" },
  paginationText: { fontWeight: "600", color: "#4B5563", fontSize: 13 },

  emptyState: { marginTop: 40, alignItems: "center" },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: 16, marginTop: 8, fontWeight: "600", color: "#6B7280" },

  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    overflow: "hidden",
  },
  skeletonIconWrapper: { marginRight: 14 },
  skeletonEmoji: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    position: "relative",
  },
  skeletonContent: { flex: 1 },
  skeletonHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  skeletonMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 60,
    height: "200%",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    transform: [{ rotate: "20deg" }],
  },

  skeletonLineContainer: { borderRadius: 4, overflow: "hidden", position: "relative" },
  skeletonLineBase: { backgroundColor: "#E5E7EB", borderRadius: 4 },

  skeletonHeader: { width: "40%" as DimensionValue, height: 16 },
  skeletonHeaderInner: { width: "100%" as DimensionValue, height: 16 },

  skeletonText: { width: "70%" as DimensionValue, height: 16 },
  skeletonTextInner: { width: "100%" as DimensionValue, height: 16 },

  skeletonMetaShort: { width: "30%" as DimensionValue, height: 16 },
  skeletonMetaShortInner: { width: "100%" as DimensionValue, height: 16 },

  skeletonMetaLong: { width: "35%" as DimensionValue, height: 16 },
  skeletonMetaLongInner: { width: "100%" as DimensionValue, height: 16 },

  skeletonButtonContainer: { alignSelf: "flex-start" },
  skeletonButton: {
    width: 80,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    overflow: "hidden",
    position: "relative",
  },
});
