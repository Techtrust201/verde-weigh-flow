import { Truck, Edit, Trash2, MoreVertical, MapPin, Phone, Mail, FileText } from "lucide-react";
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
import { Transporteur } from "@/lib/database";

interface TransporteurCardProps {
  transporteur: Transporteur;
  isSelected: boolean;
  onSelect: (transporteurId: number) => void;
  onEdit: (transporteur: Transporteur) => void;
  onDelete: (transporteur: Transporteur) => void;
}

export default function TransporteurCard({
  transporteur,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: TransporteurCardProps) {
  const displayName = `${transporteur.prenom} ${transporteur.nom}`.trim();

  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 animate-fade-in">
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(transporteur.id!)}
          className="bg-background shadow-sm"
        />
      </div>

      <CardContent className="p-6 pt-12">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-lg line-clamp-1">
                {displayName || "Sans nom"}
              </h3>
            </div>
            {transporteur.plaque && (
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
                {transporteur.plaque}
              </p>
            )}
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
              <DropdownMenuItem onClick={() => onEdit(transporteur)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(transporteur)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm">
          {transporteur.adresse && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">
                {transporteur.adresse}
                {transporteur.ville && `, ${transporteur.ville}`}
              </span>
            </div>
          )}
          {transporteur.telephone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{transporteur.telephone}</span>
            </div>
          )}
          {transporteur.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{transporteur.email}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
        {transporteur.siret && (
          <Badge variant="outline" className="text-xs gap-1">
            <FileText className="h-3 w-3" />
            SIRET
          </Badge>
        )}
        {transporteur.email && (
          <Badge variant="outline" className="text-xs">
            Email
          </Badge>
        )}
        {transporteur.telephone && (
          <Badge variant="outline" className="text-xs">
            Téléphone
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
