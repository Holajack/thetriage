import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      setIsAuthenticated(!!token);
    } catch (error) {
      // Error checking auth state
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    try {
      await AsyncStorage.setItem("userToken", token);
      setIsAuthenticated(true);
    } catch (error) {
      // Error storing auth token
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      setIsAuthenticated(false);
    } catch (error) {
      // Error removing auth token
      throw error;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
};
