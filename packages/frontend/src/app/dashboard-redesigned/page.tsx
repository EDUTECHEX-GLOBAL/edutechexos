import ClientOnly from '../components/ClientOnly';
import DashboardRedesigned from '@/app/dashboard/components/DashboardRedesigned';

export default function RedesignedDashboardPage() {
  return (
    <ClientOnly>
      <DashboardRedesigned />
    </ClientOnly>
  );
}
