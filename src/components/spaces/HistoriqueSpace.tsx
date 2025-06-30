
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar } from 'lucide-react';
import { db, Pesee } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

export default function HistoriqueSpace() {
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const { toast } = useToast();

  useEffect(() => {
    // Set default to last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    setDateDebut(lastMonth.toISOString().split('T')[0]);
    setDateFin(now.toISOString().split('T')[0]);
    
    loadPesees();
  }, []);

  useEffect(() => {
    loadPesees();
  }, [dateDebut, dateFin]);

  const loadPesees = async () => {
    try {
      let query = db.pesees.orderBy('dateHeure').reverse();
      
      if (dateDebut && dateFin) {
        const startDate = new Date(dateDebut);
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);
        
        query = query.filter(pesee => 
          pesee.dateHeure >= startDate && pesee.dateHeure <= endDate
        );
      }
      
      const results = await query.toArray();
      setPesees(results);
    } catch (error) {
      console.error('Error loading pesees:', error);
    }
  };

  const exportToCSV = async () => {
    try {
      const headers = [
        'Date',
        'Heure',
        'Plaque',
        'Produit',
        'Code Produit',
        'Net (T)',
        'Entreprise',
        'SIRET',
        'Adresse',
        'Chantier',
        'Prix HT',
        'Prix TTC',
        'Numéro Bon'
      ];

      const csvContent = [
        headers.join(','),
        ...pesees.map(pesee => [
          pesee.dateHeure.toLocaleDateString(),
          pesee.dateHeure.toLocaleTimeString(),
          pesee.plaque,
          '', // Produit name - would need to join with products table
          '', // Code produit - would need to join with products table
          pesee.net.toString(),
          pesee.nomEntreprise,
          '', // SIRET - would need to join with clients table
          '', // Adresse - would need to join with clients table
          pesee.chantier,
          pesee.prixHT?.toString() || '',
          pesee.prixTTC?.toString() || '',
          pesee.numeroBon
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `export_pesees_${dateDebut}_${dateFin}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export réussi",
        description: "Les données ont été exportées en CSV."
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données.",
        variant: "destructive"
      });
    }
  };

  const totalPages = Math.ceil(pesees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPesees = pesees.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Historique</h1>
        <div className="flex space-x-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Filtres par date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateFin">Date de fin</Label>
              <Input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {pesees.length} pesée(s) trouvée(s)
          </div>
        </CardContent>
      </Card>

      {/* Pesees List */}
      <div className="space-y-4">
        {currentPesees.map((pesee) => (
          <Card key={pesee.id}>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="font-semibold">{pesee.numeroBon}</div>
                  <div className="text-sm text-gray-600">
                    {pesee.dateHeure.toLocaleDateString()} à {pesee.dateHeure.toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div className="font-medium">{pesee.nomEntreprise}</div>
                  <div className="text-sm text-gray-600">Plaque: {pesee.plaque}</div>
                  <div className="text-sm text-gray-600">Chantier: {pesee.chantier}</div>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">
                    {pesee.net} T
                  </Badge>
                  <div className="text-sm text-gray-600">
                    {pesee.moyenPaiement}
                  </div>
                </div>
                <div className="text-right">
                  {pesee.prixHT && (
                    <div className="font-medium text-green-600">
                      {pesee.prixHT.toFixed(2)}€ HT
                    </div>
                  )}
                  {pesee.prixTTC && (
                    <div className="font-medium text-green-600">
                      {pesee.prixTTC.toFixed(2)}€ TTC
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} sur {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
