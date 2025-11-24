import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface Props {
  title: string;
  showBack?: boolean;
  onLogout?: () => void;
}

export default function Navbar({ title, showBack = true, onLogout }: Props) {
  const navigation = useNavigation();

  return (
    <View style={styles.navbar}>
      {/* Botão voltar */}
      {showBack ? (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.left}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.left} />
      )}

      {/* Título */}
      <Text style={styles.title}>{title}</Text>

      {/* Botão sair */}
      {onLogout ? (
        <TouchableOpacity onPress={onLogout} style={styles.right}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.right} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#66CC66",
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    elevation: 4,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  left: { width: 32 },
  right: { width: 32, alignItems: "flex-end" },
});
