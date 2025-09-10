import { Card, CardContent } from "@/components/ui/card";

// Mock hourly data (would come from backend in production)
const hourlyData = [
  { hour: '9 AM', count: 847, percentage: 45 },
  { hour: '10 AM', count: 1234, percentage: 67 },
  { hour: '11 AM', count: 1567, percentage: 89 },
  { hour: '12 PM', count: 1389, percentage: 78 },
  { hour: '1 PM', count: 982, percentage: 56 },
  { hour: '2 PM', count: 623, percentage: 34 },
  { hour: '3 PM', count: 445, percentage: 23 },
  { hour: '4 PM', count: 789, percentage: 45 },
];

export default function HourlyChart() {
  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Hourly Email Volume</h3>
        
        <div className="flex items-end justify-between h-32 gap-1" data-testid="hourly-chart">
          {hourlyData.map((data, index) => (
            <div
              key={index}
              className="group flex-1 flex flex-col items-center cursor-pointer"
              title={`${data.hour}: ${data.count.toLocaleString()} emails`}
            >
              <div
                className="w-full bg-gradient-to-t from-primary to-accent rounded-t transition-all duration-300 hover:scale-y-110 hover:from-primary/80 hover:to-accent/80"
                style={{ height: `${data.percentage}%` }}
                data-testid={`chart-bar-${index}`}
              ></div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{hourlyData[0].hour}</span>
          <span>{hourlyData[Math.floor(hourlyData.length / 2)].hour}</span>
          <span>{hourlyData[hourlyData.length - 1].hour}</span>
        </div>

        {/* Hover info */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Hover over bars to see detailed volume information</p>
        </div>
      </CardContent>
    </Card>
  );
}
