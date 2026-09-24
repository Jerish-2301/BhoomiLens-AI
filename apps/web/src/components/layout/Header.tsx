import { useState } from 'react';
import { Bell, Search, Sun, Moon, LogOut } from 'lucide-react';
import { UserProfileSettings } from './UserProfileSettings';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';

export function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // Get initials from displayName or email
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?';

  return (
    <>
      <header className="h-14 sm:h-16 glass-card mt-2 sm:mt-4 mx-3 md:mr-4 md:ml-0 sticky top-2 sm:top-4 z-40 flex items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2">
          <button className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-2 sm:px-3 py-1.5 rounded-md border hover:bg-secondary transition-colors w-full max-w-[140px] sm:max-w-[256px] justify-between overflow-hidden">
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Search...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 bg-background border px-1.5 rounded text-[10px] font-mono font-medium shrink-0">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Theme toggle */}
          <button
            id="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors overflow-hidden"
          >
            <Sun
              className={`w-5 h-5 transition-all duration-300 ${
                theme === 'dark'
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 rotate-90 scale-50 absolute inset-0 m-auto'
              }`}
            />
            <Moon
              className={`w-5 h-5 transition-all duration-300 ${
                theme === 'light'
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-90 scale-50 absolute inset-0 m-auto'
              }`}
            />
          </button>

          <button className="relative p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
          </button>

          {/* User avatar */}
          <button 
            onClick={() => setIsProfileOpen(true)}
            title={user?.displayName ?? user?.email ?? ''}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
          >
            {initials}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <UserProfileSettings isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
