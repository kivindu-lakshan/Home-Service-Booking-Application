import ServiceList from '@/components/services/ServiceList';
import { ServiceGuard } from '@/components/services/ServiceUI';
export default function AdminServices() { return <ServiceGuard admin><ServiceList admin /></ServiceGuard>; }
