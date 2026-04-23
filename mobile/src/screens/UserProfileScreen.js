import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";

function initialsFor(user) {
  const name = String(user?.name || user?.email || "U").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function UserProfileScreen({ user, navigation, onProfileChanged, onLogout }) {
  const [name, setName] = useState(String(user?.name || ""));
  const [email, setEmail] = useState(String(user?.email || ""));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveProfile() {
    setSavingProfile(true);
    setError("");
    setMessage("");
    try {
      const res = await api.updateProfile({ name, email });
      if (res?.token) {
        await AsyncStorage.setItem("token", res.token);
      }
      await onProfileChanged?.();
      setMessage(res?.message || "Profile updated");
    } catch (err) {
      setError(err.message || "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setSavingPassword(true);
    setError("");
    setMessage("");
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMessage(res?.message || "Password updated");
    } catch (err) {
      setError(err.message || "Could not update password");
    } finally {
      setSavingPassword(false);
    }
  }

  function confirmDelete() {
    if (!deletePassword.trim()) {
      setError("Enter your password to delete your account.");
      return;
    }

    Alert.alert(
      "Delete profile",
      "This will permanently delete your user account. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: deleteAccount,
        },
      ]
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      await api.deleteAccount({ password: deletePassword });
      await onLogout?.();
    } catch (err) {
      setError(err.message || "Could not delete profile");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFor(user)}</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{user?.name || "Your Profile"}</Text>
          <Text style={styles.heroSubtitle}>{user?.email || "Signed in user"}</Text>
          <Text style={styles.roleText}>{String(user?.role || "student").toUpperCase()}</Text>
        </View>
      </View>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.panel}>
        <View style={styles.panelTitleRow}>
          <MaterialCommunityIcons name="account-edit-outline" size={20} color={theme.colors.primaryDeep} />
          <Text style={styles.panelTitle}>Profile Details</Text>
        </View>
        <Text style={styles.label}>Username</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Your email"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <Pressable style={[styles.primaryBtn, savingProfile && styles.disabledBtn]} onPress={saveProfile} disabled={savingProfile}>
          {savingProfile ? <ActivityIndicator color="#ffffff" /> : <MaterialCommunityIcons name="content-save-outline" size={18} color="#ffffff" />}
          <Text style={styles.primaryBtnText}>{savingProfile ? "Saving..." : "Save Profile"}</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelTitleRow}>
          <MaterialCommunityIcons name="lock-reset" size={20} color={theme.colors.primaryDeep} />
          <Text style={styles.panelTitle}>Change Password</Text>
        </View>
        <Text style={styles.label}>Current Password</Text>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Current password"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.label}>New Password</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="At least 8 characters"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <Pressable style={[styles.primaryBtn, savingPassword && styles.disabledBtn]} onPress={savePassword} disabled={savingPassword}>
          {savingPassword ? <ActivityIndicator color="#ffffff" /> : <MaterialCommunityIcons name="shield-check-outline" size={18} color="#ffffff" />}
          <Text style={styles.primaryBtnText}>{savingPassword ? "Updating..." : "Update Password"}</Text>
        </Pressable>
      </View>

      <View style={[styles.panel, styles.dangerPanel]}>
        <View style={styles.panelTitleRow}>
          <MaterialCommunityIcons name="account-remove-outline" size={20} color={theme.colors.danger} />
          <Text style={[styles.panelTitle, styles.dangerTitle]}>Delete Profile</Text>
        </View>
        <Text style={styles.helperText}>Enter your password to confirm account deletion.</Text>
        <TextInput
          value={deletePassword}
          onChangeText={setDeletePassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <Pressable style={[styles.deleteBtn, deleting && styles.disabledBtn]} onPress={confirmDelete} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#ffffff" /> : <MaterialCommunityIcons name="delete-outline" size={18} color="#ffffff" />}
          <Text style={styles.deleteBtnText}>{deleting ? "Deleting..." : "Delete Profile"}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryBtnText}>Back</Text>
      </Pressable>
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
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#153fae",
    borderRadius: 24,
    padding: 18,
    ...theme.shadow.soft,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  avatarText: {
    color: "#153fae",
    fontWeight: "900",
    fontSize: 24,
  },
  heroText: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 22,
  },
  heroSubtitle: {
    color: "#dbe7ff",
    fontWeight: "700",
  },
  roleText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 4,
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 10,
    ...theme.shadow.soft,
  },
  dangerPanel: {
    borderColor: "#fecaca",
    backgroundColor: "#fffafa",
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  panelTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 17,
  },
  dangerTitle: {
    color: theme.colors.danger,
  },
  label: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  primaryBtn: {
    marginTop: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  deleteBtn: {
    marginTop: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.danger,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  deleteBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  secondaryBtn: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: "#ffffff",
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontWeight: "900",
  },
  disabledBtn: {
    opacity: 0.75,
  },
  helperText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  success: {
    color: theme.colors.successText,
    backgroundColor: theme.colors.successBg,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontWeight: "800",
  },
  error: {
    color: theme.colors.danger,
    backgroundColor: "#fff1f2",
    borderRadius: theme.radius.sm,
    padding: 10,
    fontWeight: "800",
  },
});
