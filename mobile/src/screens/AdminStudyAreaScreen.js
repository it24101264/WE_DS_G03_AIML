import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert
} from "react-native";
import { studyAreaApi } from "../api/api";
import { theme } from "../constants/theme";

export default function AdminStudyAreaScreen() {
  const [areas, setAreas] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("");
  const [specialNote, setSpecialNote] = useState("");

  async function loadAreas() {
    try {
      const data = await studyAreaApi.getAll();
      console.log("Loaded areas:", data);
      setAreas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Load areas error:", error);
      Alert.alert("Error", error.message);
    }
  }

  useEffect(() => {
    loadAreas();
  }, []);

  function clearForm() {
    setEditingId(null);
    setName("");
    setLatitude("");
    setLongitude("");
    setRadius("");
    setSpecialNote("");
  }

  function editArea(area) {
    setEditingId(area._id);
    setName(area.name || "");
    setLatitude(String(area.latitude || ""));
    setLongitude(String(area.longitude || ""));
    setRadius(String(area.radius || ""));
    setSpecialNote(area.specialNote || "");
  }

  async function saveArea() {
    console.log("Create/Update button clicked");

    if (!name.trim() || !latitude.trim() || !longitude.trim() || !radius.trim()) {
      Alert.alert("Validation", "Name, latitude, longitude and radius are required.");
      return;
    }

    const payload = {
      name: name.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius: Number(radius),
      specialNote: specialNote.trim()
    };

    console.log("Payload:", payload);

    if (
      Number.isNaN(payload.latitude) ||
      Number.isNaN(payload.longitude) ||
      Number.isNaN(payload.radius)
    ) {
      Alert.alert("Validation", "Latitude, longitude and radius must be valid numbers.");
      return;
    }

    try {
      if (editingId) {
        const updated = await studyAreaApi.update(editingId, payload);
        console.log("Updated area:", updated);
        Alert.alert("Success", "Study area updated successfully");
      } else {
        const created = await studyAreaApi.create(payload);
        console.log("Created area:", created);
        Alert.alert("Success", "Study area created successfully");
      }

      clearForm();
      await loadAreas();
    } catch (error) {
      console.log("Save area error:", error);
      Alert.alert("Error", error.message);
    }
  }

  async function deleteArea(id) {
    try {
      await studyAreaApi.delete(id);
      Alert.alert("Success", "Study area deleted");
      await loadAreas();
    } catch (error) {
      console.log("Delete area error:", error);
      Alert.alert("Error", error.message);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <Text style={styles.heroTitle}>Admin Study Areas</Text>
        <Text style={styles.heroSubtitle}>
          Add, edit and remove study areas in the campus.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>
          {editingId ? "Edit Study Area" : "Add New Study Area"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Study area name *"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Latitude *"
          value={latitude}
          onChangeText={setLatitude}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Longitude *"
          value={longitude}
          onChangeText={setLongitude}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Radius in meters *"
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Special note (optional)"
          value={specialNote}
          onChangeText={setSpecialNote}
        />

        <Pressable style={styles.primaryBtn} onPress={saveArea}>
          <Text style={styles.primaryBtnText}>
            {editingId ? "Update Study Area" : "Create Study Area"}
          </Text>
        </Pressable>

        <Pressable style={styles.clearBtn} onPress={clearForm}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Existing Study Areas</Text>

      {areas.map((area) => (
        <View key={area._id} style={styles.areaCard}>
          <Text style={styles.areaName}>{area.name}</Text>
          <Text style={styles.areaText}>Students: {area.currentCount}</Text>
          <Text style={styles.areaText}>Status: {area.status}</Text>
          <Text style={styles.areaText}>Radius: {area.radius} m</Text>
          <Text style={styles.areaText}>
            Note: {area.specialNote ? area.specialNote : "No special note"}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable style={styles.editBtn} onPress={() => editArea(area)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>

            <Pressable style={styles.deleteBtn} onPress={() => deleteArea(area._id)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>
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
    marginTop: 6
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 12
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 10
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800"
  },
  clearBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  clearBtnText: {
    color: theme.colors.text,
    fontWeight: "800"
  },
  areaCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft
  },
  areaName: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6
  },
  areaText: {
    color: theme.colors.textMuted,
    marginBottom: 4
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  editBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    alignItems: "center"
  },
  editBtnText: {
    color: theme.colors.text,
    fontWeight: "800"
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: theme.colors.crowdedBg,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    alignItems: "center"
  },
  deleteBtnText: {
    color: theme.colors.crowdedText,
    fontWeight: "800"
  }
});