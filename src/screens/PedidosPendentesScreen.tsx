import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  TextInput,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { DetalhePedido } from "../api/types/conferencia";
import { buscarPedidosPendentes } from "../api/conferencia";
import type { FiltroPedidosPendentes } from "../api/conferencia";

import Navbar from "../components/Navbar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { isOfflineError } from "../api/client";
import { logout } from "../api/auth";

type Props = NativeStackScreenProps<RootStackParamList, "PedidosPendentes">;

// Mapa de código → descrição legível
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

// Cores usadas apenas no "badge" de status
const statusColors: Record<
  string,
  { bg: string; border: string; text: string }
> = {
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

// opções de status para o filtro
const statusOptions: { label: string; value: string | null }[] = [
  { label: "Todos", value: null },
  { label: "Em andamento", value: "A" },
  { label: "Aguard. conf.", value: "AC" },
  { label: "Aguard. liberação", value: "AL" },
  { label: "Finalizada OK", value: "F" },
  { label: "Divergente", value: "D" },
];

// tipos de período pro filtro de data
type PeriodoFiltro = "MES_ATUAL" | "HOJE" | "7_DIAS" | "30_DIAS";

// helper p/ formatar data ISO 'YYYY-MM-DD'
const formatDate = (d: Date): string => d.toISOString().slice(0, 10);

function getDateRange(periodo: PeriodoFiltro): {
  dataIni: string | null;
  dataFim: string | null;
} {
  const hoje = new Date();

  if (periodo === "MES_ATUAL") {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    return {
      dataIni: formatDate(ini),
      dataFim: formatDate(fim),
    };
  }

  const fim = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate()
  );

  if (periodo === "HOJE") {
    const ini = fim;
    return {
      dataIni: formatDate(ini),
      dataFim: formatDate(fim),
    };
  }

  if (periodo === "7_DIAS") {
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - 6);
    return {
      dataIni: formatDate(ini),
      dataFim: formatDate(fim),
    };
  }

  if (periodo === "30_DIAS") {
    const ini = new Date(fim);
    ini.setDate(ini.getDate() - 29);
    return {
      dataIni: formatDate(ini),
      dataFim: formatDate(fim),
    };
  }

  return { dataIni: null, dataFim: null };
}

export default function PedidosPendentesScreen({ navigation }: Props) {
  const [pedidos, setPedidos] = useState<DetalhePedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  // filtros atuais
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [periodoFiltro, setPeriodoFiltro] =
    useState<PeriodoFiltro>("MES_ATUAL");
  const [nunotaFiltro, setNunotaFiltro] = useState<string>("");

  // UI dos filtros
  const [showFilters, setShowFilters] = useState(false);
  const [aplicandoFiltros, setAplicandoFiltros] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  const montarFiltro = (pagina: number): FiltroPedidosPendentes => {
    const { dataIni, dataFim } = getDateRange(periodoFiltro);
    return {
      page: pagina,
      pageSize,
      status: statusFiltro,
      dataIni,
      dataFim,
    };
  };

  const carregarPagina = useCallback(
    async (novaPagina: number) => {
      try {
        setLoading(true);
        setErro(null);

        const filtro = montarFiltro(novaPagina);
        console.log("[DEBUG_FILTRO_ENVIADO]", filtro);

        const lista = await buscarPedidosPendentes(filtro);

        console.log(
          "[DEBUG_PAGINACAO] page=",
          novaPagina,
          "qtdePedidos=",
          lista.length
        );

        setPedidos(lista);
        setPage(novaPagina);
        setHasMore(lista.length > 0);
      } catch (e) {
        console.log("Erro ao carregar pedidos:", e);

        if (isOfflineError(e)) {
          setErro("Você está offline. Verifique sua conexão com a internet.");
        } else {
          setErro("Erro ao carregar pedidos.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setAplicandoFiltros(false);
      }
    },
    [pageSize, statusFiltro, periodoFiltro]
  );

  /**
   * 🔁 Auto-refresh enquanto a tela estiver focada
   * - Recarrega a página atual ao focar
   * - Atualiza a cada 10 segundos SEM mudar a página
   */
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      console.log(
        "[PEDIDOS] Tela focada → iniciando auto-refresh na page",
        page
      );

      // carrega logo na entrada a página atual
      carregarPagina(page);

      const intervalId = setInterval(() => {
        if (!isActive) return;
        console.log(
          "[PEDIDOS] Auto-refresh periódico na page",
          page
        );
        carregarPagina(page);
      }, 10000);

      return () => {
        console.log("[PEDIDOS] Tela desfocada → limpando auto-refresh.");
        isActive = false;
        clearInterval(intervalId);
      };
    }, [carregarPagina, page])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarPagina(0);
  };

  const handleAplicarFiltros = async () => {
    setAplicandoFiltros(true);
    setHasMore(true);
    await carregarPagina(0);
    setShowFilters(false);
  };

  const handleLimparFiltros = async () => {
    setStatusFiltro(null);
    setPeriodoFiltro("MES_ATUAL");
    setNunotaFiltro("");
    setHasMore(true);
    setShowFilters(false);
    await carregarPagina(0);
  };

  const handleIrPaginaAnterior = async () => {
    if (page === 0 || loading) return;
    await carregarPagina(page - 1);
  };

  const handleIrProximaPagina = async () => {
    if (!hasMore || loading) return;
    await carregarPagina(page + 1);
  };

  const handlePressPedido = (pedido: DetalhePedido) => {
    navigation.navigate("DetalhePedido", { detalhePedido: pedido });
  };

  const pedidosFiltrados = nunotaFiltro.trim()
    ? pedidos.filter((p) =>
        String(p.nunota)
          .toLowerCase()
          .includes(nunotaFiltro.trim().toLowerCase())
      )
    : pedidos;

  if (loading && pedidos.length === 0 && !refreshing && !aplicandoFiltros) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (erro && pedidos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{erro}</Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <Text style={styles.refreshButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navbar title="Fila de Conferência" showBack={false} onLogout={handleLogout} />

      {/* Botão de filtros */}
      <View style={styles.filtersToggleRow}>
        <TouchableOpacity
          style={styles.filterToggleButton}
          onPress={() => setShowFilters((old) => !old)}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={20}
            color="#111827"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.filterToggleText}>
            {showFilters ? "Fechar filtros" : "Filtrar"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Painel de filtros (expansível) */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Filtro de status */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterChipsRow}>
              {statusOptions.map((opt) => {
                const ativo = statusFiltro === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.chip, ativo && styles.chipActive]}
                    onPress={() => setStatusFiltro(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        ativo && styles.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Filtro de período */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Período</Text>
            <View style={styles.filterChipsRow}>
              {[
                { label: "Mês atual", value: "MES_ATUAL" as PeriodoFiltro },
                { label: "Hoje", value: "HOJE" as PeriodoFiltro },
                { label: "7 dias", value: "7_DIAS" as PeriodoFiltro },
                { label: "30 dias", value: "30_DIAS" as PeriodoFiltro },
              ].map((opt) => {
                const ativo = periodoFiltro === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.chip, ativo && styles.chipActive]}
                    onPress={() => setPeriodoFiltro(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        ativo && styles.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Filtro por NUNOTA (local) */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Nro único (NUNOTA)</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Ex: 15068"
              keyboardType="numeric"
              value={nunotaFiltro}
              onChangeText={setNunotaFiltro}
            />
          </View>

          {/* Botões dos filtros */}
          <View style={styles.filterActionsRow}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleLimparFiltros}
              activeOpacity={0.8}
            >
              <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleAplicarFiltros}
              disabled={aplicandoFiltros}
              activeOpacity={0.8}
            >
              {aplicandoFiltros && (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
              )}
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={pedidosFiltrados}
        keyExtractor={(item, index) => `${item.nunota}-${index}`}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={
          <View>
            {/* Paginação */}
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  (page === 0 || loading) && styles.pageButtonDisabled,
                ]}
                disabled={page === 0 || loading}
                onPress={handleIrPaginaAnterior}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    (page === 0 || loading) && styles.pageButtonTextDisabled,
                  ]}
                >
                  Anterior
                </Text>
              </TouchableOpacity>

              <View style={styles.paginationCenter}>
                {loading && pedidos.length > 0 && (
                  <ActivityIndicator
                    size="small"
                    color="#6B7280"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.paginationText}>Página {page + 1}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  (!hasMore || loading) && styles.pageButtonDisabled,
                ]}
                disabled={!hasMore || loading}
                onPress={handleIrProximaPagina}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    (!hasMore || loading) && styles.pageButtonTextDisabled,
                  ]}
                >
                  Próxima
                </Text>
              </TouchableOpacity>
            </View>

            {/* Estado vazio */}
            {pedidosFiltrados.length === 0 && !loading && !erro && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📦</Text>
                <Text style={styles.emptyText}>Nenhum pedido pendente</Text>
                <Text style={styles.emptySubtext}>
                  Tudo limpo por aqui ✨
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const emConferencia =
            item.statusConferencia === "A" && !!item.nomeConferente;

          const statusDescricao = statusMap[item.statusConferencia] || "-";
          const colors =
            statusColors[item.statusConferencia] || statusColors.AL;

          const nroUnico = item.nunota;
          const nroNota = item.numNota ?? "-";

          const nomeParcCurto =
            item.nomeParc && item.nomeParc.length > 28
              ? item.nomeParc.slice(0, 28) + "..."
              : item.nomeParc ?? "";

          return (
            <TouchableOpacity
              style={[
                styles.card,
                emConferencia && styles.cardEmConferencia,
              ]}
              onPress={() => handlePressPedido(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={24}
                    color="#4B5563"
                    style={{ marginRight: 10 }}
                  />
                  <View>
                    <Text style={styles.pedidoLabel}>Pedido</Text>
                    <Text style={styles.pedidoNumber} numberOfLines={2}>
                      Nro.Único: #{nroUnico} / Nro.Nota: #{nroNota}
                    </Text>

                    {item.nomeParc && (
                      <Text style={styles.pedidoCliente} numberOfLines={1}>
                        {nomeParcCurto}
                      </Text>
                    )}
                  </View>
                </View>

                {emConferencia && item.avatarUrlConferente && (
                  <Image
                    source={{ uri: item.avatarUrlConferente }}
                    style={styles.avatar}
                  />
                )}
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: colors.text },
                  ]}
                />
                <Text
                  style={[styles.statusText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {statusDescricao}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Itens</Text>
                  <Text style={styles.infoValue}>
                    {item.itens.length}
                  </Text>
                </View>

                {emConferencia && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Conferente</Text>
                    <Text
                      style={styles.infoValueSmall}
                      numberOfLines={1}
                    >
                      {item.nomeConferente}
                    </Text>
                  </View>
                )}
              </View>

              {emConferencia && (
                <View style={styles.conferenteBox}>
                  <Text style={styles.conferenteText}>
                    {item.nomeConferente} está conferindo este pedido
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "black",
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  refreshButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#66CC66",
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  filtersToggleRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filterToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  filtersContainer: {
    marginTop: 6,
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  filterGroup: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: "#66CC66",
    borderColor: "#66CC66",
  },
  chipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    fontSize: 14,
    color: "#111827",
  },
  filterActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  clearButtonText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#66CC66",
  },
  applyButtonText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardEmConferencia: {
    borderColor: "#66CC66",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pedidoLabel: {
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pedidoNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  pedidoCliente: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
  },
  infoItem: {
    maxWidth: "50%",
  },
  infoLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  infoValueSmall: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  conferenteBox: {
    marginTop: 10,
    paddingVertical: 8,
  },
  conferenteText: {
    fontSize: 12,
    color: "#4B5563",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  pageButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  pageButtonTextDisabled: {
    color: "#9CA3AF",
  },
  paginationCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  paginationText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
});
