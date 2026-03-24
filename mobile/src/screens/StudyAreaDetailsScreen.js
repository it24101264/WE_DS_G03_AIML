import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { studyAreaApi } from "../api/api";
import StatusBadge from "../components/StatusBadge";
import { theme } from "../constants/theme";

export default function StudyAreaDetailsScreen({ route }) {
  const { areaId } = route.params;
  const [area, setArea] = useState(null);

  async function loadArea() {
    try {
      const data = await studyAreaApi.getById(areaId);
      setArea(data);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  }

  useEffect(() => {
    loadArea();
  }, []);

  if (!area) return null;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{area.name}</Text>
        <View style={styles.badgeWrap}>
          <StatusBadge status={area.status} />
        </View>

        <Text style={styles.label}>Students Inside</Text>
        <Text style={styles.value}>{area.currentCount}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{area.status}</Text>

        <Text style={styles.label}>Radius</Text>
        <Text style={styles.value}>{area.radius} meters</Text>

        <Text style={styles.label}>Special Note</Text>
        <Text style={styles.value}>
          {area.specialNote ? area.specialNote : "No special note"}
        </Text>

        <Text style={styles.label}>Latitude</Text>
        <Text style={styles.value}>{area.latitude}</Text>

        <Text style={styles.label}>Longitude</Text>
        <Text style={styles.value}>{area.longitude}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.bg
  },
  content: {
    padding: 16
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 10
  },
  badgeWrap: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginTop: 10
  },
  value: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4
  }
});