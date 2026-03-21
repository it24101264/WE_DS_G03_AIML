import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../ui/theme';

import FoodManagement from './CanteenOwnerScreen';
import TrackOrders from './TrackOrders';

const Tab = createBottomTabNavigator();

export default function CanteenBottomTabs({ route, navigation, user, onLogout }) {
    const canteenId = route.params?.canteenId || user?.id || 1;

    const handleLogout = () => {
        if(onLogout) {
            onLogout();
        } else {
            navigation.replace('Login');
        }
    };

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'FoodManagement') {
                        iconName = focused ? 'fast-food' : 'fast-food-outline';
                    } else if (route.name === 'TrackOrders') {
                        iconName = focused ? 'list' : 'list-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    elevation: 10,
                },
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTintColor: theme.colors.text,
                headerShadowVisible: false,
                headerTitleStyle: { color: theme.colors.text, fontWeight: '800', fontSize: 20 },
                headerRight: () => (
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                ),
            })}
        >
            <Tab.Screen
                name="FoodManagement"
                options={{ title: 'Food Menu' }}
            >
                {(props) => <FoodManagement {...props} user={user} onLogout={onLogout} canteenId={canteenId} initialParams={{ canteenId }} />}
            </Tab.Screen>
            <Tab.Screen
                name="TrackOrders"
                options={{ title: 'Track Orders' }}
            >
                {(props) => <TrackOrders {...props} user={user} canteenId={canteenId} initialParams={{ canteenId }} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    logoutBtn: {
        marginRight: 15,
        backgroundColor: theme.colors.surfaceAlt,
        borderColor: theme.colors.border,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.radius.sm,
    },
    logoutText: {
        color: theme.colors.danger,
        fontWeight: '800',
        fontSize: 13,
        letterSpacing: 0.3
    }
});
