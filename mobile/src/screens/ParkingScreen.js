import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { api } from "../api";
import { theme } from "../ui/theme";

export default function ParkingScreen({ user }) {
  const [slots, setSlots] = useState([]);
  const [mySlot, setMySlot] = useState(null);
  const username = String(user?.name || user?.email || user?.id || "testUser").trim();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();

  async function fetchSlots() {
    try {
      const [slotRes, mySlotRes] = await Promise.all([
        api.parkingSlots(),
        api.myParkingSlot(username),
      ]);
      setSlots(slotRes.data || []);
      setMySlot(mySlotRes.data?.slotId || null);
    } catch (err) {
      Alert.alert("Error", err.message || "Cannot connect to parking backend");
    }
  }

  useEffect(() => {
    if (!isFocused) return;
    fetchSlots();
  }, [username, isFocused]);

  useEffect(() => {
    if (!isFocused) return undefined;

    const intervalId = setInterval(() => {
      fetchSlots();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [username, isFocused]);

  async function handleSlotClick(slotId, status) {
    try {
      if (mySlot && mySlot !== slotId) {
        Alert.alert("Leave your current slot first.");
        return;
      }

      if (status === "occupied" && mySlot !== slotId) {
        Alert.alert("Slot already occupied.");
        return;
      }

      if (mySlot === slotId) {
        const res = await api.leaveParking({ username, slotId });
        Alert.alert(res.message || "Vehicle left successfully");
        setMySlot(null);
        await fetchSlots();
        return;
      }

      const res = await api.parkVehicle({ username, slotId });
      Alert.alert(res.message || "Vehicle parked successfully");
      setMySlot(slotId);
      await fetchSlots();
    } catch (err) {
      Alert.alert("Error", err.message || "Parking action failed");
    }
  }

  function slotNum(id) {
    const match = String(id || "").match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  const availableCount = useMemo(
    () => slots.filter((slot) => slot.status === "available").length,
    [slots]
  );
  const occupiedCount = useMemo(
    () => slots.filter((slot) => slot.status === "occupied").length,
    [slots]
  );
  const totalSlots = slots.length;
  const occupancyPct = totalSlots > 0 ? Math.round((occupiedCount / totalSlots) * 100) : 0;

  const bikeSlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.side === "BIKE")
        .sort((a, b) => slotNum(a.slotId) - slotNum(b.slotId)),
    [slots]
  );
  const carA = useMemo(
    () =>
      slots
        .filter((slot) => slot.side === "A")
        .sort((a, b) => slotNum(a.slotId) - slotNum(b.slotId)),
    [slots]
  );
  const carB = useMemo(
    () =>
      slots
        .filter((slot) => slot.side === "B")
        .sort((a, b) => slotNum(a.slotId) - slotNum(b.slotId)),
    [slots]
  );

  const bikeRows = useMemo(() => chunk(bikeSlots, 10), [bikeSlots]);
  const carARows = useMemo(() => chunk(carA, 10), [carA]);
  const carBRows = useMemo(() => chunk(carB, 10), [carB]);

  const slotById = useMemo(() => new Map(slots.map((slot) => [slot.slotId, slot])), [slots]);
  const canvasW = Math.max(width, 960);
  const canvasH = 600;

  function SlotBox({ slotId, size }) {
    const slot = slotById.get(slotId);
    if (!slot) return null;

    const isMine = mySlot === slot.slotId;
    const bgStyle = isMine
      ? styles.slotMine
      : slot.status === "available"
        ? styles.slotAvail
        : styles.slotOcc;
    const tileStyle = size === "bike" ? styles.bikeTile : styles.carTile;

    return (
      <Pressable
        onPress={() => handleSlotClick(slot.slotId, slot.status)}
        hitSlop={10}
        style={[styles.tileBase, tileStyle, bgStyle]}
      >
        {size === "car" && slot.status === "occupied" && !isMine ? <View style={styles.carSilhouette} /> : null}
        {size === "bike" && slot.status === "occupied" && !isMine ? <View style={styles.bikeSilhouette} /> : null}
        {isMine ? (
          <View style={styles.myVehiclePin}>
            <Text style={styles.myVehiclePinText}>*</Text>
          </View>
        ) : null}
        <Text style={[styles.tileText, size === "bike" ? styles.bikeText : styles.carText]}>
          {isMine ? "YOU" : slot.slotId}
        </Text>
        {size === "car" && !isMine ? <View style={styles.slotNumberStrip} /> : null}
      </Pressable>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>CAMPUS</Text>
            <Text style={styles.title}>Smart Parking</Text>
            <Text style={styles.subtitle}>Driver: {username}</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={fetchSlots}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statValue}>{availableCount}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={[styles.statCard, styles.statCardRed]}>
            <Text style={styles.statValue}>{occupiedCount}</Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
          <View style={[styles.statCard, styles.statCardGray]}>
            <Text style={styles.statValue}>{totalSlots}</Text>
            <Text style={styles.statLabel}>Total Slots</Text>
          </View>
          <View style={[styles.statCard, styles.statCardBlue]}>
            <Text style={styles.statValue}>{occupancyPct}%</Text>
            <Text style={styles.statLabel}>Full</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Overview</Text>
            <Text style={styles.sectionTitle}>Parking status</Text>
          </View>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{mySlot ? `Your slot: ${mySlot}` : "No active slot"}</Text>
          </View>
        </View>

        <View style={styles.occupancyBarWrap}>
          <View style={styles.occupancyBarBg}>
            <View style={[styles.occupancyBarFill, { width: `${occupancyPct}%` }]} />
          </View>
          <Text style={styles.occupancyBarLabel}>Lot occupancy: {occupancyPct}%</Text>
        </View>

        <View style={styles.legend}>
          {[
            { color: "#4ade80", label: "Available" },
            { color: "#f87171", label: "Occupied" },
            { color: "#60a5fa", label: "Your Slot" },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Map</Text>
          <Text style={styles.sectionTitle}>Lot layout</Text>
        </View>
        <Text style={styles.mapHint}>Tap a slot to park. Tap your slot to leave.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={[styles.canvas, { width: canvasW, height: canvasH }]}>
          <View style={[StyleSheet.absoluteFillObject, styles.asphalt]} />

          {Array.from({ length: 20 }).map((_, i) => (
            <View key={`hg${i}`} style={[styles.gridLineH, { top: i * 30 }]} />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <View key={`vg${i}`} style={[styles.gridLineV, { left: i * 30 }]} />
          ))}

          <View style={[styles.mainRoad, { right: 0, top: 0, width: 80, height: canvasH }]} />
          <View style={[styles.centerLineV, { right: 37, top: 20, height: canvasH - 40 }]} />
          <View style={[styles.roadSignBadge, { right: 8, top: canvasH / 2 - 60 }]}>
            <Text style={styles.roadSignText}>BACK GATE{"\n"}MAIN ROAD</Text>
          </View>
          <View style={[styles.arrowBadge, styles.arrowGreen, { right: 88, top: 150 }]}>
            <Text style={styles.arrowText}>ENTRY</Text>
          </View>
          <View style={[styles.arrowBadge, styles.arrowOrange, { right: 88, top: 360 }]}>
            <Text style={styles.arrowText}>EXIT</Text>
          </View>

          <View style={[styles.mainRoad, { left: 0, top: canvasH / 2 - 30, width: canvasW - 80, height: 60 }]} />
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={`dash${i}`} style={[styles.dashH, { left: 30 + i * 65, top: canvasH / 2 - 3 }]} />
          ))}
          <View style={[styles.roadSignBadge, { left: 18, top: canvasH / 2 + 32 }]}>
            <Text style={styles.roadSignText}>CAMPUS ROAD FROM FOOT</Text>
          </View>

          {Array.from({ length: 5 }).map((_, i) => (
            <View key={`cw${i}`} style={[styles.crosswalkStripe, { left: 318 + i * 10, top: canvasH / 2 - 30, height: 60 }]} />
          ))}

          <View style={[styles.buildingBox, { left: 360, top: canvasH / 2 + 32, width: 110, height: 60 }]}>
            <View style={styles.buildingRoof} />
            <Text style={styles.buildingLabel}>ID VALIDATION{"\n"}ROOM</Text>
          </View>

          <View style={[styles.spurRoad, { left: 145, top: 30, height: canvasH / 2 - 30 }]} />
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={`spd${i}`} style={[styles.dashV, { left: 155, top: 40 + i * 44 }]} />
          ))}
          <View style={[styles.roadSignBadge, { left: 162, top: 90 }]}>
            <Text style={styles.roadSignText}>ACCESS{"\n"}ROAD</Text>
          </View>
          <View style={[styles.arrowBadge, styles.arrowGreen, { left: 162, top: 44 }]}>
            <Text style={styles.arrowText}>BIKE IN</Text>
          </View>

          <View style={[styles.parkingZone, { left: 18, top: 30, width: 310, height: canvasH / 2 - 60 }]}>
            <View style={styles.zoneHeader}>
              <View style={styles.zoneHeaderAccent} />
              <Text style={styles.zoneHeaderText}>MOTORCYCLE PARKING</Text>
            </View>
            <View style={styles.bayLinesContainer}>
              {bikeRows.map((row, ri) => (
                <View key={ri} style={styles.bayRow}>
                  <View style={styles.bayGutter} />
                  <View style={styles.baySlots}>
                    {row.map((slot) => (
                      <SlotBox key={slot.slotId} slotId={slot.slotId} size="bike" />
                    ))}
                  </View>
                  <View style={styles.bayGutter} />
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.parkingZone, { left: 360, top: 30, right: 90, height: canvasH / 2 - 60 }]}>
            <View style={styles.zoneHeader}>
              <View style={[styles.zoneHeaderAccent, { backgroundColor: "#60a5fa" }]} />
              <Text style={styles.zoneHeaderText}>CAR PARK - SIDE A</Text>
            </View>
            <View style={styles.aisleRoad} />
            <View style={styles.bayLinesContainer}>
              {carARows.map((row, ri) => (
                <View key={ri} style={styles.bayRow}>
                  <View style={styles.bayGutter} />
                  <View style={styles.baySlots}>
                    {row.map((slot) => (
                      <SlotBox key={slot.slotId} slotId={slot.slotId} size="car" />
                    ))}
                  </View>
                  <View style={styles.bayGutter} />
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.parkingZone, { left: 360, top: canvasH / 2 + 32, right: 90, height: canvasH / 2 - 50 }]}>
            <View style={styles.zoneHeader}>
              <View style={[styles.zoneHeaderAccent, { backgroundColor: "#a78bfa" }]} />
              <Text style={styles.zoneHeaderText}>CAR PARK - SIDE B</Text>
            </View>
            <View style={styles.aisleRoad} />
            <View style={styles.bayLinesContainer}>
              {carBRows.map((row, ri) => (
                <View key={ri} style={styles.bayRow}>
                  <View style={styles.bayGutter} />
                  <View style={styles.baySlots}>
                    {row.map((slot) => (
                      <SlotBox key={slot.slotId} slotId={slot.slotId} size="car" />
                    ))}
                  </View>
                  <View style={styles.bayGutter} />
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.compass, { left: 18, bottom: 16 }]}>
            <Text style={styles.compassN}>N</Text>
            <Text style={styles.compassRose}>^</Text>
          </View>
          <View style={[styles.scaleBar, { left: 70, bottom: 20 }]}>
            <View style={styles.scaleBarLine} />
            <Text style={styles.scaleBarLabel}>Scale</Text>
          </View>
        </View>
      </ScrollView>

      <Text style={styles.footer}>Parking colors and road layout remain unchanged for clarity.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  headerSub: { fontSize: 10, color: "#dbe7ff", fontWeight: "800", letterSpacing: 3 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#f8fbff",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#e8eeff",
    marginTop: 4,
    fontSize: 13,
    fontWeight: "500",
  },
  refreshBtn: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  refreshText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statCardGreen: { backgroundColor: "rgba(16,185,129,0.18)", borderColor: "rgba(255,255,255,0.16)" },
  statCardRed: { backgroundColor: "rgba(248,113,113,0.18)", borderColor: "rgba(255,255,255,0.16)" },
  statCardGray: { backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.16)" },
  statCardBlue: { backgroundColor: "rgba(96,165,250,0.2)", borderColor: "rgba(255,255,255,0.16)" },
  statValue: { fontSize: 26, fontWeight: "900", color: "#f8fbff" },
  statLabel: { fontSize: 10, color: "#e5ecff", fontWeight: "700", marginTop: 2, letterSpacing: 1 },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadow.soft,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionEyebrow: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  sectionBadge: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionBadgeText: {
    color: theme.colors.primaryDeep,
    fontSize: 12,
    fontWeight: "800",
  },
  occupancyBarWrap: { gap: 5 },
  occupancyBarBg: {
    height: 8,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 99,
    overflow: "hidden",
  },
  occupancyBarFill: {
    height: "100%",
    backgroundColor: "#ef4444",
    borderRadius: 99,
  },
  occupancyBarLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "700",
    letterSpacing: 1,
  },
  legend: {
    flexDirection: "row",
    gap: 20,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendSwatch: { width: 20, height: 12, borderRadius: 3 },
  legendText: { color: theme.colors.textMuted, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 },
  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 2,
  },
  mapHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    maxWidth: 180,
  },
  canvas: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: "#334155",
    ...theme.shadow.soft,
  },
  asphalt: { backgroundColor: "#1c2333" },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  mainRoad: {
    position: "absolute",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
  },
  centerLineV: {
    position: "absolute",
    width: 3,
    backgroundColor: "#fbbf24",
    opacity: 0.6,
    borderRadius: 2,
  },
  dashH: {
    position: "absolute",
    width: 40,
    height: 5,
    backgroundColor: "#fbbf24",
    opacity: 0.6,
    borderRadius: 2,
  },
  roadSignBadge: {
    position: "absolute",
    backgroundColor: "#1e3a5f",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  roadSignText: {
    color: "#93c5fd",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  arrowBadge: {
    position: "absolute",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  arrowGreen: { backgroundColor: "#052e16", borderColor: "#16a34a" },
  arrowOrange: { backgroundColor: "#2d1700", borderColor: "#ea580c" },
  arrowText: { color: "#f1f5f9", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  crosswalkStripe: {
    position: "absolute",
    width: 7,
    backgroundColor: "#f1f5f9",
    opacity: 0.15,
  },
  buildingBox: {
    position: "absolute",
    backgroundColor: "#374151",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4b5563",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  buildingRoof: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: "#6b7280",
  },
  buildingLabel: {
    color: "#d1d5db",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  parkingZone: {
    position: "absolute",
    backgroundColor: "#263145",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
    padding: 8,
  },
  zoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  zoneHeaderAccent: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#4ade80",
  },
  zoneHeaderText: {
    color: "#e2e8f0",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  aisleRoad: {
    position: "absolute",
    right: 8,
    top: 30,
    bottom: 8,
    width: 14,
    backgroundColor: "#111827",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#374151",
  },
  bayLinesContainer: { gap: 5 },
  bayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  bayGutter: {
    width: 2,
    height: "100%",
    backgroundColor: "#ffffff",
    opacity: 0.07,
  },
  baySlots: {
    flexDirection: "row",
    flex: 1,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tileBase: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  bikeTile: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(0,0,0,0.3)",
  },
  carTile: {
    width: 34,
    height: 34,
    borderRadius: 6,
    borderBottomWidth: 3,
    borderBottomColor: "rgba(0,0,0,0.3)",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.08)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
  },
  slotAvail: { backgroundColor: "#16a34a" },
  slotOcc: { backgroundColor: "#dc2626" },
  slotMine: {
    backgroundColor: "#2563eb",
    borderWidth: 3,
    borderColor: "#93c5fd",
  },
  tileText: { color: "#fff", fontWeight: "900", zIndex: 2 },
  bikeText: { fontSize: 6, letterSpacing: 0 },
  carText: { fontSize: 8, letterSpacing: 0 },
  carSilhouette: {
    position: "absolute",
    top: 5,
    left: 5,
    right: 5,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 3,
  },
  bikeSilhouette: {
    position: "absolute",
    top: 4,
    left: 5,
    right: 5,
    bottom: 5,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 2,
  },
  myVehiclePin: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fbbf24",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  myVehiclePinText: { fontSize: 5, color: "#000" },
  slotNumberStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 1,
  },
  compass: {
    position: "absolute",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  compassN: { fontSize: 7, color: "#ef4444", fontWeight: "900", lineHeight: 10 },
  compassRose: { fontSize: 12, color: "#f1f5f9", lineHeight: 14 },
  spurRoad: {
    position: "absolute",
    width: 22,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
  },
  dashV: {
    position: "absolute",
    width: 5,
    height: 20,
    backgroundColor: "#fbbf24",
    opacity: 0.6,
    borderRadius: 2,
  },
  scaleBar: { position: "absolute", alignItems: "center" },
  scaleBarLine: {
    width: 60,
    height: 4,
    backgroundColor: "#64748b",
    borderRadius: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#f1f5f9",
  },
  scaleBarLabel: { fontSize: 7, color: "#64748b", fontWeight: "700", marginTop: 2, letterSpacing: 1 },
  footer: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
