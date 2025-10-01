-- Migration SQL pour créer la table user_settings dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informations entreprise
  nom_entreprise TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  email TEXT,
  telephone TEXT,
  siret TEXT,
  code_ape TEXT,
  code_naf TEXT,
  logo TEXT, -- Base64 ou URL
  representant_legal TEXT,
  
  -- Paramètres Track Déchet
  track_dechet_token TEXT,
  track_dechet_enabled BOOLEAN DEFAULT false,
  track_dechet_validated BOOLEAN DEFAULT false,
  track_dechet_validated_at TIMESTAMP WITH TIME ZONE,
  track_dechet_sandbox_mode BOOLEAN DEFAULT true,
  numero_recepisse TEXT,
  date_validite_recepisse DATE,
  numero_autorisation TEXT,
  
  -- Paramètres Sage
  cle_api_sage TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- RLS (Row Level Security) pour la sécurité
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Politique : chaque utilisateur ne peut voir que ses propres paramètres
CREATE POLICY "Users can only access their own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at
CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



