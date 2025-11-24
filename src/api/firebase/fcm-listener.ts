// src/api/firebase/fcm-listener.ts
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

type RemoteMessage = import('@react-native-firebase/messaging').FirebaseMessagingTypes.RemoteMessage;

async function mostrarNotificacaoLocal(message: RemoteMessage) {
  const title =
    (message.data?.title as string | undefined) ??
    message.notification?.title ??
    'Novo aviso';

  const body =
    (message.data?.body as string | undefined) ??
    message.notification?.body ??
    '';

  console.log('🔔 Preparando notificação local:', { title, body });

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: null, // dispara agora
    });

    console.log('✅ Notificação local agendada com ID:', id);
  } catch (err) {
    console.log('❌ Erro ao agendar notificação local:', err);
  }
}

export function setupFcmListeners() {
  // App em primeiro plano
  messaging().onMessage(async (message) => {
    console.log('📥 [FOREGROUND] Nova notificação FCM:', JSON.stringify(message, null, 2));
    await mostrarNotificacaoLocal(message);
  });

  // App em background (mas ainda vivo)
  messaging().setBackgroundMessageHandler(async (message) => {
    console.log('📥 [BACKGROUND] Nova notificação FCM:', JSON.stringify(message, null, 2));
    await mostrarNotificacaoLocal(message);
  });
}
