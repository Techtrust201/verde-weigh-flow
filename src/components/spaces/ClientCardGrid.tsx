import { Client } from "@/lib/database";
import ClientCard from "./ClientCard";

interface ClientCardGridProps {
  clients: Client[];
  selectedClientIds: Set<number>;
  onSelect: (clientId: number) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onToggleFavorite: (client: Client) => void;
}

export default function ClientCardGrid({
  clients,
  selectedClientIds,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ClientCardGridProps) {
  if (clients.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          isSelected={selectedClientIds.has(client.id!)}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
