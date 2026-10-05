import { Text } from 'react-native';
import type { ApplicationStatus as Status } from '@/api/admin-provider-applications';
export default function ApplicationStatus({ status }: { status: Status }) {
  const colors = { pending: ['#5B3DF5', '#EEE9FF'], approved: ['#278B70', '#E6F5EE'], rejected: ['#B73248', '#FCE9EC'] }[status];
  return <Text style={{ color: colors[0], backgroundColor: colors[1], paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, fontWeight: '700', alignSelf: 'flex-start' }}>{status[0].toUpperCase() + status.slice(1)}</Text>;
}
