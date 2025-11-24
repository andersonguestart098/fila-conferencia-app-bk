// src/firebase/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const EXPO_PUSH_TOKEN_KEY = "expoPushToken";

// Registra (ou reutiliza) o Expo Push Token
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Garante que é um dispositivo físico
    if (!Device.isDevice) {
      console.log("Push só funciona em dispositivo físico.");
      return null;
    }

    // Não tenta registrar se estiver rodando no Expo Go
    if (Constants.appOwnership === "expo") {
      console.log("Expo Go detectado – ignorando registro de push.");
      return null;
    }

    // 1) Verifica se já existe token salvo localmente
    const storedToken = await AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
    if (storedToken) {
      console.log("Já existe Expo push token salvo, reutilizando:", storedToken);
      return storedToken;
    }

    // 2) Permissões
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Permissão de notificação negada");
      return null;
    }

    // 3) Canal Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // 4) Pega o projectId do app.json / eas
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("Project ID não encontrado nas configs do app.");
    }

    // 5) Busca o token do Expo
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log("Expo push token obtido:", token);

    if (!token) {
      console.warn("Expo retornou token vazio ou indefinido.");
      return null;
    }

    // 6) Salva no AsyncStorage para não registrar de novo nos próximos logins
    await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);

    return token;
  } catch (error) {
    // Aqui cairia, por exemplo, o SERVICE_NOT_AVAILABLE do Firebase
    console.log(
      "Erro ao registrar push notifications (não é fatal, será ignorado):",
      error
    );
    return null;
  }
}

// Só para DEBUG: pegar o FCM token e testar direto no Firebase Console
export async function getFcmTokenForTesting(): Promise<string | null> {
  try {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    console.log("FCM token (device):", devicePushToken);

    if (!devicePushToken?.data) {
      console.warn("Não consegui obter o FCM token.");
      return null;
    }

    // É ESSE valor (data) que você cola no Firebase Cloud Messaging
    return devicePushToken.data as string;
  } catch (err) {
    console.log("Erro ao obter FCM token de teste:", err);
    return null;
  }
}
