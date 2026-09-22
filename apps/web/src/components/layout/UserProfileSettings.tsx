import { useState } from 'react';
import { Camera, X, ShieldCheck, Mail, Fingerprint, Lock, Bell, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

export function UserProfileSettings({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [avatar, setAvatar] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setAvatar(url);
    }
  };

  async function handleLogout() {
    onClose();
    await logout();
  }

  // Derive display values from real Firebase user
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User';
  const email = user?.email ?? '—';
  const uid = user?.uid ?? '—';

  // Generate initials
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Cover Background */}
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur-md rounded-full hover:bg-background/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-8 pb-8">
          {/* Avatar Section */}
          <div className="relative -mt-16 mb-6 flex justify-between items-end">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 rounded-full border-4 border-card bg-primary/20 flex items-center justify-center overflow-hidden relative shadow-xl">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-heading font-bold text-primary">{initials}</span>
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Change</span>
                </div>
              </div>
              
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Change Profile Picture"
              />
              
              {/* Verified Badge */}
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-primary rounded-full border-2 border-card flex items-center justify-center">
                <ShieldCheck className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            
            <div className="pb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                Verified User
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column — Real User Details */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-heading">{displayName}</h2>
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{email}</span>
                </p>
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm font-mono">
                  <Fingerprint className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-xs">{uid}</span>
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account Security</h3>
                
                <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Two-Factor Auth</p>
                      <p className="text-xs text-muted-foreground">Not configured</p>
                    </div>
                  </div>
                  <div className="w-8 h-4 bg-secondary rounded-full relative cursor-pointer">
                    <div className="w-3 h-3 bg-muted-foreground rounded-full absolute left-0.5 top-0.5" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Conflict Alerts</p>
                      <p className="text-xs text-muted-foreground">Email notifications</p>
                    </div>
                  </div>
                  <div className="w-8 h-4 bg-primary rounded-full relative cursor-pointer">
                    <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Account Info & Settings */}
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <h3 className="text-sm font-bold text-primary mb-3">Account Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">Email/Password</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email verified</span>
                    <span className={`font-medium ${user?.emailVerified ? 'text-primary' : 'text-destructive'}`}>
                      {user?.emailVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account created</span>
                    <span className="font-medium">
                      {user?.metadata?.creationTime
                        ? new Date(user.metadata.creationTime).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last sign in</span>
                    <span className="font-medium">
                      {user?.metadata?.lastSignInTime
                        ? new Date(user.metadata.lastSignInTime).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-sm font-medium text-left"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  Theme: {theme === 'dark' ? 'Dark' : 'Light'} — Click to switch
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-sm font-medium text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out of Session
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
