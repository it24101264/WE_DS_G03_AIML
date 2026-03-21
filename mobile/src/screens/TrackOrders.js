import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../ui/theme';
import { API_URLS } from '../config';

const API_URL = API_URLS.CANTEEN;

export default function TrackOrders({ route, navigation, user, canteenId: propsCanteenId }) {
    const canteenId = propsCanteenId || route.params?.canteenId || user?.id || 1;
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/${canteenId}/orders`);
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch tracking orders');
        } finally {
            setLoading(false);
        }
    };

    const markOrderComplete = async (orderId) => {
        try {
            const response = await fetch(`${API_URL}/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 1 })
            });
            const data = await response.json();

            if (data.success) {
                fetchOrders();
            } else {
                Alert.alert('Error', 'Failed to update order');
            }
        } catch (error) {
            Alert.alert('Error', 'Server error while updating order');
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.listItem}>
            <View style={{ flex: 1, marginRight: 15 }}>
                <Text style={styles.listTitle}>Order #{item.OrderID} - {item.FoodName}</Text>
                <Text style={styles.listSubtitle}>Quantity: <Text style={{fontWeight:'700', color: theme.colors.text}}>{item.Quantity}</Text> | Pickup: <Text style={{fontWeight:'700', color: theme.colors.text}}>{item.PickupTime}</Text></Text>
                <Text style={[styles.statusText, { color: item.Status ? theme.colors.accent : theme.colors.danger }]}>
                    • {item.Status ? 'Prepared' : 'Pending Preparation'}
                </Text>
            </View>
            {!item.Status && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => markOrderComplete(item.OrderID)}>
                    <Text style={styles.completeText}>Complete</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.listContainer}>
                <Text style={styles.sectionTitle}>Active Orders</Text>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                ) : (
                    <FlatList
                        data={orders}
                        keyExtractor={item => item.OrderID?.toString() || Math.random().toString()}
                        renderItem={renderItem}
                        ListEmptyComponent={<Text style={styles.placeholder}>No orders received yet.</Text>}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, marginBottom: 15 },
    listContainer: { flex: 1, padding: 20 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, marginVertical: 6, ...theme.shadow.soft, borderWidth: 1, borderColor: theme.colors.border },
    listTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    listSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
    statusText: { fontSize: 12, fontWeight: '800', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    completeBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: theme.radius.pill },
    completeText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    placeholder: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 20, fontSize: 15, fontWeight: '600' }
});
