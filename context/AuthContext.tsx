import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthContextType = {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("openai_api_key").then((key) => {
      setApiKeyState(key);
      setIsLoading(false);
    });
  }, []);

  const setApiKey = async (key: string | null) => {
    if (key) {
      await AsyncStorage.setItem("openai_api_key", key);
    } else {
      await AsyncStorage.removeItem("openai_api_key");
    }
    setApiKeyState(key);
  };

  return (
    <AuthContext.Provider value={{ apiKey, setApiKey, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
