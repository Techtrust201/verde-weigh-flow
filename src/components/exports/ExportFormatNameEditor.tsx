import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Check, X } from "lucide-react";
import { ExportFormatConfig, db } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";

interface ExportFormatNameEditorProps {
  formatConfig: ExportFormatConfig;
  onUpdate: () => void;
  isDefault?: boolean;
}

export default function ExportFormatNameEditor({
  formatConfig,
  onUpdate,
  isDefault = false,
}: ExportFormatNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(formatConfig.displayName);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom ne peut pas être vide.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (formatConfig.id) {
        await db.exportFormats.update(formatConfig.id, {
          displayName: displayName.trim(),
          updatedAt: new Date(),
        });
      } else {
        await db.exportFormats.add({
          formatId: formatConfig.formatId,
          displayName: displayName.trim(),
          isDefault: isDefault,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      setIsEditing(false);
      onUpdate();

      toast({
        title: "Nom mis à jour",
        description: "Le nom du format a été modifié avec succès.",
      });
    } catch (error) {
      console.error("Error updating format name:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le nom du format.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setDisplayName(formatConfig.displayName);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            } else if (e.key === "Escape") {
              handleCancel();
            }
          }}
          autoFocus
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-1">{formatConfig.displayName}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="h-8 w-8 p-0"
        title="Modifier le nom"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}
