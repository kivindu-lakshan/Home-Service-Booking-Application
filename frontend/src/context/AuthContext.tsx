import { api, clearToken, getStoredToken, saveToken } from "@/api/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type User = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
};

type AuthValue = {
  user: User | null;
  loading: boolean;
  verificationToken: string | null;
  login: (
    email: string,
    password: string,
    role: "customer" | "provider" | "admin",
  ) => Promise<User>;
  register: (
    fullName: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  syncProfile: (profile: Pick<User, "id" | "fullName" | "phone">) => void;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  verificationToken: null,
  login: async () => ({
    id: "",
    fullName: "",
    email: "",
    role: "customer",
    emailVerified: false,
  }),
  register: async () => {},
  logout: async () => {},
  syncProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  useEffect(() => {
    getStoredToken()
      .then((token) => (token ? api.get("/auth/me") : null))
      .then((response) => {
        if (response) setUser(response.data.data);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (
    email: string,
    password: string,
    role: "customer" | "provider" | "admin",
  ) => {
    const response = await api.post("/auth/login", { email, password, role });
    await saveToken(response.data.data.token);
    setUser(response.data.data.user);
    return response.data.data.user;
  };

  const register = async (
    fullName: string,
    email: string,
    phone: string,
    password: string,
  ) => {
    const response = await api.post("/auth/register", {
      fullName,
      email,
      phone,
      password,
    });
    await saveToken(response.data.data.token);
    setUser(response.data.data.user);
    setVerificationToken(response.data.data.verificationToken || null);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  const syncProfile = useCallback(
    (profile: Pick<User, "id" | "fullName" | "phone">) => {
      setUser((current) =>
        current?.id === profile.id
          ? { ...current, fullName: profile.fullName, phone: profile.phone }
          : current,
      );
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, verificationToken, login, register, logout, syncProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
