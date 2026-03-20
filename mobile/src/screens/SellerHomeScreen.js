import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation, setIsLoggedIn }) {

  const handleLogout = async () => {
  const confirmed = window.confirm('Are you sure you want to logout?');
  if (confirmed) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setIsLoggedIn(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎓 UniMarket</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Welcome */}
      <View style={styles.welcomeBox}>
        <Text style={styles.welcomeTitle}>Welcome, Seller! 👋</Text>
        <Text style={styles.welcomeSubtitle}>
          Manage your listings from here
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>

        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Text style={styles.mainButtonIcon}>➕</Text>
          <Text style={styles.mainButtonText}>Create New Listing</Text>
          <Text style={styles.mainButtonSub}>Add an item for sale</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainButton, styles.secondButton]}
          onPress={() => navigation.navigate('MyListings')}
        >
          <Text style={styles.mainButtonIcon}>📦</Text>
          <Text style={styles.mainButtonText}>My Listings</Text>
          <Text style={styles.mainButtonSub}>View, edit or delete your items</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    backgroundColor: '#1e6b3e',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  welcomeBox: {
    padding: 24,
    paddingBottom: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e6b3e',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  buttonContainer: {
    padding: 24,
    gap: 16,
  },
  mainButton: {
    backgroundColor: '#1e6b3e',
    borderRadius: 16,
    padding: 24,
  },
  secondButton: {
    backgroundColor: '#2d9e56',
  },
  mainButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mainButtonSub: {
    color: '#c8f0d8',
    fontSize: 13,
    marginTop: 4,
  },
});