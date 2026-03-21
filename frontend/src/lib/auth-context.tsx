"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: number; email: string; name: string; role: string;
  phone?: string; organisation_id?: number;
}

interface AuthContextType {
  user: User | null; token: string | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("wasteiq_token");
    const savedUser = localStorage.getItem("wasteiq_user");
    if (saved && savedUser) {
      setToken(saved);
      setUser(JSON.parse(savedUser));
      api.setToken(saved);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    api.setToken(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("wasteiq_token", res.access_token);
    localStorage.setItem("wasteiq_user", JSON.stringify(res.user));
  };

  const logout = () => {
    api.clearToken();
    setToken(null);
    setUser(null);
    localStorage.removeItem("wasteiq_token");
    localStorage.removeItem("wasteiq_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
