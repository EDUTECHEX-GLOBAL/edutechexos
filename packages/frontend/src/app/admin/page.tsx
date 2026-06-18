import ClientOnly from '../components/ClientOnly';
import AdminDashboard from './AdminDashboard';

export default function AdminPage() {
  return (
    <ClientOnly>
      <AdminDashboard />
    </ClientOnly>
  );
}
