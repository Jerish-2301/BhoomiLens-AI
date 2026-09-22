import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full relative overflow-hidden bg-background">
      {/* Aurora Background */}
      <div className="aurora-bg opacity-60 dark:opacity-100"></div>
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }}></div>

      <div className="flex w-full z-10">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
