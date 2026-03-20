import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updateListing } from '../services/api';

export default function EditListingScreen({ navigation, route }) {
  const { listing } = route.params;

  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(String(listing.price));
  const [category, setCategory] = useState(listing.category);
  const [condition, setCondition] = useState(listing.condition);
  const [status, setStatus] = useState(listing.status);
  const [image, setImage] = useState(listing.image_url || null);
  const [loading, setLoading] = useState(false);

  const categories = ['Books', 'Electronics', 'Clothing', 'Stationery', 'Other'];
  const conditions = ['New', 'Like New', 'Good', 'Fair'];
  const statuses = ['Available', 'Sold'];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    if (!title || !description || !price || !category || !condition) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (isNaN(price) || Number(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      await updateListing(listing._id, {
        title,
        description,
        price: Number(price),
        category,
        condition,
        status,
        image_url: image || '',
      });
      Alert.alert('Success', 'Listing updated!', [
        { text: 'OK', onPress: () => navigation.navigate('MyListings') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Edit Listing</Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <TextInput
        style={styles.input}
        placeholder="Price (LKR)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.optionRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.optionBtn, category === cat && styles.optionBtnSelected]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.optionText, category === cat && styles.optionTextSelected]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Condition</Text>
      <View style={styles.optionRow}>
        {conditions.map((con) => (
          <TouchableOpacity
            key={con}
            style={[styles.optionBtn, condition === con && styles.optionBtnSelected]}
            onPress={() => setCondition(con)}
          >
            <Text style={[styles.optionText, condition === con && styles.optionTextSelected]}>
              {con}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Status</Text>
      <View style={styles.optionRow}>
        {statuses.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.optionBtn, status === s && styles.optionBtnSelected]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.optionText, status === s && styles.optionTextSelected]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Photo (Optional)</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <Text style={styles.imagePickerText}>📷 Tap to pick an image</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Listing</Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f0f4f8',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e6b3e',
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  optionBtn: {
    borderWidth: 1,
    borderColor: '#1e6b3e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionBtnSelected: {
    backgroundColor: '#1e6b3e',
  },
  optionText: {
    color: '#1e6b3e',
    fontSize: 13,
  },
  optionTextSelected: {
    color: '#fff',
  },
  imagePicker: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerText: {
    color: '#999',
    fontSize: 15,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#1e6b3e',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});