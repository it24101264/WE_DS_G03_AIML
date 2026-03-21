import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Alert,
  StyleSheet,
  RefreshControl,
  Platform
} from "react-native";
import * as Location from "expo-location";
import { studyAreaApi } from "../api/api";
import StudyAreaCard from "../components/StudyAreaCard";
import { theme } from "../constants/theme";

export default function StudentStudyAreaScreen({ navigation }) {
  const [areas, setAreas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAreas() {
    const data = await studyAreaApi.getAll();
    setAreas(data);
  }

  async function requestLocationOnOpen() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please allow location permission to use the study area feature."
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        Alert.alert(
          "Turn On Location",
          "Please turn on location services on your phone to use this feature."
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      console.log("Student location:", currentLocation.coords);
    } catch (error) {
      Alert.alert("Location Error", error.message);
    }
  }

  async function refreshAll() {
    try {
      setRefreshing(true);
      await loadAreas();
      await requestLocationOnOpen();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    requestLocationOnOpen();
    loadAreas();
  }, []);

  const freeCount = areas.filter((a) => a.status === "Free").length;
  const moderateCount = areas.filter((a) => a.status === "Moderate").length;
  const crowdedCount = areas.filter((a) => a.status === "Crowded").length;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
      }
    >
      <View style={styles.hero}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <Text style={styles.heroTitle}>Study Areas</Text>
        <Text style={styles.heroSubtitle}>
          View study areas in the campus and their crowd levels.
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{freeCount}</Text>
            <Text style={styles.summaryLabel}>Free</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{moderateCount}</Text>
            <Text style={styles.summaryLabel}>Moderate</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{crowdedCount}</Text>
            <Text style={styles.summaryLabel}>Crowded</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Campus Study Area List</Text>

      {areas.map((area) => (
        <StudyAreaCard
          key={area._id}
          area={area}
          onPress={() =>
            navigation.navigate("StudyAreaDetails", { areaId: area._id })
          }
        />
      ))}
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
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    ...theme.shadow.soft
  },
  circle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.14)",
    top: -70,
    right: -40
  },
  circle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.12)",
    bottom: -40,
    left: -30
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff"
  },
  heroSubtitle: {
    color: "#e8eeff",
    marginTop: 6,
    marginBottom: 14
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: theme.radius.md,
    padding: 12
  },
  summaryValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900"
  },
  summaryLabel: {
    color: "#e8eeff",
    marginTop: 4,
    textAlign: "center"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 12
  }
});