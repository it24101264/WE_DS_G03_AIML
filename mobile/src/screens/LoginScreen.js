import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api";
import { theme } from "../ui/theme";

export default function LoginScreen({ navigation, onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      await AsyncStorage.setItem("token", res.token);
      await onLoggedIn();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.hero}>
        <Text style={styles.kicker}>SMART STUDY SUPPORT</Text>
        <Text style={styles.brand}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your requests and join published sessions.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={theme.colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={login} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? "Signing in..." : "Continue"}</Text>
        </Pressable>

        <Pressable style={styles.ghostBtn} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.ghostBtnText}>Create new account</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: 20,
    justifyContent: "center",
    gap: 18,
  },
  bgOrbTop: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 200,
    backgroundColor: "#dbe5ff",
    top: -90,
    right: -80,
  },
  bgOrbBottom: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 200,
    backgroundColor: "#d6f9ef",
    bottom: -80,
    left: -70,
  },
  hero: {
    gap: 6,
  },
  kicker: {
    color: theme.colors.primary,
    fontWeight: "500",
    letterSpacing: 1,
    fontSize: 11,
  },
  brand: {
    fontSize: 34,
    fontWeight: "900",
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: theme.colors.text,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 15,
  },
  ghostBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  ghostBtnText: {
    color: theme.colors.primaryDeep,
    fontWeight: "500",
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
