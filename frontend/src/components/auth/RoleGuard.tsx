import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { LoadingState } from "@/components/DataState";
export function RoleGuard({ role, children }: { role: "admin" | "provider"; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Redirect href="/auth/login" />;
  if (user.role !== role) return <Redirect href="/" />;
  return <>{children}</>;
}
