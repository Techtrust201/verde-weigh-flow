import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface TrackDechetBadgeProps {
  enabled?: boolean;
  bsdStatus?: string;
  variant?: "product" | "pesee";
}

export function TrackDechetBadge({ enabled, bsdStatus, variant = "product" }: TrackDechetBadgeProps) {
  if (variant === "product" && !enabled) {
    return null;
  }

  if (variant === "pesee" && bsdStatus) {
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'draft':
          return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
        case 'sealed':
          return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
        case 'sent':
          return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
        case 'received':
          return 'bg-green-100 text-green-800 hover:bg-green-200';
        case 'processed':
          return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
        case 'pending_sync':
          return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
        default:
          return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status.toLowerCase()) {
        case 'draft': return 'BSD Créé';
        case 'sealed': return 'BSD Scellé';
        case 'sent': return 'BSD Envoyé';
        case 'received': return 'BSD Reçu';
        case 'processed': return 'BSD Traité';
        case 'pending_sync': return 'En attente...';
        default: return status;
      }
    };

    return (
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 ${getStatusColor(bsdStatus)}`}
      >
        <FileText className="h-3 w-3" />
        {getStatusLabel(bsdStatus)}
      </Badge>
    );
  }

  // Product variant
  return (
    <Badge 
      variant="outline" 
      className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200"
    >
      <FileText className="h-3 w-3" />
      Track Déchet
    </Badge>
  );
}