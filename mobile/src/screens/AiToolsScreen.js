import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { LostFoundCard } from "./lostFoundShared";
import { formatCurrency, formatMarketplaceTime, PhotoStrip, SellerStatusBadge } from "./marketplaceShared";

const TOOL_OPTIONS = [
  {
    key: "lost-found",
    label: "Lost and Found",
    helper: "Find posts that may match a lost or found item.",
    icon: "magnify-scan",
    placeholder: "Example: Black Anker power bank near the library with a white cable and SLIIT sticker.",
  },
  {
    key: "marketplace",
    label: "Marketplace",
    helper: "Find listings that match what you want to buy.",
    icon: "storefront-search-outline",
    placeholder: "Example: I need a laptop for coding under 150000 with good battery life.",
  },
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

function MarketplaceSuggestionCard({ item, onPress }) {
  return (
    <Pressable style={styles.marketCard} onPress={onPress}>
      <PhotoStrip photos={item?.photos} compact />
      <View style={styles.marketHeader}>
        <View style={styles.marketHeaderText}>
          <Text style={styles.marketTitle}>{item?.title || "Untitled listing"}</Text>
          <Text style={styles.marketPrice}>{formatCurrency(item?.price)}</Text>
        </View>
        <SellerStatusBadge status={item?.status} />
      </View>
      <Text style={styles.marketSeller}>Seller: {item?.sellerName || item?.userName || "Unknown seller"}</Text>
      <Text style={styles.marketDescription} numberOfLines={2}>
        {item?.description || "No description provided."}
      </Text>
      <View style={styles.marketFooter}>
        <Text style={styles.marketMeta}>{formatMarketplaceTime(item?.createdAt)}</Text>
        <Text style={styles.marketMeta}>{Number(item?.requestCount || 0)} request(s)</Text>
      </View>
    </Pressable>
  );
}

export default function AiToolsScreen({ navigation }) {
  const [tool, setTool] = useState("lost-found");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Choose an AI tool, describe what you need, and I will suggest matching posts.",
    },
  ]);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const selectedTool = TOOL_OPTIONS.find((option) => option.key === tool) || TOOL_OPTIONS[0];

  function switchTool(nextTool) {
    setTool(nextTool);
    setResults([]);
    setError("");
    setMessages([
      {
        id: `assistant-${nextTool}`,
        role: "assistant",
        text:
          nextTool === "lost-found"
            ? "Tell me about the item, color, brand, marks, and where it was lost or found."
            : "Tell me what product you need, your budget, and any important features.",
      },
    ]);
  }

  async function runSearch() {
    const text = String(message || "").trim();
    if (!text) {
      setError("Type a message before searching.");
      return;
    }

    setSearching(true);
    setError("");
    setResults([]);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", text },
      { id: `assistant-loading-${Date.now()}`, role: "assistant", text: "Searching for the best matching posts..." },
    ]);

    try {
      const res =
        tool === "lost-found"
          ? await api.lostFoundAiSearch({ description: text, limit: 8, status: "OPEN" })
          : await api.marketplaceAiSearch({ description: text, limit: 8, status: "ACTIVE" });
      const data = Array.isArray(res?.data) ? res.data : [];
      setResults(data);
      setMessages((prev) => [
        ...prev.filter((entry) => !String(entry.id).startsWith("assistant-loading-")),
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: data.length
            ? `I found ${data.length} suggested post${data.length === 1 ? "" : "s"}.`
            : "I could not find a strong match yet. Try adding more details.",
        },
      ]);
      setMessage("");
    } catch (err) {
      setMessages((prev) => prev.filter((entry) => !String(entry.id).startsWith("assistant-loading-")));
      setError(err.message || "AI search failed");
    } finally {
      setSearching(false);
    }
  }

  function openResult(item) {
    if (tool === "lost-found") {
      navigation.navigate("LostFoundDetail", { itemId: item.id });
    } else {
      navigation.navigate("MarketplaceBuyerDetail", { postId: item.id });
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.toolTabs}>
        {TOOL_OPTIONS.map((option) => {
          const active = option.key === tool;
          return (
            <Pressable key={option.key} style={[styles.toolTab, active && styles.toolTabActive]} onPress={() => switchTool(option.key)}>
              <MaterialCommunityIcons name={option.icon} size={20} color={active ? "#ffffff" : theme.colors.primaryDeep} />
              <View style={styles.toolTabTextWrap}>
                <Text style={[styles.toolTabLabel, active && styles.toolTabLabelActive]}>{option.label}</Text>
                <Text style={[styles.toolTabHelper, active && styles.toolTabHelperActive]}>{option.helper}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chatPanel}>
        <View style={styles.chatHeader}>
          <View style={styles.chatIcon}>
            <MaterialCommunityIcons name={selectedTool.icon} size={20} color="#ffffff" />
          </View>
          <View style={styles.chatTitleWrap}>
            <Text style={styles.chatTitle}>{selectedTool.label} Assistant</Text>
            <Text style={styles.chatSubtitle}>Ask with plain text</Text>
          </View>
        </View>

        <View style={styles.messages}>
          {messages.map((entry) => (
            <View key={entry.id} style={[styles.messageBubble, entry.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.messageText, entry.role === "user" && styles.userMessageText]}>{entry.text}</Text>
            </View>
          ))}
        </View>

        <TextInput
          multiline
          numberOfLines={5}
          value={message}
          onChangeText={setMessage}
          placeholder={selectedTool.placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          textAlignVertical="top"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.sendBtn, searching && styles.sendBtnDisabled]} onPress={runSearch} disabled={searching}>
          {searching ? <ActivityIndicator color="#ffffff" /> : <MaterialCommunityIcons name="send" size={18} color="#ffffff" />}
          <Text style={styles.sendBtnText}>{searching ? "Searching..." : "Send to AI"}</Text>
        </Pressable>
      </View>

      <View style={styles.resultsPanel}>
        <View style={styles.resultsHeader}>
          <View>
            <Text style={styles.resultsEyebrow}>Suggestions</Text>
            <Text style={styles.resultsTitle}>{selectedTool.label} Results</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{results.length} result(s)</Text>
          </View>
        </View>

        {!searching && !results.length ? (
          <Text style={styles.emptyText}>Suggested posts will appear here after you send a message.</Text>
        ) : null}

        {results.map((item) => (
          <View key={`${tool}-${item.id}`} style={styles.resultItem}>
            <View style={styles.resultTopRow}>
              <ScorePill score={item.similarityScore} />
              <Pressable style={styles.openBtn} onPress={() => openResult(item)}>
                <Text style={styles.openBtnText}>Open Post</Text>
              </Pressable>
            </View>
            <MatchReasonChips reasons={item.matchReasons} />
            {tool === "lost-found" ? (
              <LostFoundCard item={item} onPress={() => openResult(item)} />
            ) : (
              <MarketplaceSuggestionCard item={item} onPress={() => openResult(item)} />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#eef4ff",
  },
  content: {
    padding: 16,
    paddingBottom: 30,
    gap: 14,
  },
  toolTabs: {
    gap: 10,
  },
  toolTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    padding: 14,
  },
  toolTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toolTabTextWrap: {
    flex: 1,
    gap: 2,
  },
  toolTabLabel: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  toolTabLabelActive: {
    color: "#ffffff",
  },
  toolTabHelper: {
    color: theme.colors.textMuted,
    lineHeight: 18,
    fontSize: 12,
  },
  toolTabHelperActive: {
    color: "#e6eeff",
  },
  chatPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    padding: 14,
    gap: 12,
    ...theme.shadow.soft,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  chatTitleWrap: {
    flex: 1,
  },
  chatTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  chatSubtitle: {
    color: theme.colors.textMuted,
    fontWeight: "700",
    fontSize: 12,
  },
  messages: {
    gap: 8,
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#eef4ff",
    borderWidth: 1,
    borderColor: "#d7e2f3",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.primary,
  },
  messageText: {
    color: theme.colors.text,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  input: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    backgroundColor: "#f8fbff",
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: theme.colors.text,
  },
  sendBtn: {
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendBtnDisabled: {
    opacity: 0.75,
  },
  sendBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  error: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  resultsPanel: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d7e2f3",
    padding: 14,
    gap: 12,
    ...theme.shadow.soft,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  resultsEyebrow: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultsTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  countPill: {
    backgroundColor: "#edf3ff",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "#d4e0fb",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  countPillText: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
    fontSize: 12,
  },
  emptyText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  resultItem: {
    gap: 6,
  },
  resultTopRow: {
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
  scorePillText: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
    fontSize: 12,
  },
  openBtn: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  openBtnText: {
    color: theme.colors.primary,
    fontWeight: "900",
    fontSize: 12,
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
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
  marketCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadow.soft,
  },
  marketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  marketHeaderText: {
    flex: 1,
    gap: 3,
  },
  marketTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  marketPrice: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
    fontSize: 14,
  },
  marketSeller: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 13,
  },
  marketDescription: {
    color: theme.colors.textMuted,
    lineHeight: 19,
    fontSize: 13,
  },
  marketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  marketMeta: {
    color: theme.colors.textMuted,
    fontWeight: "700",
    fontSize: 12,
  },
});
