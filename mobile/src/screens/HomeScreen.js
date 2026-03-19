import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../ui/theme";

function ModuleCard({ icon, title, subtitle, onPress }) {
  return (
    <Pressable style={styles.moduleCard} onPress={onPress}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={26} color={theme.colors.primaryDeep} />
      </View>
      <View style={styles.moduleContent}>
        <Text style={styles.moduleTitle}>{title}</Text>
        <Text style={styles.moduleSubtitle}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
    </Pressable>
  );
}

export default function HomeScreen({ navigation, user, onLogout }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />

        <Text style={styles.title}>University Student Support System </Text>
        <Text style={styles.subtitle}>Welcome, {user?.name || user?.email || "Student"}</Text>
        <Text style={styles.caption}>Open any module from one place.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Modules</Text>
        <ModuleCard
          icon="book-open-page-variant"
          title="Kuppi Sessions"
          subtitle="Create requests and track sessions"
          onPress={() => navigation.navigate("Kuppi")}
        />
        <ModuleCard
          icon="briefcase-search"
          title="Lost & Found"
          subtitle="Post items and browse campus feed"
          onPress={() => navigation.navigate("LostFound")}
        />
        <ModuleCard
          icon="car-parking-lights"
          title="Parking"
          subtitle="Check and reserve parking slots"
          onPress={() => navigation.navigate("Parking")}
        />
      </View>

      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  pageContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 16,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  bgOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.16)",
    top: -70,
    right: -40,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.13)",
    bottom: -40,
    left: -30,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "500",
  },
  subtitle: {
    color: "#e8eeff",
    marginTop: 4,
    fontWeight: "400",
  },
  caption: {
    color: "#d9e5ff",
    marginTop: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  cardTitle: {
    fontWeight: "600",
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 2,
  },
  moduleCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    backgroundColor: "#fdfefe",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    color: theme.colors.text,
    fontWeight: "500",
    fontSize: 15,
  },
  moduleSubtitle: {
    color: theme.colors.textMuted,
    marginTop: 2,
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: "#ffffff",
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 12,
  },
  logoutBtnText: {
    color: theme.colors.primary,
    fontWeight: "500",
  },
});
