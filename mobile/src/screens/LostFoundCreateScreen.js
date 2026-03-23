import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "../api";
import { theme } from "../ui/theme";
import { CATEGORY_OPTIONS, LOCATION_OPTIONS, POST_TYPE_OPTIONS, formatLocation } from "./lostFoundShared";

function countWords(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export default function LostFoundCreateScreen({ navigation, route }) {
  const editingItem = route?.params?.item || null;
  const isEditMode = useMemo(() => Boolean(editingItem?.id), [editingItem]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("canteen");
  const [type, setType] = useState("LOST");
  const [category, setCategory] = useState("device");
  const [claimQuestion, setClaimQuestion] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editingItem) return;
    setTitle(editingItem.title || "");
    setDescription(editingItem.description || "");
    setLocation(editingItem.location || "canteen");
    setType(editingItem.type || "LOST");
    setCategory(editingItem.category || "device");
    setClaimQuestion(editingItem.claimQuestion || "");
    setImageUrl(editingItem.imageUrl || "");
    setError("");
  }, [editingItem]);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach an item image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.45,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.base64) {
      setError("Could not read the selected image");
      return;
    }

    const mimeType = asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    setImageUrl(`data:${mimeType};base64,${asset.base64}`);
    setError("");
  }

  async function handleCreate() {
    setLoading(true);
    setError("");
    const trimmedDescription = description.trim();
    const trimmedClaimQuestion = claimQuestion.trim();

    if (countWords(trimmedDescription) <= 5) {
      setError("Description must be longer than 5 words");
      setLoading(false);
      return;
    }

    if (type === "FOUND" && !trimmedClaimQuestion) {
      setError("Found posts must include a claim question");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title,
        description: trimmedDescription,
        location,
        type,
        category,
        claimQuestion: trimmedClaimQuestion,
        imageUrl,
      };
      if (isEditMode) {
        await api.updateLostFoundItem(editingItem.id, payload);
      } else {
        await api.createLostFoundItem(payload);
      }
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

        <Text style={styles.helperLabel}>Item Image</Text>
        <Text style={styles.helperText}>Add an optional photo so others can identify the item faster.</Text>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" /> : null}
        <View style={styles.imageActionRow}>
          <Pressable style={styles.secondaryBtn} onPress={handlePickImage}>
            <Text style={styles.secondaryBtnText}>{imageUrl ? "Replace Image" : "Choose Image"}</Text>
          </Pressable>
          {imageUrl ? (
            <Pressable style={styles.removeBtn} onPress={() => setImageUrl("")}>
              <Text style={styles.removeBtnText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>

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
          <Text style={styles.primaryBtnText}>{loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Post"}</Text>
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
  helperText: { color: theme.colors.textMuted, lineHeight: 20 },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  imageActionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
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
  secondaryBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: { color: theme.colors.primaryDeep, fontWeight: "800" },
  removeBtn: {
    backgroundColor: "#fff1f1",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "#f1b6b6",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  removeBtnText: { color: "#b42318", fontWeight: "800" },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  btnDisabled: { opacity: 0.7 },
  error: { color: theme.colors.danger, fontSize: 13 },
});
