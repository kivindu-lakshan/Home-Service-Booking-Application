import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, clearToken, getStoredToken, saveToken } from "@/api/client";
type User = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  emailVerified: boolean;
};
type AuthValue = {
  user: User | null;
  loading: boolean;
  verificationToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  verificationToken: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  );
  useEffect(() => {
    getStoredToken()
      .then((token) => (token ? api.get("/auth/me") : null))
      .then((r) => {
        if (r) setUser(r.data.data);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password });
    await saveToken(r.data.data.token);
    setUser(r.data.data.user);
  };
  const register = async (
    fullName: string,
    email: string,
    phone: string,
    password: string,
  ) => {
    const r = await api.post("/auth/register", {
      fullName,
      email,
      phone,
      password,
    });
    await saveToken(r.data.data.token);
    setUser(r.data.data.user);
    setVerificationToken(r.data.data.verificationToken || null);
  };
  const logout = async () => {
    await clearToken();
    setUser(null);
  };
  return (
    <AuthContext.Provider
      value={{ user, loading, verificationToken, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
