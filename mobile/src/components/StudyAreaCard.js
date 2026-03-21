import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import StatusBadge from "./StatusBadge";
import { theme } from "../constants/theme";

export default function StudyAreaCard({ area, onPress }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{area.name}</Text>
          <Text style={styles.note}>
            {area.specialNote ? area.specialNote : "No special note"}
          </Text>
        </View>
        <StatusBadge status={area.status} />
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.info}>Students: {area.currentCount}</Text>
        <Text style={styles.info}>Radius: {area.radius} m</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.text
  },
  note: {
    color: theme.colors.textMuted,
    marginTop: 2
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  info: {
    color: theme.colors.text,
    fontWeight: "600"
  }
});