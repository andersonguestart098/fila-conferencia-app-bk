// src/screens/DetalhePedidoScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { DetalhePedido } from "../api/types/conferencia";
import { iniciarConferencia } from "../api/conferencia";
import Navbar from "../components/Navbar";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<RootStackParamList, "DetalhePedido">;

const COD_USUARIO_EXEMPLO = 42;

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

export default function DetalhePedidoScreen({ route, navigation }: Props) {
  const { detalhePedido } = route.params;

  const [detalhe] = useState<DetalhePedido>(detalhePedido);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [modalEmAndamentoVisivel, setModalEmAndamentoVisivel] =
    useState(false);

  const executarInicioConferencia = async () => {
    try {
      setLoading(true);
      setErro(null);

      const resp = await iniciarConferencia(detalhe.nunota, COD_USUARIO_EXEMPLO);

      navigation.navigate("Conferencia", {
        detalhePedido: detalhe,
        nuconf: resp.nuconf,
      });
    } catch (e) {
      console.error(e);
      setErro("Erro ao iniciar conferência.");
    } finally {
      setLoading(false);
    }
  };

  const handleIrParaConferencia = () => {
    // Se já está em andamento, mostra modal elegante
    if (detalhe.statusConferencia === "A") {
      setModalEmAndamentoVisivel(true);
    } else {
      executarInicioConferencia();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.center}>
        <Text>{erro}</Text>
      </View>
    );
  }

  if (!detalhe) {
    return (
      <View style={styles.center}>
        <Text>Nenhum detalhe encontrado.</Text>
      </View>
    );
  }

  const totalItens = detalhe.itens.length;
  const totalQuantidade = detalhe.itens.reduce(
    (acc, item) => acc + (item.qtdNeg ?? 0),
    0
  );

  const itensResumo = detalhe.itens.slice(0, 10);
  const itensRestantes = totalItens - itensResumo.length;

  const statusDescricao =
    statusMap[detalhe.statusConferencia] ||
    detalhe.statusConferencia ||
    "-";

  // 🔒 Regras de bloqueio do botão
  const isFinalizadaOk = detalhe.statusConferencia === "F";
  const isAguardandoCorte = detalhe.statusConferencia === "C"; // C = aguardando liberação de corte
  const botaoDesabilitado = isFinalizadaOk || isAguardandoCorte;

  const nomeParc = (detalhe as any).nomeParc;

  return (
    <View style={styles.container}>
      {/* 🔥 Navbar no topo */}
      <Navbar title={`Pedido #${detalhe.nunota}`} showBack />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Status: {statusDescricao}</Text>
          <Text style={styles.label}>Total de itens: {totalItens}</Text>
          <Text style={styles.label}>
            Total de quantidade: {totalQuantidade}
          </Text>

          {/* RESUMO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo dos produtos</Text>

            {itensResumo.map((item) => (
              <View
                key={`${item.sequencia}-${item.codProd}`}
                style={styles.prodRow}
              >
                <Text style={styles.prodMain}>
                  {item.codProd} · {item.descricao}
                </Text>
                <Text style={styles.prodQty}>Qtd: {item.qtdNeg}</Text>
              </View>
            ))}

            {itensRestantes > 0 && (
              <Text style={styles.moreText}>+ {itensRestantes} itens...</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* BOTÃO FIXO */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            botaoDesabilitado && styles.buttonDisabled,
          ]}
          onPress={!botaoDesabilitado ? handleIrParaConferencia : undefined}
          disabled={botaoDesabilitado}
        >
          <Text style={styles.buttonText}>
            {isFinalizadaOk
              ? "Conferência finalizada"
              : isAguardandoCorte
              ? "Aguardando liberação de corte"
              : "Iniciar Conferência"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Modal branco para "Conferência em andamento" */}
      {modalEmAndamentoVisivel && (
        <View style={styles.fullscreenOverlay}>
          <View style={styles.overlayBox}>
            <Ionicons
              name="time-outline"
              size={40}
              color="#F59E0B"
            />
            <Text style={styles.overlayText}>Conferência em andamento</Text>
            <Text style={styles.overlaySubText}>
              Pedido #{detalhe.nunota}
              {nomeParc ? ` · ${nomeParc}` : ""}
            </Text>
            <Text style={styles.overlaySubText}>
              Já existe uma conferência em andamento para este pedido.{"\n"}
              Você deseja continuar mesmo assim?
            </Text>

            <View style={styles.overlayActionsRow}>
              <TouchableOpacity
                style={styles.overlayButtonSecondary}
                activeOpacity={0.85}
                onPress={() => setModalEmAndamentoVisivel(false)}
              >
                <Text style={styles.overlayButtonTextSecondary}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.overlayButton}
                activeOpacity={0.85}
                onPress={() => {
                  setModalEmAndamentoVisivel(false);
                  executarInicioConferencia();
                }}
              >
                <Text style={styles.overlayButtonText}>
                  Continuar assim mesmo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    elevation: 2,
  },
  label: { fontSize: 14, marginBottom: 4 },

  section: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },

  prodRow: {
    marginBottom: 6,
  },
  prodMain: {
    fontSize: 14,
    fontWeight: "500",
  },
  prodQty: {
    fontSize: 12,
    color: "#555",
  },
  moreText: {
    marginTop: 4,
    fontSize: 12,
    color: "#888",
  },

  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
  },
  button: {
    backgroundColor: "#66CC66",
    padding: 16,
    borderRadius: 999,
    alignItems: "center",
    elevation: 3,
    bottom: 60,
  },
  buttonDisabled: {
    backgroundColor: "#CBD5E1",
    elevation: 0,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // 🔄 modal branco padrão
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    backgroundColor: "transparent",
  },
  overlayBox: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    width: "78%",
    elevation: 4,
  },
  overlayText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  overlaySubText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    color: "#555",
  },
  overlayActionsRow: {
    flexDirection: "row",
    marginTop: 16,
    width: "100%",
  },
  overlayButton: {
    flex: 1,
    backgroundColor: "#66CC66",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    marginLeft: 6,
  },
  overlayButtonSecondary: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    marginRight: 6,
  },
  overlayButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
  overlayButtonTextSecondary: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
});
