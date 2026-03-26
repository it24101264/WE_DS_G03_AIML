import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { api } from "../api";
import { theme } from "../ui/theme";

function densityPalette(level) {
  if (level === "Crowded") {
    return { bg: "#ffe2e0", text: "#a1261d" };
  }
  if (level === "Moderate") {
    return { bg: "#fff0cf", text: "#8a6116" };
  }
  return { bg: "#ddf8ee", text: "#146548" };
}

function SummaryCard({ label, value }) {
  return (
    <View style={styles.summaryCard}>
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

export default function StudyAreasScreen({ user }) {
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
          <SummaryCard label="Free" value={summary.free || 0} />
          <SummaryCard label="Moderate" value={summary.moderate || 0} />
          <SummaryCard label="Crowded" value={summary.crowded || 0} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Tracking Status</Text>
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
                <Text style={styles.insideChipText}>{area.name}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Pressable style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshBtnText}>Refresh areas</Text>
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Campus Study Area List</Text>
        <Text style={styles.listSubtitle}>{locationLabel}</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : null}

      {areas.map((area) => {
        const palette = densityPalette(area.density);
        return (
          <View key={area.id} style={styles.areaCard}>
            <View style={styles.areaTopRow}>
              <View style={styles.areaTextWrap}>
                <Text style={styles.areaTitle}>{area.name}</Text>
                <Text style={styles.areaNote}>{area.note || "No special note"}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: palette.bg }]}>
                <Text style={[styles.badgeText, { color: palette.text }]}>{area.density}</Text>
              </View>
            </View>

            <Text style={styles.areaMeta}>Students: {area.studentCount}</Text>
            <Text style={styles.areaMeta}>Estimated capacity: {area.capacityEstimate || 0}</Text>
            <Text style={styles.areaMeta}>Radius: {area.radiusMeters ?? "N/A"} m</Text>
            {!area.isConfigured ? <Text style={styles.areaWarning}>This study area needs admin location and radius configuration.</Text> : null}
            {area.userInside ? <Text style={styles.areaInside}>You are currently inside this area.</Text> : null}
          </View>
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
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
    gap: 12,
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
  },
  cardTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 18,
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
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    gap: 4,
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
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontWeight: "800",
  },
});
