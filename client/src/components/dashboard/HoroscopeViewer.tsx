import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Sparkles } from "lucide-react";

interface Horoscope {
  id: string;
  zodiacSignId: string;
  date: string;
  content: string;
  technicalDetails?: string;
}

interface GenerationStatus {
  id?: string;
  date: string;
  status: string;
  totalSigns: number;
  completedSigns: number;
  startedAt?: string;
  completedAt?: string;
}

export default function HoroscopeViewer() {
  const { data: horoscopes, isLoading: horoscopesLoading, refetch: refetchHoroscopes } = useQuery<{
    date: string;
    horoscopes: Horoscope[];
  }>({
    queryKey: ["/api/dashboard/horoscopes/today"],
  });

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<GenerationStatus>({
    queryKey: ["/api/dashboard/horoscopes/generation-status"],
    refetchInterval: status?.status === 'processing' ? 2000 : false,
  });

  const handleRefresh = () => {
    refetchHoroscopes();
    refetchStatus();
  };

  const progress = status ? (status.completedSigns / status.totalSigns) * 100 : 0;
  const isGenerating = status?.status === 'processing';

  const zodiacOrder = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];

  const zodiacNames: Record<string, string> = {
    'aries': 'Aries',
    'taurus': 'Taurus',
    'gemini': 'Gemini',
    'cancer': 'Cancer',
    'leo': 'Leo',
    'virgo': 'Virgo',
    'libra': 'Libra',
    'scorpio': 'Scorpio',
    'sagittarius': 'Sagittarius',
    'capricorn': 'Capricorn',
    'aquarius': 'Aquarius',
    'pisces': 'Pisces'
  };

  const zodiacIcons: Record<string, string> = {
    'aries': '♈',
    'taurus': '♉',
    'gemini': '♊',
    'cancer': '♋',
    'leo': '♌',
    'virgo': '♍',
    'libra': '♎',
    'scorpio': '♏',
    'sagittarius': '♐',
    'capricorn': '♑',
    'aquarius': '♒',
    'pisces': '♓'
  };

  const sortedHoroscopes = horoscopes?.horoscopes?.sort((a, b) => {
    return zodiacOrder.indexOf(a.zodiacSignId) - zodiacOrder.indexOf(b.zodiacSignId);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" data-testid="text-title">
            <Sparkles className="text-primary" />
            Daily Horoscopes
          </h2>
          <p className="text-muted-foreground mt-1">
            {horoscopes?.date ? new Date(horoscopes.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : 'Loading...'}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isGenerating}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Generation Status */}
      {status && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Generation Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium" data-testid="text-progress">
                {status.completedSigns}/{status.totalSigns} signs
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className={`px-2 py-1 rounded-full ${
                status.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                status.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                status.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                'bg-gray-500/10 text-gray-500'
              }`} data-testid="text-status">
                {status.status || 'not started'}
              </span>
              {status.completedAt && (
                <span className="text-muted-foreground">
                  Completed {new Date(status.completedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Horoscopes Grid */}
      {horoscopesLoading || statusLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedHoroscopes && sortedHoroscopes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedHoroscopes.map((horoscope) => (
            <Card 
              key={horoscope.id} 
              className="hover:shadow-lg transition-shadow"
              data-testid={`card-horoscope-${horoscope.zodiacSignId}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">{zodiacIcons[horoscope.zodiacSignId]}</span>
                  <span>{zodiacNames[horoscope.zodiacSignId]}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {horoscope.content}
                </p>
                {horoscope.technicalDetails && (
                  <details className="mt-3">
                    <summary className="text-xs text-primary cursor-pointer hover:underline">
                      Technical Details
                    </summary>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {horoscope.technicalDetails}
                    </p>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No horoscopes generated yet for today.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Horoscopes are automatically generated daily at midnight UTC.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
