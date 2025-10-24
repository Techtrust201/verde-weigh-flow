import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock } from "lucide-react";

interface ExportDatePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
}

export default function ExportDatePicker({
  startDate,
  endDate,
  onDateChange,
}: ExportDatePickerProps) {
  const presets = [
    {
      label: "Aujourd'hui",
      getValue: () => {
        const today = new Date().toISOString().split("T")[0];
        return { start: today, end: today };
      },
    },
    {
      label: "Cette semaine",
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1));
        const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 7));
        return {
          start: firstDay.toISOString().split("T")[0],
          end: lastDay.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "Ce mois",
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          start: firstDay.toISOString().split("T")[0],
          end: lastDay.toISOString().split("T")[0],
        };
      },
    },
    {
      label: "Mois dernier",
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: firstDay.toISOString().split("T")[0],
          end: lastDay.toISOString().split("T")[0],
        };
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Calendar className="h-5 w-5 mr-2" />
          Sélection de la période
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Raccourcis</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  const { start, end } = preset.getValue();
                  onDateChange(start, end);
                }}
                className="w-full"
              >
                <Clock className="h-3 w-3 mr-1" />
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Date de début</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Date de fin</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
