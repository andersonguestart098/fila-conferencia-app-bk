import React, { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { DetalhePedido } from "../api/types/conferencia";
import { iniciarConferencia } from "../api/conferencia";

type Props = NativeStackScreenProps<RootStackParamList, "DetalhePedido">;

const COD_USUARIO_EXEMPLO = 42; // depois pega do login/autenticação

export default function DetalhePedidoScreen({ route, navigation }: Props) {
  const { detalhePedido } = route.params;

  const [detalhe] = useState<DetalhePedido>(detalhePedido);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleIrParaConferencia = async () => {
    try {
      setLoading(true);
      setErro(null);

      // chama /iniciar apenas aqui
      const resp = await iniciarConferencia(detalhe.nunota, COD_USUARIO_EXEMPLO);
      // resp esperado: { nuconf, nunotaOrig }

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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Pedido #{detalhe.nunota}</Text>
        <Text>Status: {detalhe.statusConferencia}</Text>
        <Text>Total de Itens: {totalItens}</Text>
        <Text>Total de Quantidade: {totalQuantidade}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleIrParaConferencia}
      >
        <Text style={styles.buttonText}>Iniciar Conferência</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    elevation: 2,
  },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 8 },
  button: {
    backgroundColor: "#0d9488",
    padding: 16,
    borderRadius: 999,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
