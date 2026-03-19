import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";
import { CATEGORY_OPTIONS, LOCATION_OPTIONS, POST_TYPE_OPTIONS, formatLocation } from "./lostFoundShared";

export default function LostFoundCreateScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("canteen");
  const [type, setType] = useState("LOST");
  const [category, setCategory] = useState("device");
  const [claimQuestion, setClaimQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      await api.createLostFoundItem({ title, description, location, type, category, claimQuestion });
      navigation.goBack();
    } catch (err) {
      setError(err.message || "Could not create post");
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create a Post</Text>

        <View style={styles.typeRow}>
          {POST_TYPE_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.typeChip, type === option && styles.typeChipActive]}
              onPress={() => setType(option)}
            >
              <Text style={[styles.typeChipText, type === option && styles.typeChipTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          placeholder="Title"
          placeholderTextColor={theme.colors.textMuted}
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <TextInput
          placeholder="Description"
          placeholderTextColor={theme.colors.textMuted}
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multilineInput]}
          multiline
        />

        {type === "FOUND" ? (
          <>
            <Text style={styles.helperLabel}>Claim Question</Text>
            <TextInput
              placeholder="Add a question only the real owner can answer"
              placeholderTextColor={theme.colors.textMuted}
              value={claimQuestion}
              onChangeText={setClaimQuestion}
              style={[styles.input, styles.multilineInput]}
              multiline
            />
          </>
        ) : null}

        <Text style={styles.helperLabel}>Location</Text>
        <View style={styles.filterWrap}>
          {LOCATION_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.filterChip, location === option && styles.filterChipActive]}
              onPress={() => setLocation(option)}
            >
              <Text style={[styles.filterChipText, location === option && styles.filterChipTextActive]}>
                {formatLocation(option)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.helperLabel}>Item Type</Text>
        <View style={styles.filterWrap}>
          {CATEGORY_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.filterChip, category === option && styles.filterChipActive]}
              onPress={() => setCategory(option)}
            >
              <Text style={[styles.filterChipText, category === option && styles.filterChipTextActive]}>
                {formatLocation(option)}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={handleCreate} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? "Saving..." : "Create Post"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.bg },
  pageContent: { padding: 16, paddingBottom: 28 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.soft,
  },
  cardTitle: { fontWeight: "800", color: theme.colors.text, fontSize: 16, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  multilineInput: { minHeight: 84, textAlignVertical: "top" },
  helperLabel: { color: theme.colors.text, fontWeight: "700", marginTop: 4 },
  typeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typeChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  typeChipText: { color: theme.colors.textMuted, fontWeight: "700" },
  typeChipTextActive: { color: "#ffffff" },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#ffffff",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: "#deecff", borderColor: theme.colors.primary },
  filterChipText: { color: theme.colors.textMuted, fontWeight: "700" },
  filterChipTextActive: { color: theme.colors.primaryDeep },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 11,
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  btnDisabled: { opacity: 0.7 },
  error: { color: theme.colors.danger, fontSize: 13 },
});
