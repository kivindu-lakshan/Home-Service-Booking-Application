import ServiceList from '@/components/services/ServiceList';
import { ServiceGuard } from '@/components/services/ServiceUI';
export default function AvailableServices() { return <ServiceGuard><ServiceList /></ServiceGuard>; }
