import { Users, User, Building, FileCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Client } from "@/lib/database";

interface ClientStatsCardsProps {
  clients: Client[];
  onStatClick: (filterType: string) => void;
}

export default function ClientStatsCards({
  clients,
  onStatClick,
}: ClientStatsCardsProps) {
  const totalClients = clients.length;
  const professionalClients = clients.filter(
    (c) => c.typeClient === "professionnel" || c.typeClient === "micro-entreprise"
  ).length;
  const particulierClients = clients.filter(
    (c) => c.typeClient === "particulier"
  ).length;
  const clientsWithSiret = clients.filter((c) => c.siret && c.siret.trim() !== "").length;

  const stats = [
    {
      title: "Total Clients",
      value: totalClients,
      icon: Users,
      trend: null,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      filterType: "all",
    },
    {
      title: "Particuliers",
      value: particulierClients,
      icon: User,
      trend: null,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      filterType: "particuliers",
    },
    {
      title: "Professionnels",
      value: professionalClients,
      icon: Building,
      trend: null,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      hoverColor: "hover:bg-purple-100",
      filterType: "professionals",
    },
    {
      title: "Avec SIRET",
      value: clientsWithSiret,
      icon: FileCheck,
      trend: null,
      color: "text-green-600",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
      filterType: "withSiret",
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
