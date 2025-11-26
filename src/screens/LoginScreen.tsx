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
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

import { login, updatePushToken } from "../api/auth";
import { setAuthToken } from "../api/client";

import * as SecureStore from "expo-secure-store";
import messaging from "@react-native-firebase/messaging";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

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
      {/* Logo no lugar do título */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        value={nome}
        onChangeText={setNome}
      />

      {/* Input de senha com botão de mostrar/ocultar */}
      <View style={styles.passwordWrapper}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Senha"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!mostrarSenha}
          value={senha}
          onChangeText={setSenha}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setMostrarSenha((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={mostrarSenha ? "eye-off-outline" : "eye-outline"}
            size={22}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* 🔹 Checkbox lembrar */}
      <TouchableOpacity
        style={styles.row}
        onPress={() => setLembrar((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.checkbox,
            lembrar && styles.checkboxOn,
          ]}
        >
          {lembrar && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </View>
        <Text style={styles.checkboxText}>Lembrar usuário e senha</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
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
    backgroundColor: "#ffffff",
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 150,
    height: 150,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: "#111827",
  },

  // Wrapper do input de senha
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    color: "#111827",
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 4,
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
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#66CC66",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxOn: {
    backgroundColor: "#66CC66",
    borderColor: "#66CC66",
  },
  checkboxText: {
    fontSize: 14,
    color: "#333",
  },

  button: {
    backgroundColor: "#66CC66",
    padding: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
