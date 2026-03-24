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

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

export default function StudentStudyAreaScreen({ navigation }) {
  const [areas, setAreas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [locationLabel, setLocationLabel] = useState("Location not detected");
  const [userCoords, setUserCoords] = useState(null);

  async function loadAreas() {
    const data = await studyAreaApi.getAll();
    const nextAreas = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    setAreas(nextAreas);
    setError("");
  }

  async function requestLocationOnOpen() {
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              setUserCoords(coords);
              setLocationLabel("Location enabled from browser");
              resolve(coords);
            },
            () => reject(new Error("Browser location permission denied")),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 30000
            }
          );
        });
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationLabel("Location permission denied");
        Alert.alert(
          "Location Permission Required",
          "Please allow location permission to use the study area feature."
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setLocationLabel("Location service disabled");
        Alert.alert(
          "Turn On Location",
          "Please turn on location services on your phone to use this feature."
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setUserCoords({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });
      setLocationLabel("Location enabled");
      console.log("Student location:", currentLocation.coords);
    } catch (error) {
      setLocationLabel("Location unavailable");
      Alert.alert("Location Error", error.message);
    }
  }

  const sortedAreas = userCoords
    ? [...areas]
        .map((area) => ({
          ...area,
          distanceMeters: distanceInMeters(
            userCoords.latitude,
            userCoords.longitude,
            Number(area.latitude),
            Number(area.longitude)
          )
        }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
    : areas;

  async function refreshAll() {
    try {
      setRefreshing(true);
      await loadAreas();
      await requestLocationOnOpen();
    } catch (error) {
      setError(error.message || "Could not load study areas");
      Alert.alert("Error", error.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    requestLocationOnOpen();
    loadAreas().catch((error) => {
      setError(error.message || "Could not load study areas");
    });
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
      <Text style={styles.helperText}>{locationLabel}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {sortedAreas.length === 0 ? (
        <Text style={styles.emptyText}>No study areas found yet. Open Admin Study Areas and add a location.</Text>
      ) : null}

      {sortedAreas.map((area) => (
        <StudyAreaCard
          key={area._id}
          area={{
            ...area,
            specialNote:
              area.distanceMeters !== undefined
                ? `${area.specialNote ? `${area.specialNote} | ` : ""}${area.distanceMeters}m away`
                : area.specialNote
          }}
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
  },
  errorText: {
    color: theme.colors.crowdedText,
    marginBottom: 12,
    fontWeight: "700"
  },
  helperText: {
    color: theme.colors.textMuted,
    marginBottom: 10,
    fontWeight: "700"
  },
  emptyText: {
    color: theme.colors.textMuted,
    marginBottom: 12
  }
});