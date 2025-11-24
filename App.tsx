// App.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import RootNavigator, { RootStackParamList } from "./src/navigation/RootNavigator";
import * as Notifications from "expo-notifications";
import { setupFcmListeners } from "./src/api/firebase/fcm-listener";
import { loadStoredToken } from "./src/api/client";

type RouteName = keyof RootStackParamList;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [initialRouteName, setInitialRouteName] = useState<RouteName | null>(null);

  useEffect(() => {
    async function init() {
      // listeners de FCM
      setupFcmListeners();

      // carrega token salvo (SecureStore / memória)
      const token = await loadStoredToken();

      // se tiver token, cai direto na tela de pedidos
      // senão, vai pro login
      setInitialRouteName(token ? "PedidosPendentes" : "Login");
    }

    init();
  }, []);

  // Enquanto não sabemos qual rota inicial usar, mostra um loading
  if (!initialRouteName) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  // RootNavigator precisa aceitar a prop initialRouteName
  return <RootNavigator initialRouteName={initialRouteName} />;
}
