import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createListing } from '../services/api';

export default function CreateListingScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = ['Books', 'Electronics', 'Clothing', 'Stationery', 'Other'];
  const conditions = ['New', 'Like New', 'Good', 'Fair'];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!title || !description || !price || !category || !condition) {
      window.alert('Please fill in all fields');
      return;
    }
    if (isNaN(price) || Number(price) <= 0) {
      window.alert('Please enter a valid price');
      return;
    }
    setLoading(true);
    try {
      await createListing({
        title,
        description,
        price: Number(price),
        category,
        condition,
        image_url: image || '',
      });
      window.alert('Listing created successfully!');
      navigation.navigate('MyListings');
    } catch (error) {
      window.alert(error.response?.data?.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Item Details</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Calculus Textbook"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your item..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Price (LKR)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 1500"
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
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Listing</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <div style={{ 
        height: '100vh', 
        overflowY: 'scroll', 
        backgroundColor: '#f0f4f8' 
      }}>
        {content}
      </div>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 60,
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
    marginBottom: 6,
    marginTop: 4,
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
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  imagePickerText: {
    color: '#999',
    fontSize: 15,
  },
  previewImage: {
    width: '100%',
    height: 100,
  },
  button: {
    backgroundColor: '#1e6b3e',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});