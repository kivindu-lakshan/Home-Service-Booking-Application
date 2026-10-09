import { Redirect, useLocalSearchParams } from "expo-router";

export default function BookProvider() {
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  return (
    <Redirect
      href={
        {
          pathname: "/bookings/new",
          params: serviceId ? { serviceId } : {},
        } as any
      }
    />
  );
}
