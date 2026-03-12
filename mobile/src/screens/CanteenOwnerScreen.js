import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../ui/theme";
import ModuleSidebar from "../components/ModuleSidebar";

export default function CanteenOwnerScreen({ user, onLogout }) {
  return (
    <View style={styles.pageShell}>
      <ModuleSidebar currentModule="food" />
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.kicker}>ROLE READY</Text>
          <Text style={styles.title}>Canteen Owner</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
          <Text style={styles.body}>
            This account type is now part of the shared authentication system. Your teammate can build the food component on top of this role.
          </Text>

          <View style={styles.roleBlock}>
            <Text style={styles.roleLabel}>Available shared roles</Text>
            <Text style={styles.roleText}>student</Text>
            <Text style={styles.roleText}>batchRep</Text>
            <Text style={styles.roleText}>canteenOwner</Text>
          </View>

          <Pressable style={styles.button} onPress={onLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageShell: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  page: {
    flex: 1,
    padding: 20,
    paddingLeft: 94,
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadow.soft,
  },
  kicker: {
    color: "#9a5b00",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  body: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  roleBlock: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 6,
  },
  roleLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  roleText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  button: {
    marginTop: 4,
    backgroundColor: "#c26b00",
    borderRadius: theme.radius.sm,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
