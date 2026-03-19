import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";

export default function ParkingScreen({ user }) {
  const [slots, setSlots] = useState([]);
  const [mySlot, setMySlot] = useState(null);
  const username = String(user?.name || user?.email || user?.id || "testUser").trim();

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
    fetchSlots();
  }, [username]);

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

  const sideA = slots.filter((slot) => slot.side === "A");
  const sideB = slots.filter((slot) => slot.side === "B");
  const bikeSlots = slots.filter((slot) => slot.side === "BIKE");
  const availableCount = slots.filter((slot) => slot.status === "available").length;

  function renderRow(row) {
    return (
      <View style={styles.row}>
        {row.map((slot) => {
          const mine = mySlot === slot.slotId;
          return (
            <Pressable
              key={slot.slotId}
              onPress={() => handleSlotClick(slot.slotId, slot.status)}
              style={[
                styles.slot,
                slot.status === "available" ? styles.available : styles.occupied,
                mine && styles.mine,
              ]}
            >
              <Text style={styles.slotText}>{mine ? "YOURS" : slot.slotId}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderSection(title, data, chunkSize = 5) {
    const firstRow = data.slice(0, chunkSize);
    const secondRow = data.slice(chunkSize, chunkSize * 2);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {renderRow(firstRow)}
        {secondRow.length ? (
          <>
            <View style={styles.road}>
              <Text style={styles.roadText}>DRIVING LANE</Text>
            </View>
            {renderRow(secondRow)}
          </>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>Smart Parking</Text>
        <Text style={styles.subtitle}>Driver: {username}</Text>
        <Text style={styles.counter}>Available Slots: {availableCount}</Text>
      </View>

      {renderSection("SIDE A", sideA)}
      {renderSection("SIDE B", sideB)}
      {bikeSlots.length ? renderSection("BIKE AREA", bikeSlots.slice(0, 10)) : null}
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
    gap: 14,
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  title: {
    fontSize: 28,
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  counter: {
    fontSize: 18,
    marginTop: 10,
    color: theme.colors.primaryDeep,
  },
  section: {
    backgroundColor: "#20304c",
    padding: 15,
    borderRadius: 16,
  },
  sectionTitle: {
    color: "#fff",
    marginBottom: 10,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  slot: {
    height: 70,
    flex: 1,
    margin: 5,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  available: {
    backgroundColor: "#20b26b",
  },
  occupied: {
    backgroundColor: "#dc5f4c",
  },
  mine: {
    borderWidth: 3,
    borderColor: "#8fd5ff",
  },
  slotText: {
    color: "#fff",
  },
  road: {
    height: 38,
    marginVertical: 10,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  roadText: {
    color: "#fff",
    letterSpacing: 0.8,
  },
});
