import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, clearToken, saveToken } from "@/api/client";
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
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.data))
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
    password: string,
  ) => {
    const r = await api.post("/auth/register", { fullName, email, password });
    await saveToken(r.data.data.token);
    setUser(r.data.data.user);
  };
  const logout = async () => {
    await clearToken();
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
