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

  const [itens, setItens] = useState<ItemConferenciaUI[]>(
    detalhePedido.itens.map((item) => ({
      ...item,
      // começa assumindo que a qtd conferida = qtd esperada (qtdNeg)
      qtdConferida: item.qtdNeg,
      conferido: false,
    }))
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

  const handleFinalizar = async () => {
    if (!todosConferidos) {
      Alert.alert(
        "Atenção",
        "Marque todos os itens como conferidos antes de finalizar."
      );
      return;
    }

    try {
      setSalvando(true);

      // verifica se há divergência (algum item com qtdConferida < qtdNeg)
      const temDivergente = itens.some(
        (i) => (i.qtdConferida ?? 0) < (i.qtdNeg ?? 0)
      );

      if (temDivergente) {
        // 👇 agora envia também a nunotaOrig e os itens pro backend
        await finalizarConferenciaDivergente(
          nuconf,
          COD_USUARIO_EXEMPLO,
          detalhePedido.nunota,
          itens
        );
      } else {
        await finalizarConferencia(nuconf, COD_USUARIO_EXEMPLO);
      }

      Alert.alert(
        "Sucesso",
        temDivergente
          ? "Conferência finalizada com divergência."
          : "Conferência finalizada com sucesso!",
        [
          {
            text: "OK",
            onPress: () => navigation.popToTop(),
          },
        ]
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Erro ao finalizar conferência.");
    } finally {
      setSalvando(false);
    }
  };

  const renderItem = ({ item }: { item: ItemConferenciaUI }) => (
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
          Esperado: {item.qtdNeg}{" "}
          <Text style={{ fontWeight: "bold" }}>{item.unidade}</Text>
        </Text>
      </View>

      <View style={styles.qtdContainer}>
        <Text style={styles.qtdLabel}>
          Qtd conf. (<Text style={{ fontWeight: "bold" }}>{item.unidade}</Text>)
        </Text>

        <TextInput
          style={styles.qtdInput}
          keyboardType="numeric"
          value={String(item.qtdConferida ?? 0)}
          onChangeText={(text) =>
            atualizarQuantidade(item.codProd, item.sequencia, text)
          }
        />
      </View>
    </View>
  );

  // número “bonito” pro cabeçalho: usa numNota se vier, senão nunota
  const numeroExibicao = (detalhePedido as any).numNota ?? detalhePedido.nunota;
  const nomeParc = (detalhePedido as any).nomeParc;

  const buttonDisabled = salvando || !todosConferidos;

  return (
    <View style={styles.container}>
      <Navbar title="Conferência" showBack />

      <View style={styles.content}>
        <Text style={styles.header}>Pedido #{numeroExibicao}</Text>

        {nomeParc && <Text style={styles.subHeader}>{nomeParc}</Text>}

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
        style={[
          styles.button,
          buttonDisabled && styles.buttonDisabled,
        ]}
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
