// src/screens/ConferenciaScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  DetalhePedido,
  ItemConferenciaUI, // 👈 já vem com qtdConferida + conferido
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

  // todos os itens precisam estar conferidos p/ liberar o botão
  const todosConferidos =
    itens.length > 0 && itens.every((i) => i.conferido === true);

  // 🚨 existe algum item com qtdConferida > qtdBase?
  const existeQtdMaior = itens.some((i) => {
    const base = getQtdBase(i);
    return (i.qtdConferida ?? 0) > base;
  });

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

      // cálculo normal (só pra log mesmo)
      const temDivergente = itens.some(
        (i) => (i.qtdConferida ?? 0) < getQtdBase(i)
      );

      // 🔍 LOG COMPLETO DO QUE ESTAMOS FINALIZANDO
      console.log(
        "[ConferenciaScreen] Iniciando finalização",
        JSON.stringify(
          {
            nuconf,
            nunotaOrig: detalhePedido.nunota,
            temDivergente,
            itens,
          },
          null,
          2
        )
      );

      // aqui você decidiu sempre usar o fluxo que manda itens + quantidades
      await finalizarConferenciaDivergente(
        nuconf,
        COD_USUARIO_EXEMPLO,
        detalhePedido.nunota,
        itens
      );

      console.log(
        "[ConferenciaScreen] Finalização (fluxo com itens) - nuconf:",
        nuconf
      );

      Alert.alert("Sucesso", "Conferência finalizada.", [
        {
          text: "OK",
          onPress: () => navigation.popToTop(),
        },
      ]);
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

          {/* linha com seq, valor unitário e unidade */}
          <Text style={styles.itemSubtitle}>Seq: {item.sequencia}</Text>

          {/* quantidade esperada com unidade */}
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
              qtdMaior && styles.qtdInputErro, // borda vermelha se maior
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

  // número “bonito” pro cabeçalho: usa numNota se vier, senão nunota
  const numeroExibicao = (detalhePedido as any).numNota ?? detalhePedido.nunota;
  const nomeParc = (detalhePedido as any).nomeParc;

  // botão desabilitado se:
  // - salvando
  // - ainda tem item não conferido
  // - OU existe item com qtd maior que a original
  const buttonDisabled = salvando || !todosConferidos || existeQtdMaior;

  return (
    <View style={styles.container}>
      <Navbar title="Conferência" showBack />

      <View style={styles.content}>
        <Text style={styles.header}>Pedido #{numeroExibicao}</Text>

        {nomeParc && <Text style={styles.subHeader}>{nomeParc}</Text>}

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
      >
        <Text style={styles.buttonText}>
          {salvando ? "Salvando..." : "Finalizar Conferência"}
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
    marginBottom: 12,
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
  button: {
    position: "absolute",
    bottom: 60,
    left: 16,
    right: 16,
    backgroundColor: "#66CC66",
    padding: 16,
    borderRadius: 999,
    alignItems: "center",
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#A3E0A3",
    opacity: 0.7,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
