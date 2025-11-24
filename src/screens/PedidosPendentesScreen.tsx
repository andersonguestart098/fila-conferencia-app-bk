import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { DetalhePedido } from "../api/types/conferencia";
import { buscarPedidosPendentes } from "../api/conferencia";
import Navbar from "../components/Navbar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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

export default function PedidosPendentesScreen({ navigation }: Props) {
  const [pedidos, setPedidos] = useState<DetalhePedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        setLoading(true);
        const atualizados = await buscarPedidosPendentes();
        if (ativo) setPedidos(atualizados);
      } catch (e) {
        console.log("Erro ao carregar pedidos:", e);
        if (ativo) setErro("Erro ao carregar pedidos.");
      } finally {
        if (ativo) setLoading(false);
      }
    };

    carregar();

    const interval = setInterval(async () => {
      try {
        const atualizados = await buscarPedidosPendentes();
        if (ativo) setPedidos(atualizados);
      } catch {}
    }, 5000);

    return () => {
      ativo = false;
      clearInterval(interval);
    };
  }, []);

  const handlePressPedido = (pedido: DetalhePedido) => {
    navigation.navigate("DetalhePedido", { detalhePedido: pedido });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{erro}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navbar title="Conferência" showBack={false} />

      <FlatList
        data={pedidos}
        keyExtractor={(item) => String(item.nunota)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const emConferencia =
            item.statusConferencia === "A" && !!item.nomeConferente;

          const statusDescricao =
            statusMap[item.statusConferencia] || "-";

          const colors =
            statusColors[item.statusConferencia] || statusColors.AL;

          return (
            <TouchableOpacity
              style={[
                styles.card,
                emConferencia && styles.cardEmConferencia,
              ]}
              onPress={() => handlePressPedido(item)}
              activeOpacity={0.85}
            >
              {/* Linha superior: ícone de caixa + número do pedido + avatar */}
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
                    <Text style={styles.pedidoNumber}>#{item.nunota}</Text>
                  </View>
                </View>

                {emConferencia && item.avatarUrlConferente && (
                  <Image
                    source={{ uri: item.avatarUrlConferente }}
                    style={styles.avatar}
                  />
                )}
              </View>

              {/* Status em estilo “pill” */}
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

              {/* Linha de informações */}
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

              {/* Aviso de conferência em andamento */}
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>Nenhum pedido pendente</Text>
            <Text style={styles.emptySubtext}>
              Tudo limpo por aqui ✨
            </Text>
          </View>
        }
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
    color: "#D11A2A",
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
    borderColor: "#3B82F6",
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
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  pedidoNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
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
    marginTop: 60,
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
});
