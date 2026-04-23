import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../ui/theme";
import { ROLES } from "../constants/roles";

const MODULE_CATALOG = {
  support: {
    key: "support",
    title: "Smart Study Support",
    icon: "lightbulb-on-outline",
  },
  parking: {
    key: "parking",
    title: "Parking Management",
    icon: "car-electric-outline",
  },
  food: {
    key: "food",
    title: "Food Corner",
    icon: "silverware-fork-knife",
  },
  lostFound: {
    key: "lostFound",
    title: "Lost and Found",
    icon: "magnify-scan",
  },
  marketplace: {
    key: "marketplace",
    title: "Marketplace",
    icon: "storefront-outline",
  },
  studyAreas: {
    key: "studyAreas",
    title: "Study Areas",
    icon: "map-marker-radius-outline",
  },
};

function initialsFor(user) {
  const name = String(user?.name || user?.email || "U").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function buildModules(role) {
  const roleHomeRoute =
    role === ROLES.BATCH_REP
      ? "Rep"
      : role === ROLES.CANTEEN_OWNER
        ? "CanteenOwner"
        : "Student";

  return [
    {
      ...MODULE_CATALOG.support,
      route: roleHomeRoute,
      status:
        role === ROLES.BATCH_REP
          ? "Batch rep tools"
          : role === ROLES.CANTEEN_OWNER
            ? "Role dashboard"
            : "Student tools",
      available: true,
    },
    {
      ...MODULE_CATALOG.parking,
      route: "Parking",
      status: "Available now",
      available: true,
    },
    {
      ...MODULE_CATALOG.food,
      route: "CanteenMenu",
      status: "Available now",
      available: true,
    },
    {
      ...MODULE_CATALOG.lostFound,
      route: "LostFound",
      status: "Available now",
      available: true,
    },
    {
      ...MODULE_CATALOG.studyAreas,
      route: "StudyAreas",
      status: "Live occupancy",
      available: true,
    },
    {
      ...MODULE_CATALOG.marketplace,
      route: "MarketplaceChoice",
      status: "Available now",
      available: true,
    },
  ];
}

export default function HomeScreen({ navigation, user, normalizedRole, onLogout }) {
  const modules = buildModules(normalizedRole);

  function handleModulePress(module) {
    if (module.route) {
      navigation.navigate(module.route);
      return;
    }

    Alert.alert(
      module.title,
      module.status === "Owner access only"
        ? "This module is restricted to canteen owner accounts."
        : "This module is not available yet."
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />
      <View style={styles.bgOrbThree} />

      <View style={styles.topBar}>
        <Pressable style={styles.profileBtn} onPress={() => navigation.navigate("UserProfile")}>
          <Text style={styles.profileBtnText}>{initialsFor(user)}</Text>
        </Pressable>
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Select a module</Text>
        <Text style={styles.sectionSubtitle}>{user?.email || "Signed in user"}</Text>
      </View>

      <View style={styles.grid}>
        {modules.map((module) => (
          <Pressable
            key={module.key}
            style={[styles.moduleButton, !module.available && styles.moduleButtonMuted]}
            onPress={() => handleModulePress(module)}
          >
            <View
              style={[
                styles.iconWrap,
                module.key === "support" && styles.iconWrapBlue,
                module.key === "parking" && styles.iconWrapTeal,
                module.key === "food" && styles.iconWrapGold,
                module.key === "lostFound" && styles.iconWrapRose,
                module.key === "studyAreas" && styles.iconWrapMint,
                module.key === "marketplace" && styles.iconWrapViolet,
              ]}
            >
              <MaterialCommunityIcons
                name={module.icon}
                size={52}
                color={module.available ? "#ffffff" : "#d8e1ff"}
              />
            </View>

            <View style={styles.labelWrap}>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              {!module.available ? <Text style={styles.moduleStatus}>{module.status}</Text> : null}
            </View>

            {module.route ? (
              <View style={styles.chevronWrap}>
                <MaterialCommunityIcons name="chevron-right" size={26} color="#ffffff" />
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  pageContent: {
    padding: 16,
    paddingBottom: 28,
    paddingTop: 24,
    minHeight: "100%",
    gap: 16,
  },
  bgOrbOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.12)",
    top: -80,
    right: -60,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.1)",
    bottom: -50,
    left: -40,
  },
  bgOrbThree: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(34,211,238,0.14)",
    top: 180,
    left: "54%",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    ...theme.shadow.soft,
  },
  profileBtnText: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 16,
  },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  logoutBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    color: "#dbe7ff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  grid: {
    gap: 14,
  },
  moduleButton: {
    backgroundColor: "rgba(8, 22, 74, 0.46)",
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    ...theme.shadow.soft,
  },
  moduleButtonMuted: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  iconWrapBlue: {
    backgroundColor: "#3972ff",
  },
  iconWrapTeal: {
    backgroundColor: "#0f9f8f",
  },
  iconWrapGold: {
    backgroundColor: "#d8881d",
  },
  iconWrapRose: {
    backgroundColor: "#c9567a",
  },
  iconWrapMint: {
    backgroundColor: "#0f8a73",
  },
  iconWrapViolet: {
    backgroundColor: "#7560f5",
  },
  labelWrap: {
    flex: 1,
  },
  moduleTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  moduleStatus: {
    color: "#cfdcff",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
    letterSpacing: 0.3,
  },
  chevronWrap: {
    width: 34,
    alignItems: "flex-end",
  },
});
