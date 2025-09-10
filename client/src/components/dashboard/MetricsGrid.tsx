import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardMetrics {
  emailsToday: number;
  deliveryRate: string;
  activeUsers: number;
  queueDepth: number;
}

export default function MetricsGrid() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card border border-border">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Emails Today",
      value: metrics?.emailsToday?.toLocaleString() || "0",
      change: "+12.5%",
      changeType: "increase",
      icon: "fas fa-envelope",
      color: "primary",
    },
    {
      title: "Delivery Rate",
      value: metrics?.deliveryRate || "0%",
      change: "Excellent",
      changeType: "success",
      icon: "fas fa-chart-line",
      color: "accent",
    },
    {
      title: "Active Users",
      value: metrics?.activeUsers?.toLocaleString() || "0",
      change: "Peak hours",
      changeType: "warning",
      icon: "fas fa-users",
      color: "yellow-500",
    },
    {
      title: "Queue Depth",
      value: metrics?.queueDepth?.toLocaleString() || "0",
      change: "~3.5 min",
      changeType: "info",
      icon: "fas fa-clock",
      color: "primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((card, index) => (
        <Card 
          key={index} 
          className="bg-card border border-border hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold text-foreground" data-testid={`metric-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {card.value}
                </p>
                <p className={`text-xs flex items-center gap-1 mt-1 ${
                  card.changeType === 'increase' ? 'text-accent' :
                  card.changeType === 'success' ? 'text-accent' :
                  card.changeType === 'warning' ? 'text-yellow-500' :
                  'text-primary'
                }`}>
                  <i className={`fas ${
                    card.changeType === 'increase' ? 'fa-arrow-up' :
                    card.changeType === 'success' ? 'fa-check-circle' :
                    card.changeType === 'warning' ? 'fa-users' :
                    'fa-clock'
                  }`}></i>
                  <span>{card.change}</span>
                </p>
              </div>
              <div className={`w-12 h-12 bg-${card.color}/10 rounded-lg flex items-center justify-center`}>
                <i className={`${card.icon} text-${card.color}`}></i>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
