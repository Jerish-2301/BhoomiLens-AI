import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Files, 
  Map as MapIcon, 
  Search, 
  CheckCircle, 
  Activity, 
  ShieldAlert,
  Settings,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Files, label: 'Documents', href: '/documents' },
  { icon: Search, label: 'Land Records', href: '/records' },
  { icon: MapIcon, label: 'GIS Intelligence', href: '/gis' },
  { icon: Bot, label: 'AI Intelligence', href: '/ai' },
  { icon: CheckCircle, label: 'Verification', href: '/verification' },
  { icon: Activity, label: 'Analytics', href: '/analytics' },
  { icon: ShieldAlert, label: 'Audit', href: '/audit' },
  { icon: Settings, label: 'Administration', href: '/admin' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[260px] glass-card m-4 h-[calc(100vh-32px)] sticky top-4 flex-col hidden lg:flex overflow-hidden">
      <div className="h-16 flex items-center px-6 border-b border-white/10 font-heading font-bold text-xl text-primary tracking-tight">
        BhoomiLens AI
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <div className="bg-primary/10 p-3 rounded-lg flex flex-col gap-2">
          <div className="text-xs font-semibold text-primary">Trust Score</div>
          <div className="text-2xl font-heading font-bold text-foreground">87<span className="text-sm text-muted-foreground font-normal">/100</span></div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">System Average</div>
        </div>
      </div>
    </aside>
  );
}
