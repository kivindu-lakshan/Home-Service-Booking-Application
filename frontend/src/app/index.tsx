import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import CustomerHome from "@/components/customer/CustomerHome";
import { LoadingState } from "@/components/DataState";

export default function HomeScreen() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/auth/login" />;
  if (user.role === "customer") return <CustomerHome />;
  if (user.role === "provider") return <Redirect href="/provider/dashboard" />;
  if (user.role === "admin") return <Redirect href="/admin/home" />;
  return <Redirect href="/auth/login" />;
}
