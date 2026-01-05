// src/screens/ConferenciaScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  DetalhePedido,
  ItemConferenciaUI,
} from "../api/types/conferencia";
import {
  finalizarConferencia,
  finalizarConferenciaDivergente,
} from "../api/conferencia";
import Navbar from "../components/Navbar";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<RootStackParamList, "Conferencia">;

const COD_USUARIO_EXEMPLO = 42; // depois pega do login/autenticação

export default function ConferenciaScreen({ route, navigation }: Props) {
  const { detalhePedido, nuconf } = route.params;

  // helper pra pegar a qtd "esperada" base (original)
  const getQtdBase = (item: ItemConferenciaUI): number => {
    return (item as any).qtdOriginal ?? item.qtdNeg ?? 0;
  };

  const [itens, setItens] = useState<ItemConferenciaUI[]>(
    detalhePedido.itens.map((item) => {
      const qtdBase = getQtdBase(item as any);
      return {
        ...item,
        qtdConferida: qtdBase,
        conferido: false,
      };
    })
  );

  const [salvando, setSalvando] = useState(false);
  const [modalDivergenteVisivel, setModalDivergenteVisivel] = useState(false);
  const [modalSucessoVisivel, setModalSucessoVisivel] = useState(false);

  const toggleConferido = (codProd: number, sequencia: number) => {
    setItens((prev) =>
      prev.map((item) =>
        item.codProd === codProd && item.sequencia === sequencia
          ? { ...item, conferido: !item.conferido }
          : item
      )
    );
  };

  const atualizarQuantidade = (
    codProd: number,
    sequencia: number,
    valor: string
  ) => {
    const numero = Number(valor.replace(",", "."));
    setItens((prev) =>
      prev.map((item) =>
        item.codProd === codProd && item.sequencia === sequencia
          ? { ...item, qtdConferida: isNaN(numero) ? 0 : numero }
          : item
      )
    );
  };

  // ✅ marcar todos como conferidos
  const marcarTodosComoConferidos = () => {
    setItens((prev) =>
      prev.map((item) => {
        const base = getQtdBase(item);
        const qtdAtual =
          item.qtdConferida === undefined || item.qtdConferida === null
            ? base
            : item.qtdConferida;
        return {
          ...item,
          conferido: true,
          qtdConferida: qtdAtual,
        };
      })
    );
  };

  // todos os itens precisam estar conferidos p/ liberar o botão de finalizar
  const todosConferidos =
    itens.length > 0 && itens.every((i) => i.conferido === true);

  // 🔍 existe algum item ainda não conferido? (pra habilitar o botão geral)
  const existeNaoConferido = itens.some((i) => !i.conferido);

  // 🚨 existe algum item com qtdConferida > qtdBase?
  const existeQtdMaior = itens.some((i) => {
    const base = getQtdBase(i);
    return (i.qtdConferida ?? 0) > base;
  });

  // 🔴 saber se a conferência atual tem corte/divergente
  const temDivergente = itens.some(
    (i) => (i.qtdConferida ?? 0) < getQtdBase(i)
  );

  const handleFinalizar = async () => {
    if (!todosConferidos) {
      Alert.alert(
        "Atenção",
        "Marque todos os itens como conferidos antes de finalizar."
      );
      return;
    }

    if (existeQtdMaior) {
      Alert.alert(
        "Atenção",
        "Há itens com quantidade conferida MAIOR que a quantidade do pedido.\n\nAjuste para a quantidade do pedido ou menor antes de finalizar."
      );
      return;
    }

    try {
      setSalvando(true);

      console.log(
        "[ConferenciaScreen] Iniciando finalização",
        JSON.stringify(
          {
            nuconf,
            nunotaOrig: detalhePedido.nunota,
            temDivergente,
            tipoFinalizacao: temDivergente ? "DIVERGENTE" : "NORMAL",
            itens,
          },
          null,
          2
        )
      );

      if (temDivergente) {
        // 🔴 Tem corte → chama rota divergente
        await finalizarConferenciaDivergente(
          nuconf,
          COD_USUARIO_EXEMPLO,
          detalhePedido.nunota,
          itens
        );
        console.log(
          "[ConferenciaScreen] Finalização DIVERGENTE - nuconf:",
          nuconf
        );

        // Ao invés de Alert, abre modal branco elegante
        setModalDivergenteVisivel(true);
      } else {
        // ✅ Sem corte → chama rota normal (/finalizar)
        await finalizarConferencia(nuconf, COD_USUARIO_EXEMPLO);
        console.log(
          "[ConferenciaScreen] Finalização NORMAL - nuconf:",
          nuconf
        );

        // Modal branco de sucesso com check verde
        setModalSucessoVisivel(true);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Erro ao finalizar conferência.");
    } finally {
      setSalvando(false);
    }
  };

  const renderItem = ({ item }: { item: ItemConferenciaUI }) => {
    const qtdBase = getQtdBase(item);
    const qtdConferidaNum = item.qtdConferida ?? 0;
    const qtdMaior = qtdConferidaNum > qtdBase;

    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={[
            styles.checkCircle,
            item.conferido && styles.checkCircleOn,
          ]}
          onPress={() => toggleConferido(item.codProd, item.sequencia)}
        >
          {item.conferido && (
            <Ionicons name="checkmark" size={18} color="#fff" />
          )}
        </TouchableOpacity>

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>
            Cod: {item.codProd} - {item.descricao}
          </Text>

          <Text style={styles.itemSubtitle}>Seq: {item.sequencia}</Text>

          <Text style={[styles.itemSubtitle, { fontWeight: "bold" }]}>
            Esperado: {qtdBase}{" "}
            <Text style={{ fontWeight: "bold" }}>{item.unidade}</Text>
          </Text>

          {qtdMaior && (
            <View style={styles.alertRow}>
              <Ionicons
                name="alert-circle"
                size={16}
                color="#FF9800"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.alertText}>
                Quantidade conferida maior que a do pedido.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.qtdContainer}>
          <Text style={styles.qtdLabel}>
            Qtd conf. (
            <Text style={{ fontWeight: "bold" }}>{item.unidade}</Text>)
          </Text>

          <TextInput
            style={[
              styles.qtdInput,
              qtdMaior && styles.qtdInputErro,
            ]}
            keyboardType="numeric"
            value={String(qtdConferidaNum)}
            onChangeText={(text) =>
              atualizarQuantidade(item.codProd, item.sequencia, text)
            }
          />
        </View>
      </View>
    );
  };

  const numeroExibicao =
    (detalhePedido as any).numNota ?? detalhePedido.nunota;
  const nomeParc = (detalhePedido as any).nomeParc;

  const buttonDisabled = salvando || !todosConferidos || existeQtdMaior;

  return (
    <View style={styles.container}>
      <Navbar title="Conferência" showBack />

      {/* 🔄 Modal branco enquanto está salvando (sempre a mesma frase) */}
      {salvando && (
        <View style={styles.fullscreenOverlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color="#66CC66" />
            <Text style={styles.overlayText}>Finalizando conferência...</Text>
            <Text style={styles.overlaySubText}>
              Pedido #{numeroExibicao}
              {nomeParc ? ` · ${nomeParc}` : ""}
            </Text>
          </View>
        </View>
      )}

      {/* ✅ Modal branco após finalização DIVERGENTE */}
      {modalDivergenteVisivel && (
        <View style={styles.fullscreenOverlay}>
          <View style={styles.overlayBox}>
            <Ionicons
              name="alert-circle-outline"
              size={40}
              color="#FF9800"
            />
            <Text style={styles.overlayText}>Conferência divergente</Text>
            <Text style={styles.overlaySubText}>
              Pedido #{numeroExibicao}
              {nomeParc ? ` · ${nomeParc}` : ""}
            </Text>
            <Text style={styles.overlaySubText}>
              Por favor, conclua o corte dos itens pela interface de
              conferência da Sankhya antes de faturar o pedido.
            </Text>

            <TouchableOpacity
              style={styles.overlayButton}
              activeOpacity={0.85}
              onPress={() => {
                setModalDivergenteVisivel(false);
                navigation.popToTop();
              }}
            >
              <Text style={styles.overlayButtonText}>OK, entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ✅ Modal branco após finalização NORMAL (ok) */}
      {modalSucessoVisivel && (
        <View style={styles.fullscreenOverlay}>
          <View style={styles.overlayBox}>
            <Ionicons
              name="checkmark-circle"
              size={40}
              color="#66CC66"
            />
            <Text style={styles.overlayText}>Conferência finalizada</Text>
            <Text style={styles.overlaySubText}>
              Pedido #{numeroExibicao}
              {nomeParc ? ` · ${nomeParc}` : ""}
            </Text>
            <Text style={styles.overlaySubText}>
              A conferência foi finalizada com sucesso.
            </Text>

            <TouchableOpacity
              style={styles.overlayButton}
              activeOpacity={0.85}
              onPress={() => {
                setModalSucessoVisivel(false);
                navigation.popToTop();
              }}
            >
              <Text style={styles.overlayButtonText}>OK, continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.header}>Pedido #{numeroExibicao}</Text>

        {nomeParc && <Text style={styles.subHeader}>{nomeParc}</Text>}

        {/* 🔘 Botão para marcar todos como conferidos */}
        <View style={styles.bulkActionsRow}>
          <TouchableOpacity
            style={[
              styles.bulkButton,
              !existeNaoConferido && styles.bulkButtonDisabled,
            ]}
            onPress={marcarTodosComoConferidos}
            disabled={!existeNaoConferido || salvando}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-done"
              size={18}
              color={existeNaoConferido ? "#FFFFFF" : "#E5E7EB"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.bulkButtonText,
                !existeNaoConferido && styles.bulkButtonTextDisabled,
              ]}
            >
              Marcar todos como conferidos
            </Text>
          </TouchableOpacity>
        </View>

        {existeQtdMaior && (
          <View style={styles.globalAlertBox}>
            <Ionicons
              name="alert-circle"
              size={18}
              color="#FF9800"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.globalAlertText}>
              Ajuste as quantidades marcadas em laranja: não é permitido
              informar quantidade maior que a do pedido.
            </Text>
          </View>
        )}

        <FlatList
          data={itens}
          keyExtractor={(item) =>
            `${detalhePedido.nunota}-${item.sequencia}-${item.codProd}`
          }
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, buttonDisabled && styles.buttonDisabled]}
        onPress={handleFinalizar}
        disabled={buttonDisabled}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {salvando ? "Finalizando conferência..." : "Finalizar Conferência"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: {
    flex: 1,
    padding: 16,
  },
  header: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subHeader: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },

  // 🔘 estilos do botão "marcar todos"
  bulkActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 8,
  },
  bulkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#66CC66",
  },
  bulkButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  bulkButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  bulkButtonTextDisabled: {
    color: "#E5E7EB",
  },

  globalAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFEEBA",
  },
  globalAlertText: {
    flex: 1,
    fontSize: 12,
    color: "#856404",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#66CC66",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#ffffff",
  },
  checkCircleOn: {
    backgroundColor: "#66CC66",
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontWeight: "bold" },
  itemSubtitle: { fontSize: 12, color: "#555" },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  alertText: {
    fontSize: 11,
    color: "#FF9800",
  },
  qtdContainer: { alignItems: "center", marginLeft: 8 },
  qtdLabel: { fontSize: 12, marginBottom: 4 },
  qtdInput: {
    width: 90,
    height: 38,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 8,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  qtdInputErro: {
    borderColor: "#FF9800",
    borderWidth: 2,
  },

  // 🔄 modal branco (sem fundo escuro)
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
  overlayButton: {
    marginTop: 16,
    backgroundColor: "#66CC66",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  overlayButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  button: {
    position: "absolute",
    bottom: 60,
    left: 16,
    right: 16,
    backgroundColor: "#66CC66",
    padding: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    flexDirection: "row",
  },
  buttonDisabled: {
    backgroundColor: "#A3E0A3",
    opacity: 0.7,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
