import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "@/lib/api-client";
import type { Branch, Role, User } from "@/lib/api-types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: { email: string; password: string; fullName: string; role: Exclude<Role, "admin"> }) => Promise<User>;
  requestRegistrationOtp: (
    input:
      | { role: "student"; fullName: string; email: string; password: string; branch: Branch; year: number }
      | { role: "teacher"; fullName: string; email: string; password: string; branch: Branch; courses: string[] },
  ) => Promise<void>;
  verifyRegistrationOtp: (email: string, otp: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.me().then((u) => {
      if (mounted) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    tokenStore.set(token);
    setUser(user);
    return user;
  };

  const signup: AuthContextValue["signup"] = async (input) => {
    const { token, user } = await api.signup(input);
    tokenStore.set(token);
    setUser(user);
    return user;
  };

  const requestRegistrationOtp: AuthContextValue["requestRegistrationOtp"] = async (input) => {
    await api.registerRequestOtp(input);
  };

  const verifyRegistrationOtp: AuthContextValue["verifyRegistrationOtp"] = async (email, otp) => {
    const { token, user } = await api.registerVerifyOtp(email, otp);
    tokenStore.set(token);
    setUser(user);
    return user;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, requestRegistrationOtp, verifyRegistrationOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
