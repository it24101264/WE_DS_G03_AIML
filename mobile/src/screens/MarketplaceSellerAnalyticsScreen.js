import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";
import { formatCurrency } from "./marketplaceShared";

function RangeChip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

function downloadTextFile(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBytes(filename, bytes, mime) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toIsoDateTime(d) {
  return d ? new Date(d).toISOString() : "";
}

export default function MarketplaceSellerAnalyticsScreen() {
  const [range, setRange] = useState("7d"); // 7d | 30d | all
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    if (range === "all") return {};
    const days = range === "30d" ? 30 : 7;
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return { start: toIsoDateTime(start), end: toIsoDateTime(end) };
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.sellerMarketplaceAnalytics(params);
      setData(res.data || null);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function exportCsv() {
    try {
      setDownloading(true);
      const csv = await api.sellerMarketplaceReportCsv(params);
      downloadTextFile(`seller_report_${Date.now()}.csv`, csv, "text/csv");
    } catch (err) {
      setError(err.message || "Could not download CSV");
    } finally {
      setDownloading(false);
    }
  }

  async function exportPdf() {
    try {
      setDownloading(true);
      const bytes = await api.sellerMarketplaceReportPdf(params);
      downloadBytes(`seller_report_${Date.now()}.pdf`, bytes, "application/pdf");
    } catch (err) {
      setError(err.message || "Could not download PDF");
    } finally {
      setDownloading(false);
    }
  }

  const conversionPct = data ? `${(Number(data.conversion || 0) * 100).toFixed(1)}%` : "-";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="chart-box-outline" size={28} color="#ffffff" />
          </View>
          <Pressable style={styles.heroBtn} onPress={load}>
            <Text style={styles.heroBtnText}>{loading ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>Seller</Text>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Revenue and performance metrics based on accepted and paid requests.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Date range</Text>
        <View style={styles.chipRow}>
          <RangeChip label="Last 7 days" active={range === "7d"} onPress={() => setRange("7d")} />
          <RangeChip label="Last 30 days" active={range === "30d"} onPress={() => setRange("30d")} />
          <RangeChip label="All time" active={range === "all"} onPress={() => setRange("all")} />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.statsGrid}>
        <StatCard label="Revenue" value={data ? formatCurrency(data.revenue) : "-"} />
        <StatCard label="Orders" value={data ? String(data.orders) : "-"} hint="Paid + accepted" />
        <StatCard label="Conversion" value={conversionPct} hint="Accepted / total requests" />
        <StatCard
          label="Profit estimate"
          value={data?.profitEstimate == null ? "N/A" : formatCurrency(data.profitEstimate)}
          hint={data?.profitEstimate == null ? "Set cost price on listings" : `Coverage: ${data?.profitEstimateCoverageOrders || 0} order(s)`}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Best-selling products</Text>
        {!data?.bestSelling?.length ? (
          <Text style={styles.muted}>No paid orders in this period.</Text>
        ) : (
          <View style={styles.list}>
            {data.bestSelling.map((p) => (
              <View key={p.postId} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{p.title}</Text>
                  <Text style={styles.rowMeta}>{p.category} • paid orders: {p.paidOrders}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        {!data?.alerts?.length ? (
          <Text style={styles.muted}>No alerts.</Text>
        ) : (
          <View style={styles.list}>
            {data.alerts.map((a) => (
              <View key={a.type} style={styles.alertRow}>
                <Text style={styles.alertTitle}>{a.type}</Text>
                <Text style={styles.alertText}>{a.message}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Download report</Text>
        <View style={styles.actionRow}>
          <Pressable style={[styles.secondaryBtn, downloading && styles.btnDisabled]} onPress={exportCsv} disabled={downloading}>
            <Text style={styles.secondaryBtnText}>{downloading ? "Working..." : "Download CSV"}</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, downloading && styles.btnDisabled]} onPress={exportPdf} disabled={downloading}>
            <Text style={styles.primaryBtnText}>{downloading ? "Working..." : "Download PDF"}</Text>
          </Pressable>
        </View>
        <Text style={styles.mutedSmall}>Downloads work best on web (`expo start --web`).</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#eef4ff" },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  hero: {
    backgroundColor: "#123dc8",
    borderRadius: 28,
    padding: 18,
    gap: 12,
    ...theme.shadow.soft,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBtn: {
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroBtnText: { color: "#ffffff", fontWeight: "900" },
  eyebrow: { color: "#cddafe", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "900", fontSize: 12 },
  title: { color: "#ffffff", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#dce6ff", lineHeight: 21 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  sectionTitle: { color: theme.colors.text, fontWeight: "900", fontSize: 18 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  chipActive: { backgroundColor: theme.colors.infoBg, borderColor: theme.colors.infoBg },
  chipText: { color: theme.colors.text, fontWeight: "800" },
  chipTextActive: { color: theme.colors.infoText },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
    ...theme.shadow.soft,
  },
  statLabel: { color: theme.colors.textMuted, fontWeight: "800" },
  statValue: { color: theme.colors.text, fontWeight: "900", fontSize: 18 },
  statHint: { color: theme.colors.textMuted, fontSize: 12 },
  list: { gap: 10 },
  row: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 12,
  },
  rowMain: { gap: 3 },
  rowTitle: { color: theme.colors.text, fontWeight: "900" },
  rowMeta: { color: theme.colors.textMuted, fontWeight: "700", fontSize: 12 },
  alertRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  alertTitle: { color: theme.colors.text, fontWeight: "900" },
  alertText: { color: theme.colors.textMuted, lineHeight: 20 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryBtnText: { color: "#ffffff", fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryBtnText: { color: theme.colors.text, fontWeight: "800" },
  btnDisabled: { opacity: 0.7 },
  muted: { color: theme.colors.textMuted, lineHeight: 20 },
  mutedSmall: { color: theme.colors.textMuted, fontSize: 12 },
  error: { color: theme.colors.danger, fontSize: 13 },
});

