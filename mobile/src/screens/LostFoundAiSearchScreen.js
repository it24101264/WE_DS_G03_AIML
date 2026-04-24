import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { LostFoundCard, POST_TYPE_OPTIONS } from "./lostFoundShared";

const SEARCH_TARGET_OPTIONS = [
  { label: "Found Posts", value: "FOUND", helper: "Best for items you lost" },
  { label: "Lost Posts", value: "LOST", helper: "Best for items you found" },
];

function ScorePill({ score }) {
  const percent = Math.max(0, Math.min(100, Math.round((Number(score) || 0) * 100)));
  return (
    <View style={styles.scorePill}>
      <MaterialCommunityIcons name="brain" size={14} color={theme.colors.primaryDeep} />
      <Text style={styles.scorePillText}>{percent}% match</Text>
    </View>
  );
}

function MatchReasonChips({ reasons }) {
  const visibleReasons = Array.isArray(reasons) ? reasons.filter(Boolean).slice(0, 3) : [];
  if (!visibleReasons.length) return null;

  return (
    <View style={styles.reasonWrap}>
      {visibleReasons.map((reason) => (
        <View key={reason} style={styles.reasonChip}>
          <MaterialCommunityIcons name="check-decagram-outline" size={13} color={theme.colors.primaryDeep} />
          <Text style={styles.reasonChipText}>{reason}</Text>
        </View>
      ))}
    </View>
  );
}

export default function LostFoundAiSearchScreen({ navigation }) {
  const [mode, setMode] = useState("description");
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState("FOUND");
  const [myPosts, setMyPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "post") return;
    setLoadingPosts(true);
    api
      .myLostFoundItems()
      .then((res) => setMyPosts(res.data || []))
      .catch((err) => setError(err.message || "Could not load your posts"))
      .finally(() => setLoadingPosts(false));
  }, [mode]);

  async function runSearch() {
    const payload = { limit: 8, targetType };

    if (mode === "description") {
      if (!description.trim()) {
        setError("Enter a description to search.");
        return;
      }
      payload.description = description.trim();
    } else {
      if (!selectedPostId) {
        setError("Select one of your posts to search with.");
        return;
      }
      payload.sourceItemId = selectedPostId;
    }

    setSearching(true);
    setError("");
    try {
      const res = await api.lostFoundAiSearch(payload);
      setResults(res.data || []);
      if (mode === "post" && res?.meta?.targetType && POST_TYPE_OPTIONS.includes(res.meta.targetType)) {
        setTargetType(res.meta.targetType);
      }
    } catch (err) {
      setResults([]);
      setError(err.message || "AI search failed");
    } finally {
      setSearching(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <Text style={styles.heroTitle}>AI Search</Text>
        <Text style={styles.heroSubtitle}>
          Describe the item you are looking for, or reuse one of your posts and let semantic matching find the closest posts.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Search Mode</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeCard, mode === "description" && styles.modeCardActive]}
            onPress={() => setMode("description")}
          >
            <MaterialCommunityIcons name="text-box-search-outline" size={22} color={theme.colors.primaryDeep} />
            <Text style={styles.modeTitle}>Use Description</Text>
            <Text style={styles.modeText}>Type what the item looks like and where it was seen.</Text>
          </Pressable>
          <Pressable
            style={[styles.modeCard, mode === "post" && styles.modeCardActive]}
            onPress={() => setMode("post")}
          >
            <MaterialCommunityIcons name="file-search-outline" size={22} color={theme.colors.primaryDeep} />
            <Text style={styles.modeTitle}>Use My Post</Text>
            <Text style={styles.modeText}>Search from a post you already created in Lost and Found.</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Search In</Text>
        <View style={styles.targetWrap}>
          {SEARCH_TARGET_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.targetChip, targetType === option.value && styles.targetChipActive]}
              onPress={() => setTargetType(option.value)}
            >
              <Text style={[styles.targetChipText, targetType === option.value && styles.targetChipTextActive]}>
                {option.label}
              </Text>
              <Text style={styles.targetChipHelper}>{option.helper}</Text>
            </Pressable>
          ))}
        </View>

        {mode === "description" ? (
          <View style={styles.inputPanel}>
            <Text style={styles.inputLabel}>Item Description</Text>
            <TextInput
              multiline
              numberOfLines={6}
              placeholder="Example: Black Anker power bank lost near the library charging ports with a white cable and SLIIT sticker."
              placeholderTextColor={theme.colors.textMuted}
              value={description}
              onChangeText={setDescription}
              style={styles.descriptionInput}
              textAlignVertical="top"
            />
          </View>
        ) : (
          <View style={styles.inputPanel}>
            <Text style={styles.inputLabel}>Choose One of Your Posts</Text>
            {loadingPosts ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading your Lost and Found posts...</Text>
              </View>
            ) : null}
            {!loadingPosts && myPosts.length === 0 ? (
              <Text style={styles.helperText}>You do not have any Lost and Found posts yet.</Text>
            ) : null}
            {!loadingPosts &&
              myPosts.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.postOption, selectedPostId === item.id && styles.postOptionActive]}
                  onPress={() => setSelectedPostId(item.id)}
                >
                  <View style={styles.postOptionHeader}>
                    <Text style={styles.postOptionTitle}>{item.title}</Text>
                    {selectedPostId === item.id ? (
                      <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.primary} />
                    ) : null}
                  </View>
                  <Text style={styles.postOptionMeta}>{item.type} post</Text>
                  <Text numberOfLines={2} style={styles.postOptionText}>
                    {item.description}
                  </Text>
                </Pressable>
              ))}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.searchBtn, searching && styles.searchBtnDisabled]} onPress={runSearch} disabled={searching}>
          {searching ? <ActivityIndicator color="#ffffff" /> : <MaterialCommunityIcons name="creation" size={18} color="#ffffff" />}
          <Text style={styles.searchBtnText}>{searching ? "Searching..." : "Run AI Search"}</Text>
        </Pressable>
      </View>

      <View style={styles.resultsPanel}>
        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Results</Text>
            <Text style={styles.sectionTitle}>Best Matches</Text>
          </View>
          <View style={styles.resultsCount}>
            <Text style={styles.resultsCountText}>{results.length} match(es)</Text>
          </View>
        </View>

        {!searching && results.length === 0 ? (
          <Text style={styles.helperText}>Run an AI search to see the most relevant posts here.</Text>
        ) : null}

        {results.map((item) => (
          <View key={item.id} style={styles.resultCard}>
            <View style={styles.resultMetaRow}>
              <ScorePill score={item.similarityScore} />
              <Pressable style={styles.viewBtn} onPress={() => navigation.navigate("LostFoundDetail", { itemId: item.id })}>
                <Text style={styles.viewBtnText}>Open Post</Text>
              </Pressable>
            </View>
            <MatchReasonChips reasons={item.matchReasons} />
            <LostFoundCard item={item} onPress={() => navigation.navigate("LostFoundDetail", { itemId: item.id })} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#eef4ff" },
  pageContent: { padding: 16, paddingBottom: 28, gap: 14 },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    padding: 18,
    backgroundColor: "#1141c8",
    ...theme.shadow.soft,
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -70,
    right: -30,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -25,
    bottom: -35,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroTitle: { color: "#ffffff", fontWeight: "900", fontSize: 30, letterSpacing: -0.5 },
  heroSubtitle: { color: "#e6eeff", marginTop: 8, lineHeight: 22 },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  sectionEyebrow: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "800" },
  modeRow: { gap: 10 },
  modeCard: {
    borderWidth: 1,
    borderColor: "#d8e3f6",
    backgroundColor: "#f8fbff",
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  modeCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#eaf1ff",
  },
  modeTitle: { color: theme.colors.text, fontWeight: "800", fontSize: 15 },
  modeText: { color: theme.colors.textMuted, lineHeight: 20 },
  targetWrap: { gap: 8 },
  targetChip: {
    borderWidth: 1,
    borderColor: "#d8e3f6",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  targetChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#eaf1ff",
  },
  targetChipText: { color: theme.colors.text, fontWeight: "800" },
  targetChipTextActive: { color: theme.colors.primaryDeep },
  targetChipHelper: { color: theme.colors.textMuted, fontSize: 12 },
  inputPanel: { gap: 10 },
  inputLabel: { color: theme.colors.text, fontWeight: "800", fontSize: 14 },
  descriptionInput: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    borderRadius: 18,
    backgroundColor: "#f5f8ff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
  },
  postOption: {
    borderWidth: 1,
    borderColor: "#d8e3f6",
    backgroundColor: "#f8fbff",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  postOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#eaf1ff",
  },
  postOptionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  postOptionTitle: { color: theme.colors.text, fontWeight: "800", flex: 1 },
  postOptionMeta: { color: theme.colors.primaryDeep, fontWeight: "700", fontSize: 12 },
  postOptionText: { color: theme.colors.textMuted, lineHeight: 20 },
  searchBtn: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  searchBtnDisabled: { opacity: 0.75 },
  searchBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
  resultsPanel: {
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 24,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    ...theme.shadow.soft,
  },
  resultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 10 },
  resultsCount: {
    backgroundColor: "#edf3ff",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "#d4e0fb",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resultsCountText: { color: theme.colors.primaryDeep, fontWeight: "800", fontSize: 12 },
  resultCard: { gap: 0 },
  resultMetaRow: {
    marginTop: 8,
    marginBottom: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eaf1ff",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "#cfe0ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scorePillText: { color: theme.colors.primaryDeep, fontWeight: "800", fontSize: 12 },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f7fbff",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  reasonChipText: {
    color: theme.colors.primaryDeep,
    fontWeight: "700",
    fontSize: 11,
    flexShrink: 1,
  },
  viewBtn: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewBtnText: { color: theme.colors.primary, fontWeight: "800", fontSize: 12 },
  helperText: { color: theme.colors.textMuted, lineHeight: 20 },
  loadingState: { alignItems: "center", justifyContent: "center", paddingVertical: 28, gap: 10 },
  loadingText: { color: theme.colors.textMuted, fontWeight: "700" },
  error: { color: theme.colors.danger, fontSize: 13 },
});
