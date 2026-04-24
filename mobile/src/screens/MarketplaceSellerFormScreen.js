import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../api";
import { theme } from "../ui/theme";

const MAX_PHOTOS = 2;
const TITLE_MIN = 3;
const TITLE_MAX = 80;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 1000;
const SELLER_NAME_MIN = 2;
const SELLER_NAME_MAX = 60;
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 10;
const MAX_PRICE = 100000000;
const CATEGORY_VALUES = ["Books", "Electronics", "Clothing", "Stationery", "Other"];

function normalizePhotos(photos) {
  return Array.isArray(photos)
    ? photos
        .filter(Boolean)
        .slice(0, MAX_PHOTOS)
        .map((photo) => {
          if (typeof photo === "string") {
            return { uri: photo };
          }
          return photo;
        })
    : [];
}

function isValidPhoneNumber(value) {
  const text = String(value || "").trim();
  const digits = text.replace(/\D/g, "");
  // Keep client validation aligned with server:
  // Sri Lankan 10-digit mobile format: 07XXXXXXXX.
  return /^[0-9+()\-\s]+$/.test(text)
    && digits.length >= PHONE_MIN_DIGITS
    && digits.length <= PHONE_MAX_DIGITS
    && /^07\d{8}$/.test(digits);
}

export default function MarketplaceSellerFormScreen({ navigation, route, user }) {
  const postId = route?.params?.postId;
  const isEditing = Boolean(postId);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [sellerName, setSellerName] = useState(user?.name || user?.fullName || "");
  const [category, setCategory] = useState("Other");
  const [availableQuantity, setAvailableQuantity] = useState("1");
  const [costPrice, setCostPrice] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(isEditing);
  const [error, setError] = useState("");

  const remainingSlots = useMemo(() => MAX_PHOTOS - photos.length, [photos.length]);

  useEffect(() => {
    if (!isEditing) return;

    async function loadPost() {
      try {
        const res = await api.marketplacePostById(postId);
        const item = res.data || {};
        setTitle(item.title || "");
        setPrice(item.price != null ? String(item.price) : "");
        setDescription(item.description || "");
        setContactNumber(item.contactNumber || "");
        setSellerName(item.sellerName || item.userName || user?.name || user?.fullName || "");
        setCategory(CATEGORY_VALUES.includes(item.category) ? item.category : "Other");
        setAvailableQuantity(item.availableQuantity != null ? String(item.availableQuantity) : "1");
        setCostPrice(item.costPrice != null ? String(item.costPrice) : "");
        setPhotos(normalizePhotos(item.photos));
        setError("");
      } catch (err) {
        setError(err.message || "Could not load post details");
      } finally {
        setInitializing(false);
      }
    }

    loadPost();
  }, [isEditing, postId, user?.fullName, user?.name]);

  async function pickPhoto() {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Photo limit reached", `You can upload a maximum of ${MAX_PHOTOS} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Media library permission is required to add photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    const nextPhoto = {
      uri: asset.uri,
      fileName: asset.fileName || `photo-${Date.now()}.jpg`,
      mimeType: asset.mimeType || "image/jpeg",
      base64DataUrl: asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : undefined,
    };

    setPhotos((prev) => [...prev, nextPhoto].slice(0, MAX_PHOTOS));
    setError("");
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index));
  }

  async function savePost() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanContactNumber = contactNumber.trim();
    const cleanSellerName = sellerName.trim();
    const cleanCategory = String(category || "").trim();
    const numericPrice = Number(price);
    const numericQuantity = Number.parseInt(String(availableQuantity || "1"), 10);
    const numericCostPrice = costPrice.trim() ? Number(costPrice) : null;
    const shareablePhotos = photos.filter((photo) => photo?.base64DataUrl || (photo?.uri && !String(photo.uri).startsWith("file:")));

    if (!cleanTitle || !cleanDescription || !cleanContactNumber || !cleanSellerName || !price.trim()) {
      setError("Fill in item name, price, description, mobile number, and seller name");
      return;
    }
    if (cleanTitle.length < TITLE_MIN || cleanTitle.length > TITLE_MAX) {
      setError(`Item name must be ${TITLE_MIN}-${TITLE_MAX} characters`);
      return;
    }
    if (cleanDescription.length < DESCRIPTION_MIN || cleanDescription.length > DESCRIPTION_MAX) {
      setError(`Description must be ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters`);
      return;
    }
    if (cleanSellerName.length < SELLER_NAME_MIN || cleanSellerName.length > SELLER_NAME_MAX) {
      setError(`Seller name must be ${SELLER_NAME_MIN}-${SELLER_NAME_MAX} characters`);
      return;
    }
    if (!isValidPhoneNumber(cleanContactNumber)) {
      setError("Enter a valid mobile number (07xxxxxxxx)");
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > MAX_PRICE) {
      setError(`Enter a valid price up to ${MAX_PRICE}`);
      return;
    }
    if (!Number.isInteger(numericQuantity) || numericQuantity < 0 || numericQuantity > 999) {
      setError("Available quantity must be a whole number between 0 and 999");
      return;
    }
    if (numericCostPrice != null && (!Number.isFinite(numericCostPrice) || numericCostPrice < 0 || numericCostPrice > MAX_PRICE)) {
      setError(`Cost price must be between 0 and ${MAX_PRICE}`);
      return;
    }
    if (!shareablePhotos.length) {
      setError("Add at least one photo");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      title: cleanTitle,
      price: numericPrice,
      description: cleanDescription,
      contactNumber: cleanContactNumber,
      sellerName: cleanSellerName,
      category: CATEGORY_VALUES.includes(cleanCategory) ? cleanCategory : "Other",
      availableQuantity: numericQuantity,
      costPrice: numericCostPrice,
      photos,
    };

    try {
      if (isEditing) {
        await api.updateMarketplacePost(postId, payload);
      } else {
        await api.createMarketplacePost(payload);
      }
      navigation.navigate("MarketplaceSellerHome");
    } catch (err) {
      setError(err.message || `Could not ${isEditing ? "update" : "create"} marketplace post`);
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{isEditing ? "Edit seller post" : "Create seller post"}</Text>
        <Text style={styles.subtitle}>
          Collect up to two photos, seller contact details, product name, price, and a clear description before publishing.
        </Text>

        {initializing ? <Text style={styles.muted}>Loading post...</Text> : null}

        <Text style={styles.label}>Photos</Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri || photo.base64DataUrl}-${index}`} style={styles.photoCard}>
              <Image source={{ uri: photo.uri || photo.base64DataUrl }} style={styles.photo} contentFit="cover" />
              <Pressable style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
                <MaterialCommunityIcons name="close" size={18} color="#ffffff" />
              </Pressable>
            </View>
          ))}
          {remainingSlots > 0 ? (
            <Pressable style={styles.addPhotoCard} onPress={pickPhoto}>
              <MaterialCommunityIcons name="camera-plus-outline" size={28} color={theme.colors.primaryDeep} />
              <Text style={styles.addPhotoText}>Add photo</Text>
              <Text style={styles.addPhotoSubtext}>{remainingSlots} slot(s) left</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.label}>Item name</Text>
        <TextInput
          style={styles.input}
          placeholder="Object name"
          placeholderTextColor={theme.colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Price</Text>
        <TextInput
          style={styles.input}
          placeholder="Price in LKR"
          placeholderTextColor={theme.colors.textMuted}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Available quantity</Text>
        <TextInput
          style={styles.input}
          placeholder="1"
          placeholderTextColor={theme.colors.textMuted}
          value={availableQuantity}
          onChangeText={setAvailableQuantity}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Cost price (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Your cost (optional)"
          placeholderTextColor={theme.colors.textMuted}
          value={costPrice}
          onChangeText={setCostPrice}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Mobile number</Text>
        <TextInput
          style={styles.input}
          placeholder="07xxxxxxxx"
          placeholderTextColor={theme.colors.textMuted}
          value={contactNumber}
          onChangeText={setContactNumber}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Seller name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={theme.colors.textMuted}
          value={sellerName}
          onChangeText={setSellerName}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.filterRow}>
          {CATEGORY_VALUES.map((value) => {
            const active = value === category;
            return (
              <Pressable
                key={value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setCategory(value)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{value}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Describe condition, brand, pickup details, and anything important."
          placeholderTextColor={theme.colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={savePost} disabled={loading || initializing}>
            <Text style={styles.primaryBtnText}>{loading ? "Saving..." : isEditing ? "Update Post" : "Post Item"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </View>
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
    paddingBottom: 28,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadow.soft,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.text,
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 21,
    marginBottom: 6,
  },
  label: {
    color: theme.colors.text,
    fontWeight: "800",
    marginTop: 4,
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
    minHeight: 120,
    textAlignVertical: "top",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  filterChipActive: {
    backgroundColor: theme.colors.infoBg,
    borderColor: theme.colors.infoBg,
  },
  filterChipText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: theme.colors.infoText,
  },
  photoCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: theme.colors.surfaceAlt,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(15,23,42,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eff4ff",
    padding: 12,
  },
  addPhotoText: {
    color: theme.colors.primaryDeep,
    fontWeight: "900",
  },
  addPhotoSubtext: {
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  secondaryBtn: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
  muted: {
    color: theme.colors.textMuted,
  },
});
