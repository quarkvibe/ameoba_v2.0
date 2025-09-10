import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentSuggestions {
  suggestions: string[];
}

export default function AgentInsights() {
  const { data: suggestions, isLoading } = useQuery<AgentSuggestions>({
    queryKey: ["/api/agent/suggestions"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Mock learning data (would come from AI agent analysis in production)
  const learningItems = [
    {
      insight: "Users engage most at 7-9 AM local time",
      detail: "Based on 30-day analysis",
    },
    {
      insight: "Tuesdays have 23% higher open rates",
      detail: "Compared to other weekdays",
    },
    {
      insight: "Subject lines with emojis: +12% opens",
      detail: "A/B tested over 50k emails",
    },
  ];

  const optimizationSuggestions = suggestions?.suggestions || [
    "Consider weekly digest for low-engagement users",
    "Test shorter subject lines for mobile users",
    "Add social proof to templates",
  ];

  if (isLoading) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-3" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <Skeleton className="w-2 h-2 rounded-full mt-2" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <i className="fas fa-brain text-primary"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground">Agent Insights</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Learning Summary */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Recent Learning</h4>
            <div className="space-y-3">
              {learningItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3" data-testid={`learning-${index}`}>
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 animate-pulse"></div>
                  <div>
                    <p className="text-sm text-foreground">{item.insight}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Optimization Suggestions</h4>
            <div className="space-y-3">
              {optimizationSuggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex items-start gap-3" data-testid={`suggestion-${index}`}>
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm text-foreground">{suggestion}</p>
                    <p className="text-xs text-muted-foreground">
                      {index === 0 && "Could reduce unsubscribes by 15%"}
                      {index === 1 && "Mobile open rates could improve"}
                      {index === 2 && "Testimonials increase CTR by 8%"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-border">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-apply-suggestions">
            <i className="fas fa-magic mr-2"></i>
            Apply All Suggestions
          </Button>
          <Button variant="secondary" data-testid="button-generate-report">
            <i className="fas fa-chart-line mr-2"></i>
            Generate Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
