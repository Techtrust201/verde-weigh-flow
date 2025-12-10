import { useState, useEffect } from "react";
import { db, Pesee, Client, Product } from "@/lib/database";

export const usePeseeData = () => {
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = async () => {
    try {
      // Charger toutes les pesées d'abord
      const allPesees = await db.pesees.toArray();

      // Trier par date décroissante (plus récent en premier)
      allPesees.sort(
        (a, b) =>
          new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime()
      );

      // Limiter aux 30 plus récentes
      const peseesData = allPesees.slice(0, 30);

      const [clientsData, productsData] = await Promise.all([
        db.clients.toArray(),
        db.products.toArray(),
      ]);

      setPesees(peseesData);
      setClients(clientsData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    pesees,
    clients,
    products,
    loadData,
  };
};
