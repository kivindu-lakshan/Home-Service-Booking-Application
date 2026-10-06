import CustomerHome from "@/components/customer/CustomerHome";
import { LoadingState } from "@/components/DataState";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";

export default function HomeScreen() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/onboarding/landing" />;
  if (user.role === "provider") return <Redirect href="/provider/dashboard" />;
  if (user.role === "admin") return <Redirect href="/admin/dashboard" />;
  return <CustomerHome />;
}
