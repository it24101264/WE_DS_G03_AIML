import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";

function densityPalette(level) {
  if (level === "Crowded") {
    return { bg: theme.colors.roseSoft, text: "#a1261d", icon: "alert-circle-outline" };
  }
  if (level === "Moderate") {
    return { bg: theme.colors.goldSoft, text: "#8a6116", icon: "clock-outline" };
  }
  return { bg: theme.colors.accentSoft, text: "#146548", icon: "check-circle-outline" };
}

function SummaryCard({ label, value, icon, color }) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={18} color="#fff" />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function summarizeAreas(areas) {
  return (areas || []).reduce(
    (acc, area) => {
      acc.total += 1;
      const key = String(area.density || "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(acc, key)) {
        acc[key] += 1;
      }
      return acc;
    },
    { total: 0, free: 0, moderate: 0, crowded: 0 }
  );
}

export default function StudyAreasScreen({ user, navigation }) {
  const [areas, setAreas] = useState([]);
  const [summary, setSummary] = useState({ total: 0, free: 0, moderate: 0, crowded: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [permissionState, setPermissionState] = useState("pending");
  const [locationLabel, setLocationLabel] = useState("Location not detected");
  const [message, setMessage] = useState("");
  const watcherRef = useRef(null);

  const insideAreas = useMemo(() => areas.filter((area) => area.userInside), [areas]);

  async function loadAreas() {
    const res = await api.studyAreas();
    setAreas(res.data || []);
    setSummary(res.summary || { total: 0, free: 0, moderate: 0, crowded: 0 });
  }

  async function syncPresence(coords) {
    const latitude = Number(coords?.latitude);
    const longitude = Number(coords?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const res = await api.syncStudyAreaPresence({ latitude, longitude });
    const nextAreas = res.data || [];
    setAreas(nextAreas);
    setSummary(summarizeAreas(nextAreas));
    setLocationLabel(`Live location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    const count = (res.presence?.insideAreaIds || []).length;
    setMessage(count > 0 ? `You are inside ${count} study area${count > 1 ? "s" : ""}.` : "You are outside all study areas.");
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await loadAreas();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await loadAreas();
        if (!active) return;

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) return;

        if (permission.status !== "granted") {
          setPermissionState("denied");
          setMessage("Location permission is required for automatic occupancy tracking.");
          return;
        }

        setPermissionState("granted");
        setTracking(true);

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active) return;

        await syncPresence(current.coords);

        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 5,
          },
          (position) => {
            syncPresence(position.coords).catch((err) => setMessage(err.message));
          }
        );

        watcherRef.current = watcher;
      } catch (err) {
        if (active) {
          setMessage(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
      if (watcherRef.current) {
        watcherRef.current.remove();
      }
    };
  }, []);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <Text style={styles.heroTitle}>Study Areas</Text>
        <Text style={styles.heroSubtitle}>Track live occupancy around campus using your device location.</Text>

        <View style={styles.summaryRow}>
          <SummaryCard label="Free" value={summary.free || 0} icon="leaf" color={theme.colors.accent} />
          <SummaryCard label="Moderate" value={summary.moderate || 0} icon="clock-outline" color={theme.colors.gold} />
          <SummaryCard label="Crowded" value={summary.crowded || 0} icon="alert-outline" color={theme.colors.rose} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <View style={[styles.sectionIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.colors.primaryDeep} />
            </View>
            <Text style={styles.cardTitle}>Your Tracking Status</Text>
          </View>
        </View>
        <Text style={styles.cardText}>{user?.email || "Signed in user"}</Text>
        <Text style={styles.cardText}>{locationLabel}</Text>
        <Text style={styles.cardText}>
          {tracking ? "Real-time tracking is active." : permissionState === "denied" ? "Tracking is disabled." : "Preparing tracking..."}
        </Text>
        {message ? <Text style={styles.helper}>{message}</Text> : null}
        {insideAreas.length > 0 ? (
          <View style={styles.insideWrap}>
            {insideAreas.map((area) => (
              <View key={area.id} style={styles.insideChip}>
                <MaterialCommunityIcons name="book-open-page-variant-outline" size={14} color="#12604a" />
                <Text style={styles.insideChipText}>{area.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Pressable style={styles.refreshBtn} onPress={refresh}>
          <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
          <Text style={styles.refreshBtnText}>Refresh areas</Text>
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <View style={styles.sectionTitleWrap}>
          <View style={[styles.sectionIconWrap, { backgroundColor: theme.colors.tealSoft }]}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={theme.colors.teal} />
          </View>
          <Text style={styles.listTitle}>Campus Study Area List</Text>
        </View>
        <Text style={styles.listSubtitle}>{locationLabel}</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : null}

      {areas.map((area) => {
        const palette = densityPalette(area.density);
        return (
          <Pressable
            key={area.id}
            style={styles.areaCard}
            onPress={() => navigation.navigate("StudyAreaDetail", { area })}
          >
            <View style={styles.areaTopRow}>
              <View style={styles.areaTextWrap}>
                <View style={styles.areaTitleRow}>
                  <View style={styles.areaTitleIcon}>
                    <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color={theme.colors.primaryDeep} />
                  </View>
                  <Text style={styles.areaTitle}>{area.name}</Text>
                </View>
                <Text style={styles.areaNote}>{area.note || "No special note"}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: palette.bg }]}>
                <MaterialCommunityIcons name={palette.icon} size={15} color={palette.text} />
                <Text style={[styles.badgeText, { color: palette.text }]}>{area.density}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <MaterialCommunityIcons name="account-multiple-outline" size={15} color={theme.colors.primaryDeep} />
                <Text style={styles.metricPillText}>Students: {area.studentCount}</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialCommunityIcons name="account-group-outline" size={15} color={theme.colors.teal} />
                <Text style={styles.metricPillText}>Capacity: {area.studentCapacity ?? area.capacityEstimate ?? 0}</Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <MaterialCommunityIcons name="ruler-square" size={15} color={theme.colors.gold} />
                <Text style={styles.metricPillText}>Radius: {area.radiusMeters ?? "N/A"} m</Text>
              </View>
              <View style={styles.metricPill}>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.textMuted} />
                <Text style={styles.metricPillText}>View details</Text>
              </View>
            </View>
            {!area.isConfigured ? <Text style={styles.areaWarning}>This study area needs admin location and radius configuration.</Text> : null}
            {area.userInside ? <Text style={styles.areaInside}>You are currently inside this area.</Text> : null}
          </Pressable>
        );
      })}
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
    gap: 14,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: 20,
    overflow: "hidden",
    gap: 12,
    ...theme.shadow.card,
  },
  bgOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.12)",
    top: -70,
    right: -50,
  },
  bgOrbTwo: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.14)",
    bottom: -30,
    left: -20,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: "#dbe7ff",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#dbe7ff",
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 18,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    color: theme.colors.neutralText,
  },
  helper: {
    color: theme.colors.primaryDeep,
    fontWeight: "700",
  },
  insideWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  insideChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: "#e0f6ef",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  insideChipText: {
    color: "#12604a",
    fontWeight: "700",
  },
  refreshBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...theme.shadow.soft,
  },
  refreshBtnText: {
    color: "#fff",
    fontWeight: "800",
  },
  listHeader: {
    gap: 4,
  },
  listTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  listSubtitle: {
    color: theme.colors.textMuted,
  },
  areaCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
    ...theme.shadow.soft,
  },
  areaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  areaTextWrap: {
    flex: 1,
    gap: 4,
  },
  areaTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  areaTitleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  areaTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 16,
  },
  areaNote: {
    color: theme.colors.textMuted,
  },
  areaMeta: {
    color: theme.colors.neutralText,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricPillText: {
    color: theme.colors.neutralText,
    fontWeight: "700",
  },
  areaInside: {
    color: theme.colors.successText,
    fontWeight: "800",
    marginTop: 4,
  },
  areaWarning: {
    color: theme.colors.warningText,
    fontWeight: "700",
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontWeight: "800",
  },
});
