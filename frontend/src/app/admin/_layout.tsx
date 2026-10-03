import { Stack } from "expo-router";
import { RoleGuard } from "@/components/auth/RoleGuard";
export default function Layout() { return <RoleGuard role="admin"><Stack /></RoleGuard>; }
