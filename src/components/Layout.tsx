import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  Scale,
  History,
  User,
  Calculator,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  currentSpace: string;
  onSpaceChange: (space: string) => void;
}

const spaces = [
  { id: "pesee", name: "Pesée", icon: Scale },
  { id: "clients", name: "Clients", icon: Users },
  { id: "transporteurs", name: "Transporteurs", icon: User },
  { id: "produits", name: "Produits", icon: Package },
  { id: "historique", name: "Historique", icon: History },
  { id: "utilisateur", name: "Utilisateur", icon: User },
  { id: "comptabilite", name: "Comptabilité", icon: Calculator },
];

export default function Layout({
  children,
  currentSpace,
  onSpaceChange,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log("Online event triggered");
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log("Offline event triggered");
      setIsOnline(false);
    };

    // Vérifier immédiatement le statut
    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Vérifier périodiquement le statut de connexion
    const checkConnection = setInterval(() => {
      if (navigator.onLine !== isOnline) {
        setIsOnline(navigator.onLine);
      }
    }, 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(checkConnection);
    };
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Now sticky */}
      <div
        className={cn(
          "bg-white shadow-lg transition-all z-[51] duration-300 flex flex-col shrink-0 sticky top-0 h-screen",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="p-4 border-b min-h-[73px] flex items-center">
          <div className="flex items-center justify-between w-full">
            <h1
              className={cn(
                "font-bold text-green-600 transition-all duration-300 whitespace-nowrap",
                sidebarOpen
                  ? "opacity-100 max-w-none"
                  : "opacity-0 max-w-0 overflow-hidden"
              )}
            >
              Barberis Déchets Verts
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="shrink-0"
            >
              {sidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <nav className="z-10 flex-1 p-4 space-y-2 overflow-y-auto">
          {spaces.map((space) => {
            const Icon = space.icon;
            return (
              <Button
                key={space.id}
                variant={currentSpace === space.id ? "default" : "ghost"}
                className={cn("w-full justify-start", !sidebarOpen && "px-2")}
                onClick={() => onSpaceChange(space.id)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {sidebarOpen && space.name}
              </Button>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div
            className={cn(
              "flex items-center space-x-2",
              !sidebarOpen && "justify-center"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-green-500" : "bg-red-500"
              )}
            />
            {sidebarOpen && (
              <span className="text-sm text-gray-600">
                {isOnline ? "En ligne" : "Hors ligne"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
