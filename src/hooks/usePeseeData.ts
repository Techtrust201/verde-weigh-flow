import { useState, useEffect } from "react";
import { db, Pesee, Client, Product } from "@/lib/database";

export const usePeseeData = () => {
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = async () => {
    try {
      const [peseesData, clientsData, productsData] = await Promise.all([
        db.pesees.limit(50).toArray(),
        db.clients.toArray(),
        db.products.toArray(),
      ]);

      // Trier par date décroissante (plus récent en premier)
      peseesData.sort(
        (a, b) =>
          new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime()
      );

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
