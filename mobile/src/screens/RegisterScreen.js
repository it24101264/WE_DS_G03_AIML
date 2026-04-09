import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";
import { ROLE_OPTIONS, ROLES } from "../constants/roles";
import { validateRegisterForm } from "../utils/authValidation";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(ROLES.STUDENT);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [canteenName, setCanteenName] = useState("");
  const [canteenLocation, setCanteenLocation] = useState("");

  async function register() {
    setErr("");
    const { isValid, message, values } = validateRegisterForm({
      name,
      email,
      password,
      role,
      canteenName,
      canteenLocation,
    });
    if (!isValid) {
      setErr(message);
      return;
    }

    setLoading(true);
    try {
      await api.register({
        ...values,
        canteenName: values.role === ROLES.CANTEEN_OWNER ? values.canteenName : null,
        canteenLocation: values.role === ROLES.CANTEEN_OWNER ? values.canteenLocation : null,
      });
      navigation.navigate("Login");
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
        <Text style={styles.kicker}>GET STARTED</Text>
        <Text style={styles.brand}>Create account</Text>
        <Text style={styles.subtitle}>Pick your role and join the shared campus platform.</Text>
      </View>

      <View style={styles.card}>
        <TextInput
          placeholder="Name"
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
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
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {role === ROLES.CANTEEN_OWNER && (
  <>
    <TextInput
      placeholder="Canteen Name"
      placeholderTextColor={theme.colors.textMuted}
      value={canteenName}
      onChangeText={setCanteenName}
      style={styles.input}
    />
    <TextInput
      placeholder="Canteen Location"
      placeholderTextColor={theme.colors.textMuted}
      value={canteenLocation}
      onChangeText={setCanteenLocation}
      style={styles.input}
    />
  </>
)}

        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.roleChip, role === option.value && styles.roleChipActive]}
              onPress={() => setRole(option.value)}
            >
              <Text style={[styles.roleText, role === option.value && styles.roleTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={register} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? "Creating account..." : "Create Account"}</Text>
        </Pressable>

        <Pressable style={styles.ghostBtn} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.ghostBtnText}>Back to sign in</Text>
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
    fontWeight: "700",
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
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: theme.colors.text,
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  roleChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    backgroundColor: theme.colors.surfaceAlt,
  },
  roleChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  roleTextActive: {
    color: "#fff",
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
    fontWeight: "800",
    fontSize: 15,
  },
  ghostBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  ghostBtnText: {
    color: theme.colors.primaryDeep,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
