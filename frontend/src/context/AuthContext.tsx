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
  verificationCode: string | null;
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
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
  syncProfile: (profile: Pick<User, "id" | "fullName" | "phone">) => void;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  verificationCode: null,
  login: async () => ({
    id: "",
    fullName: "",
    email: "",
    role: "customer",
    emailVerified: false,
  }),
  register: async () => {},
  verifyEmail: async () => {},
  resendVerification: async () => {},
  logout: async () => {},
  syncProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);

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
    setVerificationCode(null);
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
    setVerificationCode(response.data.data.verificationCode || null);
  };

  const verifyEmail = async (code: string) => {
    const response = await api.post("/auth/verify-email", { code });
    setUser(response.data.data);
    setVerificationCode(null);
  };

  const resendVerification = async () => {
    const response = await api.post("/auth/resend-verification");
    setVerificationCode(response.data.data?.verificationCode || null);
  };

  const logout = async () => {
    setVerificationCode(null);
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
      value={{ user, loading, verificationCode, login, register, verifyEmail, resendVerification, logout, syncProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
