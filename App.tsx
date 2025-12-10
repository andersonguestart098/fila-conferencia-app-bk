// App.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, AppState } from "react-native";
import RootNavigator, {
  RootStackParamList,
} from "./src/navigation/RootNavigator";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { setupFcmListeners } from "./src/api/firebase/fcm-listener";
import { loadStoredToken } from "./src/api/client";
import { registrarFcmToken } from "./src/api/firebase/messaging";
import { startOfflineQueueBackgroundFlush, flushOfflineMutations } from "./src/api/offlineQueue";

type RouteName = keyof RootStackParamList;

// handler de notificações (como você já tinha)
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
  const [initialRouteName, setInitialRouteName] = useState<RouteName | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const isExpoGo = Constants.appOwnership === "expo";

        // 🔄 inicia flush periódico da fila offline
        startOfflineQueueBackgroundFlush(15000);

        // 1) FCM listeners
        if (!isExpoGo) {
          console.log("[APP] Registrando listeners FCM...");
          setupFcmListeners();
        } else {
          console.log("[APP] Rodando no Expo Go, pulando listeners FCM.");
        }

        // 2) Token de sessão
        const token = await loadStoredToken();
        console.log("[APP] Token de sessão carregado?", !!token);

        // 3) Se usuário logado e não está no Expo Go, registra/atualiza FCM token
        if (token && !isExpoGo) {
          try {
            console.log("[APP] Registrando FCM token no backend...");
            await registrarFcmToken();
          } catch (err) {
            console.log("[APP] Erro ao registrar FCM token:", err);
          }
        } else if (token && isExpoGo) {
          console.log(
            "[APP] Token de sessão existe, mas está no Expo Go → pulando registrarFcmToken."
          );
        }

        // 4) Tenta dar um flush da fila logo na subida
        await flushOfflineMutations();

        // 5) Decide rota inicial
        if (isMounted) {
          setInitialRouteName(token ? "PedidosPendentes" : "Login");
        }
      } catch (err) {
        console.log("[APP] Erro no init:", err);
        if (isMounted) {
          setInitialRouteName("Login");
        }
      }
    }

    init();

    // opcional: flush quando voltar pro foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        flushOfflineMutations().catch((err) =>
          console.log("[APP] erro ao flush ao voltar pro foreground:", err)
        );
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

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

  return <RootNavigator initialRouteName={initialRouteName} />;
}
