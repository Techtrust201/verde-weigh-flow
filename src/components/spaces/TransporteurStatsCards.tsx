import { Truck, FileCheck, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Transporteur } from "@/lib/database";

interface TransporteurStatsCardsProps {
  transporteurs: Transporteur[];
  onStatClick: (filterType: string) => void;
}

export default function TransporteurStatsCards({
  transporteurs,
  onStatClick,
}: TransporteurStatsCardsProps) {
  const totalTransporteurs = transporteurs.length;
  const transporteursWithSiret = transporteurs.filter((t) => t.siret && t.siret.trim() !== "").length;
  const transporteursWithEmail = transporteurs.filter((t) => t.email && t.email.trim() !== "").length;
  const transporteursWithPhone = transporteurs.filter((t) => t.telephone && t.telephone.trim() !== "").length;

  const stats = [
    {
      title: "Total Transporteurs",
      value: totalTransporteurs,
      icon: Truck,
      trend: null,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      filterType: "all",
    },
    {
      title: "Avec SIRET",
      value: transporteursWithSiret,
      icon: FileCheck,
      trend: null,
      color: "text-green-600",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
      filterType: "withSiret",
    },
    {
      title: "Avec Email",
      value: transporteursWithEmail,
      icon: Mail,
      trend: null,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      hoverColor: "hover:bg-purple-100",
      filterType: "withEmail",
    },
    {
      title: "Avec Téléphone",
      value: transporteursWithPhone,
      icon: Phone,
      trend: null,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      hoverColor: "hover:bg-amber-100",
      filterType: "withPhone",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            stat.filterType !== "none" ? stat.hoverColor : ""
          }`}
          onClick={() => stat.filterType !== "none" && onStatClick(stat.filterType)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
