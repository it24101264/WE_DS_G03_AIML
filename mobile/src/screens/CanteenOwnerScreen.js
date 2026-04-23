import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../ui/theme';

import { API_URLS } from '../config';

const API_URL = API_URLS.CANTEEN;

export default function FoodManagement({ route, navigation, user, onLogout, canteenId: propsCanteenId }) {
    const canteenId = propsCanteenId || route.params?.canteenId || user?.id || 1;
    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [image, setImage] = useState(null);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchFoods();
    }, []);

    const fetchFoods = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/${canteenId}/food`);
            const data = await response.json();
            setFoods(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch food items');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const addFood = async () => {
        if (!name || !price) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        } else if (price <= 0) {
            Alert.alert('Error', 'Price must be greater than 0');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/food`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ canteenId: canteenId, name, price, image })
            });
            const data = await response.json();

            if (data.success) {
                Alert.alert('Success', 'Food added successfully');
                setName(''); setPrice(''); setImage(null);
                fetchFoods();
            } else {
                Alert.alert('Error', data.error || 'Failed to add food');
            }
        } catch (error) {
            Alert.alert('Error', 'Server error while adding food');
        }
    };

    const deleteFood = async (id) => {
        try {
            const response = await fetch(`${API_URL}/food/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                fetchFoods();
            } else {
                Alert.alert('Error', 'Failed to delete food');
            }
        } catch (error) {
            Alert.alert('Error', 'Server error while deleting food');
        }
    };

    const handleEditClick = (item) => {
        setEditingId(item.FoodID);
        setName(item.Name);
        setPrice(item.Price ? item.Price.toString() : '');
        setImage(item.Image || null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setName('');
        setPrice('');
        setImage(null);
    };

    const updateFood = async () => {
        if (!name || !price) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/food/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price, image })
            });
            const data = await response.json();

            if (data.success) {
                Alert.alert('Success', 'Food updated successfully');
                cancelEdit();
                fetchFoods();
            } else {
                Alert.alert('Error', data.error || 'Failed to update food');
            }
        } catch (error) {
            Alert.alert('Error', 'Server error while updating food');
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.listItem} onPress={() => handleEditClick(item)}>
            {item.Image ? (
                <Image source={{ uri: item.Image }} style={styles.listImage} />
            ) : (
                <View style={styles.iconPlaceholder}>
                    <Ionicons name="fast-food" size={26} color={theme.colors.textMuted} />
                </View>
            )}
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.listTitle}>{item.Name}</Text>
                <Text style={styles.listSubtitle}>Rs {item.Price}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteFood(item.FoodID)}>
                <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>{editingId ? 'Edit Food Item' : 'Add New Food Item'}</Text>
                <TextInput style={styles.input} placeholder="Food Name" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
                <TextInput style={styles.input} placeholder="Price" placeholderTextColor={theme.colors.textMuted} value={price} onChangeText={setPrice} keyboardType="numeric" />

                <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
                    <Text style={styles.imageUploadText}>{image ? 'Change Image' : 'Optional: Upload Food Image'}</Text>
                </TouchableOpacity>
                {image && <Image source={{ uri: image }} style={styles.previewImage} />}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity style={[styles.addBtn, { flex: 1, marginRight: editingId ? 10 : 0 }]} onPress={editingId ? updateFood : addFood}>
                        <Text style={styles.addBtnText}>{editingId ? 'Update Food' : 'Add Food'}</Text>
                    </TouchableOpacity>
                    {editingId ? (
                        <TouchableOpacity style={[styles.addBtn, { flex: 1, backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border }]} onPress={cancelEdit}>
                            <Text style={[styles.addBtnText, { color: theme.colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>Menu Items</Text>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                ) : (
                    <FlatList
                        data={foods}
                        keyExtractor={item => item.FoodID?.toString() || Math.random().toString()}
                        renderItem={renderItem}
                        ListEmptyComponent={<Text style={styles.placeholder}>No foods found.</Text>}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    formContainer: { padding: 15, backgroundColor: theme.colors.surface, ...theme.shadow.soft, marginBottom: 10, borderRadius: theme.radius.lg, marginHorizontal: 15, marginTop: 10, borderWidth: 1, borderColor: theme.colors.border },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, marginBottom: 10 },
    input: { backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, padding: 10, marginBottom: 10, fontSize: 15, color: theme.colors.text },
    addBtn: { backgroundColor: theme.colors.primary, padding: 12, borderRadius: theme.radius.sm, alignItems: 'center', marginTop: 0 },
    addBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    imageUploadBtn: { backgroundColor: theme.colors.surfaceAlt, padding: 10, borderRadius: theme.radius.sm, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed' },
    imageUploadText: { color: theme.colors.primaryDeep, fontWeight: '800' },
    previewImage: { width: '100%', height: 100, borderRadius: theme.radius.md, marginBottom: 10, resizeMode: 'cover' },
    listContainer: { flex: 1, paddingHorizontal: 15 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, marginVertical: 6, ...theme.shadow.soft, borderWidth: 1, borderColor: theme.colors.border },
    listImage: { width: 56, height: 56, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt },
    iconPlaceholder: { width: 56, height: 56, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
    listTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    listSubtitle: { fontSize: 14, color: theme.colors.accent, marginTop: 4, fontWeight: '800' },
    deleteBtn: { backgroundColor: theme.colors.surfaceAlt, paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border },
    deleteText: { color: theme.colors.danger, fontWeight: '800', fontSize: 13 },
    placeholder: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 20, fontSize: 15, fontWeight: '600' }
});
