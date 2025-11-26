// src/api/firebase/messaging.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "../client";

export async function registrarFcmToken() {
  // Evita rodar no Expo Go – FCM não funciona lá mesmo
  if (Constants.appOwnership === "expo") {
    console.log("[FCM] Rodando no Expo Go, pulando registro de FCM.");
    return;
  }

  try {
    if (!Device.isDevice) {
      console.log("[FCM] Push só funciona em dispositivo físico.");
      return;
    }

    // 1) Permissões de notificação (mesma ideia do notifications.ts)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[FCM] Permissão de notificação negada.");
      return;
    }

    // 2) Canal Android (precisa ser criado antes de pegar token em Android 13+)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // 3) Pega o *device push token* nativo (FCM no Android)
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    console.log("[FCM] Device push token bruto =>", devicePushToken);

    const fcmToken = devicePushToken?.data as string | undefined;

    if (!fcmToken) {
      console.log("[FCM] Não foi possível obter um FCM token (devicePushToken.data vazio).");
      return;
    }

    console.log("[FCM] FCM token (via expo-notifications) =>", fcmToken);

    // 4) Envia pro backend salvar
    await api.post("/api/auth/update-push-token", {
      pushToken: fcmToken,
    });
    console.log("[FCM] Token registrado/atualizado no backend com sucesso.");
  } catch (err) {
    console.log("[FCM] Erro ao registrar FCM token:", err);
  }
}
