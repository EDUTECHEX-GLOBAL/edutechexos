import ClientOnly from '../components/ClientOnly';
import SignUpLoginScreen from './SignUpLoginScreen';

export default function AuthPage() {
  return (
    <ClientOnly>
      <SignUpLoginScreen />
    </ClientOnly>
  );
}
