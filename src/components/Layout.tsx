
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Package, 
  Scale, 
  History, 
  User, 
  Calculator,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  currentSpace: string;
  onSpaceChange: (space: string) => void;
}

const spaces = [
  { id: 'pesee', name: 'Pesée', icon: Scale },
  { id: 'clients', name: 'Clients', icon: Users },
  { id: 'produits', name: 'Produits', icon: Package },
  { id: 'historique', name: 'Historique', icon: History },
  { id: 'utilisateur', name: 'Utilisateur', icon: User },
  { id: 'comptabilite', name: 'Comptabilité', icon: Calculator },
];

export default function Layout({ children, currentSpace, onSpaceChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={cn(
        "bg-white shadow-lg transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className={cn(
              "font-bold text-green-600 transition-opacity",
              sidebarOpen ? "opacity-100" : "opacity-0"
            )}>
              Barberis Déchets Verts
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {spaces.map((space) => {
            const Icon = space.icon;
            return (
              <Button
                key={space.id}
                variant={currentSpace === space.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  !sidebarOpen && "px-2"
                )}
                onClick={() => onSpaceChange(space.id)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {sidebarOpen && space.name}
              </Button>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className={cn(
            "flex items-center space-x-2",
            !sidebarOpen && "justify-center"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-green-500" : "bg-red-500"
            )} />
            {sidebarOpen && (
              <span className="text-sm text-gray-600">
                {isOnline ? "En ligne" : "Hors ligne"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
