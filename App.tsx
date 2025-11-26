// App.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import RootNavigator, {
  RootStackParamList,
} from "./src/navigation/RootNavigator";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { setupFcmListeners } from "./src/api/firebase/fcm-listener";
import { loadStoredToken } from "./src/api/client";
import { registrarFcmToken } from "./src/api/firebase/messaging";

type RouteName = keyof RootStackParamList;

// Handler global das notificações locais / push
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // iOS 16+ / web
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [initialRouteName, setInitialRouteName] = useState<RouteName | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const isExpoGo = Constants.appOwnership === "expo";

        // 1) Registra listeners FCM (somente fora do Expo Go)
        if (!isExpoGo) {
          console.log("[APP] Registrando listeners FCM...");
          setupFcmListeners();
        } else {
          console.log("[APP] Rodando no Expo Go, pulando listeners FCM.");
        }

        // 2) Verifica se existe token de autenticação salvo
        const token = await loadStoredToken();
        console.log("[APP] Token de sessão carregado?", !!token);

        // 3) Se usuário logado e não estamos no Expo Go, registra/atualiza FCM token
        if (token && !isExpoGo) {
          try {
            console.log("[APP] Registrando FCM token no backend...");
            await registrarFcmToken(); // versão sem usuárioId
          } catch (err) {
            console.log("[APP] Erro ao registrar FCM token:", err);
          }
        } else if (token && isExpoGo) {
          console.log(
            "[APP] Token de sessão existe, mas está no Expo Go → pulando registrarFcmToken."
          );
        }

        // 4) Decide rota inicial
        if (isMounted) {
          setInitialRouteName(token ? "PedidosPendentes" : "Login");
        }
      } catch (err) {
        console.log("[APP] Erro no init:", err);
        if (isMounted) {
          // fallback seguro
          setInitialRouteName("Login");
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
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
