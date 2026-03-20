import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, TextInput, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { theme } from '../ui/theme';

import { API_URLS } from '../config';

const API_ADMIN_URL = API_URLS.ADMIN;
const API_STUDENT_URL = API_URLS.STUDENT;

export default function StudentDashboard({ route, navigation, user, onLogout }) {
    const studentId = user?.id || user?._id || route.params?.userId || 1;
    const [activeTab, setActiveTab] = useState('menu'); // menu, cart, orders

    // Menu States
    const [canteens, setCanteens] = useState([]);
    const [selectedCanteen, setSelectedCanteen] = useState(null);
    const [foods, setFoods] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(false);

    // Cart States
    const [cart, setCart] = useState([]); // [{ food, quantity }]
    const [pickupTime, setPickupTime] = useState('');

    // Orders States
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Fetch initial canteens
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={onLogout} style={{ marginRight: Platform.OS === 'ios' ? 15 : 0 }}>
                    <Ionicons name="log-out-outline" size={26} color={theme.colors.danger} />
                </TouchableOpacity>
            )
        });
    }, [navigation, onLogout]);

    useEffect(() => {
        if (activeTab === 'menu' && canteens.length === 0) {
            fetchCanteens();
        } else if (activeTab === 'orders') {
            fetchOrders();
        }
    }, [activeTab]);

    const fetchCanteens = async () => {
        setLoadingMenu(true);
        try {
            const res = await fetch(`${API_ADMIN_URL}/canteens`);
            const data = await res.json();
            if (Array.isArray(data)) setCanteens(data);
             else setCanteens([]);
        } catch (e) { Alert.alert('Error', 'Failed to fetch canteens'); }
        setLoadingMenu(false);
    };

    const fetchFoodsForCanteen = async (canteenId) => {
        setLoadingMenu(true);
        try {
            const res = await fetch(`${API_STUDENT_URL}/canteens/${canteenId}/foods`);
            const data = await res.json();
            if (Array.isArray(data)) setFoods(data);
             else setFoods([]);
            setSelectedCanteen(canteenId);
        } catch (e) { Alert.alert('Error', 'Failed to fetch menu'); }
        setLoadingMenu(false);
    };

    const addToCart = (food) => {
        setCart(prev => {
            const exists = prev.find(item => item.food.FoodID === food.FoodID);
            if (exists) {
                return prev.map(item => item.food.FoodID === food.FoodID ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { food, quantity: 1 }];
        });
        Alert.alert('Added', `${food.Name} added to cart!`);
    };

    const checkout = async () => {
        if (cart.length === 0) return Alert.alert('Cart empty', 'Please add items to your cart.');
        if (!pickupTime) return Alert.alert('Missing Info', 'Please specify a pickup time');

        try {
            for (const item of cart) {
                const totalPrice = item.quantity * item.food.Price;
                const res = await fetch(`${API_STUDENT_URL}/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: studentId,
                        foodId: item.food.FoodID,
                        quantity: item.quantity,
                        pickupTime,
                        totalPrice
                    })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to place order');
                }
            }
            Alert.alert('Success', 'Order placed successfully!');
            setCart([]);
            setPickupTime('');
            setActiveTab('orders');
        } catch (e) {
            Alert.alert('Error', 'Checkout failed. Make sure your Student profile (ID 1) was created in Admin.');
        }
    };

    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const res = await fetch(`${API_STUDENT_URL}/${studentId}/orders`);
            const data = await res.json();
            if (Array.isArray(data)) setOrders(data);
             else setOrders([]);
        } catch (e) { Alert.alert('Error', 'Failed to fetch orders'); }
        setLoadingOrders(false);
    };

    const renderMenuTab = () => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Select a Canteen</Text>
            {loadingMenu && !selectedCanteen ? <ActivityIndicator color={theme.colors.primary} /> : (
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedCanteen}
                        style={styles.picker}
                        itemStyle={styles.pickerItem}
                        dropdownIconColor={theme.colors.primary}
                        onValueChange={(itemValue) => {
                            if (itemValue) {
                                fetchFoodsForCanteen(itemValue);
                            } else {
                                setSelectedCanteen(null);
                                setFoods([]);
                            }
                        }}
                    >
                        <Picker.Item label="-- Choose a Canteen --" value={null} />
                        {canteens.map((c) => (
                            <Picker.Item key={c.CanteenID} label={`${c.CanteenName} (${c.Location})`} value={c.CanteenID} />
                        ))}
                    </Picker>
                </View>
            )}

            {selectedCanteen && (
                <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Menu Items</Text>
                    {loadingMenu ? <ActivityIndicator color={theme.colors.primary} /> :
                        <FlatList data={foods} showsVerticalScrollIndicator={false} keyExtractor={f => f.FoodID?.toString() || Math.random().toString()} renderItem={({ item }) => (
                            <View style={styles.foodItem}>
                                {item.Image ? (
                                    <Image source={{ uri: item.Image }} style={styles.listImage} />
                                ) : (
                                    <View style={styles.iconPlaceholder}>
                                        <Ionicons name="fast-food" size={26} color={theme.colors.textMuted} />
                                    </View>
                                )}
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.foodTitle}>{item.Name}</Text>
                                    <Text style={styles.foodPrice}>Rs {item.Price}</Text>
                                </View>
                                <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                                    <Text style={styles.addBtnText}>+ Add</Text>
                                </TouchableOpacity>
                            </View>
                        )} ListEmptyComponent={<Text style={styles.placeholder}>No menu items available here currently.</Text>} />
                    }
                </>
            )}
        </View>
    );

    const renderCartTab = () => {
        const total = cart.reduce((sum, item) => sum + (item.food.Price * item.quantity), 0);
        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Your Cart</Text>
                {cart.length === 0 ? <Text style={styles.placeholder}>Cart is empty</Text> : (
                    <>
                        <FlatList data={cart} showsVerticalScrollIndicator={false} keyExtractor={c => c.food.FoodID?.toString() || Math.random().toString()} renderItem={({ item }) => (
                            <View style={styles.foodItem}>
                                <Text style={styles.foodTitle}>{item.food.Name} (x{item.quantity})</Text>
                                <Text style={styles.foodPrice}>Rs {item.food.Price * item.quantity}</Text>
                            </View>
                        )} />

                        <View style={styles.checkoutBox}>
                            <Text style={styles.totalText}>Total: Rs {total}</Text>
                            <TextInput style={styles.input} placeholderTextColor={theme.colors.textMuted} placeholder="Pickup Time (e.g. 12:30 PM)" value={pickupTime} onChangeText={setPickupTime} />
                            <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
                                <Text style={styles.checkoutBtnText}>Checkout Order</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        );
    };

    const renderOrdersTab = () => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Order History</Text>
            {loadingOrders ? <ActivityIndicator color={theme.colors.primary} /> :
                <FlatList data={orders} showsVerticalScrollIndicator={false} keyExtractor={o => o.OrderID?.toString() || Math.random().toString()} renderItem={({ item }) => (
                    <View style={styles.orderCard}>
                        <Text style={styles.foodTitle}>Order #{item.OrderID} - {item.FoodName} (x{item.Quantity})</Text>
                        <Text style={styles.cardSub}>Pickup: {item.PickupTime} | Price: Rs {item.TotalPrice}</Text>
                        <Text style={[styles.statusTag, { color: item.Status ? theme.colors.accent : theme.colors.warningText }]}>
                            • {item.Status ? 'COMPLETED (Ready)' : 'PENDING PREPARATION'}
                        </Text>
                    </View>
                )} ListEmptyComponent={<Text style={styles.placeholder}>You haven't ordered anything yet.</Text>} />
            }
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {activeTab === 'menu' && renderMenuTab()}
                {activeTab === 'cart' && renderCartTab()}
                {activeTab === 'orders' && renderOrdersTab()}
            </View>

            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('menu')}>
                    <Ionicons name="fast-food" size={24} color={activeTab === 'menu' ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.navText, activeTab === 'menu' && styles.navTextActive]}>Menu</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('cart')}>
                    <Ionicons name="basket" size={24} color={activeTab === 'cart' ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.navText, activeTab === 'cart' && styles.navTextActive]}>Cart ({cart.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('orders')}>
                    <Ionicons name="list" size={24} color={activeTab === 'orders' ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.navText, activeTab === 'orders' && styles.navTextActive]}>Orders</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: { backgroundColor: theme.colors.surface, padding: 12, paddingHorizontal: 20, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 10 },
    title: { fontSize: 24, fontWeight: '900', color: theme.colors.primaryDeep, letterSpacing: -0.5 },
    bottomNav: { flexDirection: 'row', backgroundColor: theme.colors.surface, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
    navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    navText: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4, fontWeight: '700' },
    navTextActive: { color: theme.colors.primary, fontWeight: '800' },
    content: { flex: 1 },
    sectionContainer: { flex: 1, padding: 20, paddingBottom: 0 },
    pickerContainer: { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10, justifyContent: 'center', paddingVertical: Platform.OS === 'ios' ? 5 : 0 },
    picker: { width: '100%', color: theme.colors.text, height: Platform.OS === 'android' ? 50 : undefined },
    pickerItem: { color: theme.colors.text, fontSize: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, marginBottom: 15 },
    foodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 15, borderRadius: theme.radius.lg, marginVertical: 6, ...theme.shadow.soft, borderWidth: 1, borderColor: theme.colors.border },
    listImage: { width: 50, height: 50, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt },
    iconPlaceholder: { width: 50, height: 50, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
    foodTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    foodPrice: { fontSize: 14, color: theme.colors.accent, marginTop: 4, fontWeight: '800' },
    addBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.pill },
    addBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    checkoutBox: { marginTop: 20, padding: 20, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, ...theme.shadow.soft, borderWidth: 1, borderColor: theme.colors.border },
    totalText: { fontSize: 18, fontWeight: '900', marginBottom: 15, color: theme.colors.text },
    input: { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm, padding: 14, marginBottom: 15, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.text, fontSize: 15 },
    checkoutBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.radius.sm, alignItems: 'center' },
    checkoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    orderCard: { backgroundColor: theme.colors.warningBg, padding: 16, borderRadius: theme.radius.lg, marginVertical: 8, borderLeftWidth: 6, borderLeftColor: theme.colors.warningText, ...theme.shadow.soft, borderWidth: 1, borderColor: theme.colors.border },
    cardSub: { fontSize: 13, color: theme.colors.textMuted, marginTop: 5 },
    statusTag: { marginTop: 10, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    placeholder: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 40, fontSize: 15, fontWeight: '600' }
});
