import { Transporteur } from "@/lib/database";
import TransporteurCard from "./TransporteurCard";

interface TransporteurCardGridProps {
  transporteurs: Transporteur[];
  selectedTransporteurIds: Set<number>;
  onSelect: (transporteurId: number) => void;
  onEdit: (transporteur: Transporteur) => void;
  onDelete: (transporteur: Transporteur) => void;
}

export default function TransporteurCardGrid({
  transporteurs,
  selectedTransporteurIds,
  onSelect,
  onEdit,
  onDelete,
}: TransporteurCardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {transporteurs.map((transporteur) => (
        <TransporteurCard
          key={transporteur.id}
          transporteur={transporteur}
          isSelected={selectedTransporteurIds.has(transporteur.id!)}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
