// src/api/firebase/fcm-listener.ts
import messaging from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";

type RemoteMessage =
  import("@react-native-firebase/messaging").FirebaseMessagingTypes.RemoteMessage;

/**
 * Exibe uma notificação local vinda de uma mensagem FCM.
 */
async function mostrarNotificacaoLocal(message: RemoteMessage) {
  const title =
    (message.data?.title as string | undefined) ??
    message.notification?.title ??
    "Novo aviso";

  const body =
    (message.data?.body as string | undefined) ??
    message.notification?.body ??
    "";

  console.log("🔔 [LOCAL] Preparando notificação:", { title, body });

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // dispara imediatamente
    });

    console.log("✅ [LOCAL] Notificação agendada, ID:", id);
  } catch (err) {
    console.log("❌ [LOCAL] Erro ao agendar notificação:", err);
  }
}

/**
 * Registra listeners para mensagens FCM em foreground e background.
 */
export function setupFcmListeners() {
  console.log("📡 Registrando listeners FCM...");

  // Mensagens recebidas enquanto o app está em primeiro plano
  messaging().onMessage(async (message) => {
    console.log(
      "📥 [FOREGROUND] Mensagem FCM recebida:",
      JSON.stringify(message, null, 2)
    );
    await mostrarNotificacaoLocal(message);
  });

  // Mensagens recebidas enquanto o app está em background (mas ainda vivo)
  messaging().setBackgroundMessageHandler(async (message) => {
    console.log(
      "📥 [BACKGROUND] Mensagem FCM recebida:",
      JSON.stringify(message, null, 2)
    );
    await mostrarNotificacaoLocal(message);
  });
}
