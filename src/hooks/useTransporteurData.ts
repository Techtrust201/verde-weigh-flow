
import { useState, useEffect } from 'react';
import { db, Transporteur } from '@/lib/database';

export const useTransporteurData = () => {
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);

  const loadTransporteurs = async () => {
    try {
      const data = await db.transporteurs.orderBy('nom').toArray();
      setTransporteurs(data);
    } catch (error) {
      console.error('Error loading transporteurs:', error);
    }
  };

  useEffect(() => {
    loadTransporteurs();
  }, []);

  return {
    transporteurs,
    loadTransporteurs
  };
};
