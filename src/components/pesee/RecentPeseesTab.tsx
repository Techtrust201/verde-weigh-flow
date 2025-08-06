
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pesee, Product, Transporteur } from '@/lib/database';
import { PeseeDetailDialog } from './PeseeDetailDialog';

interface RecentPeseesTabProps {
  pesees: Pesee[];
  products: Product[];
  transporteurs: Transporteur[];
}

export const RecentPeseesTab: React.FC<RecentPeseesTabProps> = ({ pesees, products, transporteurs }) => {
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [selectedPesee, setSelectedPesee] = useState<Pesee | null>(null);

  const columns: ColumnDef<Pesee>[] = [
    {
      accessorKey: "numeroBon",
      header: "N° Bon",
    },
    {
      accessorKey: "dateHeure",
      header: "Date et Heure",
      cell: ({ row }) => {
        const date = new Date(row.getValue("dateHeure") as string);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      },
    },
    {
      accessorKey: "nomEntreprise",
      header: "Client",
    },
    {
      accessorKey: "plaque",
      header: "Plaque",
    },
    {
      accessorKey: "produitId",
      header: "Produit",
      cell: ({ row }) => {
        const produitId = row.getValue("produitId") as number;
        const product = products.find(p => p.id === produitId);
        return product ? product.nom : 'N/A';
      },
    },
    {
      accessorKey: "transporteur",
      header: "Transporteur",
      cell: ({ row }) => {
        const pesee = row.original;
        // Afficher le transporteur libre en priorité, sinon le transporteur officiel, sinon le client
        if (pesee.transporteurLibre?.trim()) {
          return pesee.transporteurLibre.trim();
        } else if (transporteurs.find(t => t.id === pesee.transporteurId)) {
          const transporteur = transporteurs.find(t => t.id === pesee.transporteurId);
          return transporteur ? `${transporteur.prenom} ${transporteur.nom}` : 'N/A';
        } else {
          return pesee.nomEntreprise;
        }
      }
    },
    {
      accessorKey: "net",
      header: "Poids Net",
      cell: ({ row }) => {
        const netWeight = row.getValue("net") as number;
        return netWeight.toFixed(3) + ' T';
      },
    },
    {
      accessorKey: "moyenPaiement",
      header: "Paiement",
    },
  ]

  const table = useReactTable({
    data: pesees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getPaginationRowModel: getCoreRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Rechercher..."
          value={globalFilter ?? ""}
          onChange={e => setGlobalFilter(e.target.value)}
          className="ml-auto w-1/4"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => {
                  return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        className="p-0 h-auto text-blue-600 hover:text-blue-800"
                        onClick={() => setSelectedPesee(row.original)}
                      >
                        {row.original.numeroBon}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.original.dateHeure.toLocaleDateString()} {row.original.dateHeure.toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.original.nomEntreprise}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.original.plaque}
                    </TableCell>
                    <TableCell className="text-sm">
                      {products.find(p => p.id === row.original.produitId)?.nom || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {/* Afficher le transporteur libre en priorité, sinon le transporteur officiel, sinon le client */}
                      {row.original.transporteurLibre?.trim() ? 
                        row.original.transporteurLibre.trim() : 
                        transporteurs.find(t => t.id === row.original.transporteurId) ? 
                          `${transporteurs.find(t => t.id === row.original.transporteurId)?.prenom} ${transporteurs.find(t => t.id === row.original.transporteurId)?.nom}` :
                          row.original.nomEntreprise
                      }
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {row.original.net.toFixed(3)} T
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.original.moyenPaiement === 'Direct' ? 'default' : 'secondary'} className="text-xs">
                        {row.original.moyenPaiement}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PeseeDetailDialog
        isOpen={!!selectedPesee}
        onClose={() => setSelectedPesee(null)}
        pesee={selectedPesee}
        products={products}
        transporteurs={transporteurs}
      />
    </div>
  )
}
