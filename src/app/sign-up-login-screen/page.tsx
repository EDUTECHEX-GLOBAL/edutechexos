import { Suspense } from 'react';
import AuthCard from './components/AuthCard';

export default function AuthPage() {
  return (
    <div className="graph-paper-bg min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Minimal nav */}
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center px-6 lg:px-10 border-b border-border bg-white/90 backdrop-blur-sm z-10">
        <a href="/" className="flex items-center gap-2 no-underline">
          <span className="font-display font-700 text-base tracking-tight text-foreground">
            EduTechEx<span className="text-primary">OS</span>
          </span>
        </a>
      </div>
      <Suspense
        fallback={
          <div className="mt-14 w-full max-w-md rounded-2xl border border-border bg-white p-8 text-sm font-600 text-muted-foreground shadow-sm">
            Loading sign in...
          </div>
        }
      >
        <AuthCard />
      </Suspense>
    </div>
  );
}
