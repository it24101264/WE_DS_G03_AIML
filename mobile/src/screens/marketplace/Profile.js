import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../ui/theme";
import { api } from "../../api";
import { marketplacePalette as p } from "./palette";

const FACULTIES = [
  "",
  "Faculty of Computing",
  "Faculty of Engineering",
  "Faculty of Business",
  "Faculty of Humanities & Sciences",
  "CAHM",
];

export default function MarketplaceProfile({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    email: "",
    name: "",
    phone: "",
    faculty: "",
    bio: "",
  });

  useEffect(() => {
    api
      .marketplaceProfile()
      .then((res) => {
        const u = res?.user || {};
        setForm({
          studentId: u.studentId || "",
          email: u.email || "",
          name: u.name || "",
          phone: u.phone || "",
          faculty: u.faculty || "",
          bio: u.bio || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      await api.marketplaceUpdateProfile({
        name: form.name,
        phone: form.phone,
        faculty: form.faculty,
        bio: form.bio,
      });
      Alert.alert("Marketplace", "Profile updated");
    } catch (err) {
      Alert.alert("Marketplace", err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api.marketplaceDeleteAccount();
      await AsyncStorage.removeItem("token");
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (err) {
      Alert.alert("Marketplace", err.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  const avatarLetter = useMemo(() => (form.name?.trim()?.charAt(0)?.toUpperCase() || "U"), [form.name]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={p.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={[styles.layout, !isWide && styles.layoutStack]}>
        <View style={[styles.sideCard, !isWide && styles.sideCardStack]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <Text style={styles.sideName}>{form.name || "User"}</Text>
          <Text style={styles.sideId}>{form.studentId || "N/A"}</Text>
          <Text style={styles.sideFaculty}>{form.faculty || "Computing"}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>Buyer</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your personal information</Text>

          <View style={styles.readonlyRow}>
            <View style={styles.readonlyField}>
              <Text style={styles.label}>EMAIL</Text>
              <Text style={styles.readonlyValue}>{form.email || "N/A"}</Text>
            </View>
            <View style={styles.readonlyField}>
              <Text style={styles.label}>STUDENT ID</Text>
              <Text style={styles.readonlyValue}>{form.studentId || "N/A"}</Text>
            </View>
          </View>

          <Text style={styles.label}>FULL NAME *</Text>
          <TextInput
            value={form.name}
            onChangeText={(v) => setForm((prev) => ({ ...prev, name: v }))}
            placeholder="Enter your full name"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
          />

          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                value={form.phone}
                onChangeText={(v) => setForm((prev) => ({ ...prev, phone: v }))}
                placeholder="0711124777"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
              />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>FACULTY</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={form.faculty}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, faculty: v }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Faculty" value="" />
                  {FACULTIES.filter(Boolean).map((f) => (
                    <Picker.Item key={f} label={f} value={f} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.bioHeader}>
            <Text style={styles.label}>BIO</Text>
            <Text style={styles.counter}>{(form.bio || "").length}/500</Text>
          </View>
          <TextInput
            value={form.bio}
            onChangeText={(v) => setForm((prev) => ({ ...prev, bio: v.slice(0, 500) }))}
            placeholder="Tell other students about yourself..."
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, styles.bio]}
            multiline
            textAlignVertical="top"
          />

          <Pressable style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
            <MaterialCommunityIcons name="content-save-outline" size={16} color="#fff" />
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save Changes"}</Text>
          </Pressable>

          <View style={styles.dangerZone}>
            <View style={styles.dangerTitleRow}>
              <MaterialCommunityIcons name="alert-outline" size={16} color="#d83f3f" />
              <Text style={styles.dangerTitle}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerText}>Deleting your account is permanent and cannot be undone.</Text>

            {!confirmDelete ? (
              <Pressable style={styles.deleteBtn} onPress={() => setConfirmDelete(true)}>
                <MaterialCommunityIcons name="delete-outline" size={14} color="#d83f3f" />
                <Text style={styles.deleteBtnText}>Delete Account</Text>
              </Pressable>
            ) : (
              <View style={styles.confirmRow}>
                <Pressable style={styles.cancelBtn} onPress={() => setConfirmDelete(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={deleteAccount} disabled={deleting}>
                  <Text style={styles.confirmBtnText}>{deleting ? "Deleting..." : "Confirm Delete"}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: p.bg },
  pageContent: { padding: 14, paddingBottom: 24 },
  center: { flex: 1, backgroundColor: p.bg, alignItems: "center", justifyContent: "center" },
  layout: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  layoutStack: { flexDirection: "column" },
  sideCard: {
    width: 128,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.borderSoft,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  sideCardStack: { width: "100%", flexDirection: "row", justifyContent: "flex-start", gap: 10 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: p.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 24 },
  sideName: { color: p.primaryDeep, fontWeight: "800", fontSize: 14 },
  sideId: { color: p.text, fontWeight: "800", fontSize: 11 },
  sideFaculty: { color: p.muted, fontWeight: "600", fontSize: 11 },
  rolePill: {
    marginTop: 2,
    backgroundColor: "#e6ecff",
    borderWidth: 1,
    borderColor: "#c9d8ff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rolePillText: { color: p.primaryDeep, fontWeight: "800", fontSize: 11 },
  mainCard: {
    flex: 1,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.borderSoft,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  title: { color: p.primaryDeep, fontSize: 34, fontWeight: "900" },
  subtitle: { color: p.muted, marginBottom: 8 },
  readonlyRow: { flexDirection: "row", gap: 8 },
  readonlyField: {
    flex: 1,
    backgroundColor: "#edf2ff",
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 54,
  },
  label: { color: "#5f6c83", fontWeight: "900", fontSize: 10, letterSpacing: 0.5 },
  readonlyValue: { color: p.text, fontWeight: "700", marginTop: 4, fontSize: 12 },
  input: {
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 10,
    color: p.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  formRow: { flexDirection: "row", gap: 8 },
  formCol: { flex: 1, gap: 4 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: p.surface,
  },
  picker: { height: 44 },
  bioHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { color: "#96a2b7", fontWeight: "700", fontSize: 10 },
  bio: { minHeight: 84 },
  saveBtn: {
    alignSelf: "flex-start",
    marginTop: 2,
    backgroundColor: p.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  dangerZone: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#f3b8b8",
    borderRadius: 12,
    backgroundColor: "#fff6f6",
    padding: 12,
    gap: 8,
  },
  dangerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dangerTitle: { color: "#d83f3f", fontWeight: "800" },
  dangerText: { color: "#a27878", fontSize: 12 },
  deleteBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#f3b8b8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffecec",
  },
  deleteBtnText: { color: "#d83f3f", fontWeight: "800", fontSize: 12 },
  confirmRow: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: p.surface,
  },
  cancelBtnText: { color: p.muted, fontWeight: "700", fontSize: 12 },
  confirmBtn: {
    backgroundColor: "#d83f3f",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
