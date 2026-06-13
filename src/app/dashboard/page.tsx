import ClientOnly from '../components/ClientOnly';
import EduTechExOSDashboard from './components/EduTechExOSDashboard';

export default function DashboardPage() {
  return (
    <ClientOnly>
      <EduTechExOSDashboard />
    </ClientOnly>
  );
}
