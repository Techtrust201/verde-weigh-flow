import { Building, User, Star, Edit, Trash2, MoreVertical, MapPin, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Client } from "@/lib/database";

interface ClientCardProps {
  client: Client;
  isSelected: boolean;
  onSelect: (clientId: number) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onToggleFavorite: (client: Client) => void;
}

export default function ClientCard({
  client,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ClientCardProps) {
  const getTypeIcon = () => {
    if (client.typeClient === "particulier") {
      return <User className="h-5 w-5 text-blue-600" />;
    }
    return <Building className="h-5 w-5 text-purple-600" />;
  };

  const getTypeLabel = () => {
    if (client.typeClient === "particulier") return "Particulier";
    if (client.typeClient === "micro-entreprise") return "Micro-entreprise";
    return "Professionnel";
  };

  const getDisplayName = () => {
    if (client.typeClient === "particulier") {
      const fullName = `${client.prenom || ""} ${client.nom || ""}`.trim();
      if (fullName) return fullName;
    }
    
    if (client.raisonSociale) return client.raisonSociale;
    
    return "Sans nom";
  };

  const displayName = getDisplayName();

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 animate-fade-in">
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(client.id!)}
          className="bg-background shadow-sm"
        />
      </div>

      <CardContent className="p-6 pt-12">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getTypeIcon()}
              <h3 className="font-semibold text-lg line-clamp-1">
                {displayName || "Sans nom"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Code: {client.codeClient}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(client)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(client)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          {client.adresse && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">
                {client.adresse}
                {client.ville && `, ${client.ville}`}
              </span>
            </div>
          )}
          {client.telephone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{client.telephone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {getTypeLabel()}
        </Badge>
        {client.siret && (
          <Badge variant="secondary" className="text-xs">
            SIRET: {client.siret.substring(0, 5)}...
          </Badge>
        )}
        {client.email && (
          <Badge variant="outline" className="text-xs">
            Email
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
