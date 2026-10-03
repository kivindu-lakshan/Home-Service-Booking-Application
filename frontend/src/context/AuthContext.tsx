import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, clearToken, getStoredToken, saveToken } from "@/api/client";

type User = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  emailVerified?: boolean;
};

type AuthValue = {
  user: User | null;
  loading: boolean;
<<<<<<< HEAD
  verificationCode: string | null;
  login: (email: string, password: string) => Promise<User>;
=======
  login: (
    email: string,
    password: string,
  ) => Promise<User>;
>>>>>>> origin-02/feature/payment,review,admin
  register: (
    fullName: string,
    email: string,
    phone: string,
    password: string,
    role: "customer" | "provider",
  ) => Promise<void>;
  logout: () => Promise<void>;
  syncProfile: (profile: Pick<User, "id" | "fullName" | "phone">) => void;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
<<<<<<< HEAD
  verificationCode: null,
  login: async () => {
    throw new Error("AuthProvider is not available.");
  },
=======
  login: async () => ({
    id: "",
    fullName: "",
    email: "",
    role: "customer",
    emailVerified: false,
  }),
>>>>>>> origin-02/feature/payment,review,admin
  register: async () => {},
  logout: async () => {},
  syncProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredToken()
      .then((token) => (token ? api.get("/auth/me") : null))
      .then((response) => {
        if (response) setUser(response.data.data);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post("/auth/login", { email, password });
    await saveToken(response.data.data.token);
<<<<<<< HEAD
    setVerificationCode(null);
    const signedInUser: User = response.data.data.user;
    setUser(signedInUser);
    return signedInUser;
=======
    setUser(response.data.data.user);
    return response.data.data.user;
>>>>>>> origin-02/feature/payment,review,admin
  };

  const register = async (
    fullName: string,
    email: string,
    phone: string,
    password: string,
    role: "customer" | "provider",
  ) => {
    const response = await api.post("/auth/register", {
      fullName,
      email,
      phone,
      password,
      role,
    });
    await saveToken(response.data.data.token);
    setUser(response.data.data.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
    setVerificationCode(null);
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
<<<<<<< HEAD
      value={{
        user,
        loading,
        verificationCode,
        login,
        register,
        verifyEmail,
        resendVerification,
        logout,
        syncProfile,
      }}
=======
      value={{ user, loading, login, register, logout, syncProfile }}
>>>>>>> origin-02/feature/payment,review,admin
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
