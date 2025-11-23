import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PedidosPendentesScreen from "../screens/PedidosPendentesScreen";
import DetalhePedidoScreen from "../screens/DetalhePedidoScreen";
import ConferenciaScreen from "../screens/ConferenciaScreen";
import { DetalhePedido } from "../api/types/conferencia";


export type RootStackParamList = {
    PedidosPendentes: undefined;
    DetalhePedido: { detalhePedido: DetalhePedido };
    Conferencia: { detalhePedido: DetalhePedido; nuconf: number };
  };
  

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="PedidosPendentes"
          component={PedidosPendentesScreen}
          options={{ title: "Pedidos a Conferir" }}
        />
        <Stack.Screen
          name="DetalhePedido"
          component={DetalhePedidoScreen}
          options={{ title: "Detalhe do Pedido" }}
        />
        <Stack.Screen
          name="Conferencia"
          component={ConferenciaScreen}
          options={{ title: "Conferência" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
