import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { DetalhePedido } from "../api/types/conferencia";
import { buscarPedidosPendentes } from "../api/conferencia";

type Props = NativeStackScreenProps<RootStackParamList, "PedidosPendentes">;

export default function PedidosPendentesScreen({ navigation }: Props) {
  const [pedidos, setPedidos] = useState<DetalhePedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const dados = await buscarPedidosPendentes();
        setPedidos(dados);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar pedidos.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handlePressPedido = (pedido: DetalhePedido) => {
    navigation.navigate("DetalhePedido", { detalhePedido: pedido });
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

  return (
    <View style={styles.container}>
      <FlatList
        data={pedidos}
        keyExtractor={(item) => String(item.nunota)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handlePressPedido(item)}
          >
            <Text style={styles.title}>Pedido #{item.nunota}</Text>
            <Text>Status conferência: {item.statusConferencia || "-"}</Text>
            <Text>Itens: {item.itens.length}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>Sem pedidos pendentes 🙂</Text>
          </View>
        }
      />
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
    marginBottom: 12,
    elevation: 2,
  },
  title: { fontWeight: "bold", marginBottom: 4 },
});
