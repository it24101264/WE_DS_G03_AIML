import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../ui/theme";

function densityPalette(level) {
  if (level === "Crowded") {
    return {
      tint: theme.colors.rose,
      soft: theme.colors.roseSoft,
      icon: "alert-circle-outline",
    };
  }

  if (level === "Moderate") {
    return {
      tint: theme.colors.gold,
      soft: theme.colors.goldSoft,
      icon: "account-group-outline",
    };
  }

  return {
    tint: theme.colors.accent,
    soft: theme.colors.accentSoft,
    icon: "check-circle-outline",
  };
}

function DetailRow({ icon, label, value, tint, soft }) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconWrap, { backgroundColor: soft }]}>
        <MaterialCommunityIcons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function StudyAreaDetailScreen({ route, navigation }) {
  const area = route.params?.area;
  const palette = densityPalette(area?.density);

  if (!area) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="map-marker-off-outline" size={42} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>Study area not found</Text>
        <Text style={styles.emptyText}>The selected study area details are not available right now.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <View style={styles.heroTop}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color="#fff" />
          </View>
          <View style={[styles.heroBadge, { backgroundColor: palette.soft }]}>
            <MaterialCommunityIcons name={palette.icon} size={16} color={palette.tint} />
            <Text style={[styles.heroBadgeText, { color: palette.tint }]}>{area.density}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{area.name}</Text>
        <Text style={styles.heroSubtitle}>{area.note || "A focused space for students around campus."}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Live Overview</Text>
        <DetailRow
          icon="account-multiple-outline"
          label="Students inside"
          value={String(area.studentCount ?? 0)}
          tint={theme.colors.primary}
          soft={theme.colors.primarySoft}
        />
        <DetailRow
          icon="account-group-outline"
          label="Student capacity"
          value={String(area.studentCapacity ?? area.capacityEstimate ?? 0)}
          tint={theme.colors.teal}
          soft={theme.colors.tealSoft}
        />
        <DetailRow
          icon="ruler-square"
          label="Radius"
          value={`${area.radiusMeters ?? "N/A"} m`}
          tint={theme.colors.gold}
          soft={theme.colors.goldSoft}
        />
        <DetailRow
          icon="crosshairs-gps"
          label="Center point"
          value={`${area.center?.latitude ?? "N/A"}, ${area.center?.longitude ?? "N/A"}`}
          tint={theme.colors.primaryDeep}
          soft={theme.colors.primarySoft}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusCard}>
          <View style={[styles.statusIconWrap, { backgroundColor: palette.soft }]}>
            <MaterialCommunityIcons name={palette.icon} size={22} color={palette.tint} />
          </View>
          <View style={styles.statusTextWrap}>
            <Text style={styles.statusTitle}>{area.density} right now</Text>
            <Text style={styles.statusText}>
              {area.userInside
                ? "You are currently inside this study area."
                : "You are not currently marked inside this study area."}
            </Text>
            {!area.isConfigured ? (
              <Text style={styles.warningText}>This study area still needs complete admin configuration.</Text>
            ) : null}
          </View>
        </View>
      </View>

      <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={18} color="#fff" />
        <Text style={styles.backBtnText}>Back to study areas</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: 20,
    overflow: "hidden",
    gap: 10,
    ...theme.shadow.card,
  },
  heroGlowOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255,255,255,0.12)",
    top: -80,
    right: -30,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    bottom: -30,
    left: -20,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    fontWeight: "800",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: "#dbe7ff",
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextWrap: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  statusCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    padding: 14,
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTextWrap: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  statusText: {
    color: theme.colors.neutralText,
    lineHeight: 20,
  },
  warningText: {
    color: theme.colors.warningText,
    fontWeight: "700",
  },
  backBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    ...theme.shadow.soft,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    backgroundColor: theme.colors.bg,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});
