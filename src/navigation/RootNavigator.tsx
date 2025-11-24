import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PedidosPendentesScreen from "../screens/PedidosPendentesScreen";
import DetalhePedidoScreen from "../screens/DetalhePedidoScreen";
import ConferenciaScreen from "../screens/ConferenciaScreen";
import LoginScreen from "../screens/LoginScreen";

import { DetalhePedido } from "../api/types/conferencia";

export type RootStackParamList = {
  Login: undefined;
  PedidosPendentes: undefined;
  DetalhePedido: { detalhePedido: DetalhePedido };
  Conferencia: { detalhePedido: DetalhePedido; nuconf: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  initialRouteName?: keyof RootStackParamList;
};

export default function RootNavigator({ initialRouteName = "Login" }: Props) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="PedidosPendentes"
          component={PedidosPendentesScreen}
        />

        <Stack.Screen
          name="DetalhePedido"
          component={DetalhePedidoScreen}
        />

        <Stack.Screen
          name="Conferencia"
          component={ConferenciaScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
