import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { api } from "../api";
import { theme } from "../ui/theme";

const LOCATION_OPTIONS = [
  { value: "CANTEEN", label: "Canteen" },
  { value: "BIRD_NEST", label: "Bird Nest" },
  { value: "AR", label: "AR" },
  { value: "LIBRARY", label: "Library" },
  { value: "LAB_COMPLEX", label: "Lab Complex" },
  { value: "AUDITORIUM", label: "Auditorium" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "OTHER", label: "Other" },
];

const ITEM_CATEGORY_OPTIONS = [
  { value: "DEVICE", label: "Devices" },
  { value: "BAG", label: "Bags" },
  { value: "PURSE", label: "Purses" },
  { value: "ID_CARD", label: "ID Cards" },
  { value: "BOOK", label: "Books" },
  { value: "KEYS", label: "Keys" },
  { value: "OTHER", label: "Other" },
];

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function LostFoundPostScreen({ navigation, user }) {
  const [postType, setPostType] = useState("LOST");
  const [postCategory, setPostCategory] = useState("DEVICE");
  const [postLocation, setPostLocation] = useState("CANTEEN");
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [claimQuestion, setClaimQuestion] = useState("");
  const [postContact, setPostContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submitPost() {
    setLoading(true);
    setErr("");
    try {
      await api.createLostFoundItem({
        type: postType,
        itemCategory: postCategory,
        location: postLocation,
        title: postTitle,
        description: postDescription,
        claimQuestion,
        contactInfo: postContact,
      });
      navigation.goBack();
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.heroCard}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <Text style={styles.title}>Post Lost & Found Item</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Item Details</Text>

        <Text style={styles.helperLabel}>Post Type</Text>
        <View style={styles.chipRow}>
          <FilterChip label="Lost" active={postType === "LOST"} onPress={() => setPostType("LOST")} />
          <FilterChip label="Found" active={postType === "FOUND"} onPress={() => setPostType("FOUND")} />
        </View>

        <Text style={styles.helperLabel}>Item Category</Text>
        <View style={styles.chipRow}>
          {ITEM_CATEGORY_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={postCategory === option.value}
              onPress={() => setPostCategory(option.value)}
            />
          ))}
        </View>

        <Text style={styles.helperLabel}>Location</Text>
        <View style={styles.chipRow}>
          {LOCATION_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={postLocation === option.value}
              onPress={() => setPostLocation(option.value)}
            />
          ))}
        </View>

        <TextInput
          placeholder="Item title"
          placeholderTextColor={theme.colors.textMuted}
          value={postTitle}
          onChangeText={setPostTitle}
          style={styles.input}
        />
        <TextInput
          placeholder="Description"
          placeholderTextColor={theme.colors.textMuted}
          value={postDescription}
          onChangeText={setPostDescription}
          style={[styles.input, styles.multilineInput]}
          multiline
        />
        {postType === "FOUND" ? (
          <TextInput
            placeholder="Claim question for the owner"
            placeholderTextColor={theme.colors.textMuted}
            value={claimQuestion}
            onChangeText={setClaimQuestion}
            style={[styles.input, styles.multilineInput]}
            multiline
          />
        ) : null}
        <TextInput
          placeholder="Contact info"
          placeholderTextColor={theme.colors.textMuted}
          value={postContact}
          onChangeText={setPostContact}
          style={styles.input}
        />

        {err ? <Text style={styles.error}>{err}</Text> : null}

        <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={submitPost} disabled={loading}>
          <Text style={styles.primaryBtnText}>{loading ? "Posting..." : "Post Item"}</Text>
        </Pressable>
      </View>
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
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: "#e8eeff",
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.soft,
  },
  cardTitle: {
    fontWeight: "500",
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 2,
  },
  helperLabel: {
    color: theme.colors.text,
    fontWeight: "500",
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textMuted,
    fontWeight: "500",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
  },
  multilineInput: {
    minHeight: 74,
    textAlignVertical: "top",
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 11,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "500",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});
