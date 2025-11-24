// src/api/firebase/messaging.ts
import messaging from '@react-native-firebase/messaging';
import { api } from '../client';

export async function registrarFcmToken(usuarioId: number) {
  // 1) Pede permissão pro usuário
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log('Notificações não autorizadas');
    return;
  }

  // 2) Pega o FCM token
  const fcmToken = await messaging().getToken();
  console.log('FCM TOKEN => ', fcmToken);

  if (!fcmToken) return;

  // 3) Envia pro backend salvar
  await api.post('/auth/registrar-dispositivo', {
    usuarioId,
    fcmToken,
  });
}
