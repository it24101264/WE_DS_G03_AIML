// src/context/AuthContext.js

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ───────────────────────────────
  // Check saved login
  // ───────────────────────────────
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        const savedUser = await AsyncStorage.getItem('user');

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.log("Check login error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkLogin();
  }, []);

  // ───────────────────────────────
  // Login
  // ───────────────────────────────
  const login = async (email, password) => {
    const response = await loginUser({ email, password });

    const newToken = response?.data?.token;
    const newUser = response?.data?.user;

    if (!newToken || !newUser) {
      throw new Error("Invalid login response");
    }

    await AsyncStorage.setItem('token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  };

  // ───────────────────────────────
  // Logout
  // ───────────────────────────────
  const logout = async () => {
    try {
      await AsyncStorage.clear();
      setToken(null);
      setUser(null);
      console.log("Logged out successfully");
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);