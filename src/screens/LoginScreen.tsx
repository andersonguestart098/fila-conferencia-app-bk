// src/screens/LoginScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

import { login, updatePushToken } from "../api/auth";
import { setAuthToken } from "../api/client";

import * as SecureStore from "expo-secure-store";
import messaging from "@react-native-firebase/messaging";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 Carregar usuário/senha salvos
  useEffect(() => {
    (async () => {
      try {
        const savedNome = await SecureStore.getItemAsync("login_nome");
        const savedSenha = await SecureStore.getItemAsync("login_senha");
        const savedFlag = await SecureStore.getItemAsync("login_lembrar");

        if (savedFlag === "true" && savedNome && savedSenha) {
          setLembrar(true);
          setNome(savedNome);
          setSenha(savedSenha);
        }
      } catch (e) {
        console.log("Erro ao carregar login salvo:", e);
      }
    })();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const resp = await login(nome, senha);

      // Salva token
      await setAuthToken(resp.token);

      // 🔹 Se checkbox marcado → salvar nome/senha
      if (lembrar) {
        await SecureStore.setItemAsync("login_nome", nome);
        await SecureStore.setItemAsync("login_senha", senha);
        await SecureStore.setItemAsync("login_lembrar", "true");
      } else {
        // Se não estiver marcado, apaga possíveis registros antigos
        await SecureStore.deleteItemAsync("login_nome");
        await SecureStore.deleteItemAsync("login_senha");
        await SecureStore.deleteItemAsync("login_lembrar");
      }

      // 🔹 Registro do FCM
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          const fcmToken = await messaging().getToken();
          console.log("FCM TOKEN OBTIDO:", fcmToken);

          if (fcmToken) await updatePushToken(nome, fcmToken);
        }
      } catch (err) {
        console.log("Erro ao registrar FCM:", err);
      }

      navigation.replace("PedidosPendentes");
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Falha no login. Verifique nome/senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Conferente</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        autoCapitalize="none"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      {/* 🔹 Checkbox simples */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => setLembrar((prev) => !prev)}
      >
        <View style={[styles.checkbox, lembrar && styles.checkboxOn]} />
        <Text style={styles.checkboxText}>Lembrar usuário e senha</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  // Checkbox
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#0d9488",
    marginRight: 8,
  },
  checkboxOn: {
    backgroundColor: "#0d9488",
  },
  checkboxText: {
    fontSize: 14,
    color: "#333",
  },

  button: {
    backgroundColor: "#0d9488",
    padding: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
