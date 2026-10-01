import { api } from "./client";

export type MyProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
  avatarUrl: string | null;
};

type ProfileResponse = {
  success: boolean;
  data: MyProfile;
  message: string;
};

export async function getMyProfile(signal?: AbortSignal): Promise<MyProfile> {
  const response = await api.get<ProfileResponse>("/auth/me", {
    signal,
    timeout: 15000,
  });
  return response.data.data;
}

export type ProfileUpdate = { fullName: string; phone: string };

export async function updateMyProfile(payload: ProfileUpdate, signal?: AbortSignal): Promise<MyProfile> {
  const response = await api.patch<ProfileResponse>("/auth/me", {
    fullName: payload.fullName,
    phone: payload.phone,
  }, { signal, timeout: 15000 });
  return response.data.data;
}
