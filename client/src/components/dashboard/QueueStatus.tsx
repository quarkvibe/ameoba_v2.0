import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export default function QueueStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: queueMetrics, isLoading } = useQuery<QueueMetrics>({
    queryKey: ["/api/queue/metrics"],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const pauseMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/queue/pause", {}),
    onSuccess: () => {
      toast({ title: "Queue Paused", description: "Email processing has been paused." });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/metrics"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/queue/resume", {}),
    onSuccess: () => {
      toast({ title: "Queue Resumed", description: "Email processing has been resumed." });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/metrics"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/queue/clear", {}),
    onSuccess: () => {
      toast({ title: "Queue Cleared", description: "All pending jobs have been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/metrics"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/queue/retry-failed", {}),
    onSuccess: () => {
      toast({ title: "Retrying Failed Jobs", description: "Failed jobs have been queued for retry." });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/metrics"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalJobs = queueMetrics?.total || 0;
  const maxJobs = 500; // Configurable max queue size
  
  const queueItems = [
    {
      label: "Email Queue",
      value: queueMetrics?.pending || 0,
      max: maxJobs,
      color: "primary",
    },
    {
      label: "Active Workers",
      value: queueMetrics?.processing || 0,
      max: 15, // Max workers
      color: "accent",
    },
    {
      label: "Processing Rate",
      value: 245, // Mock processing rate
      max: 300,
      color: "chart-3",
      unit: "/min",
    },
  ];

  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Queue Processing</h3>
        
        <div className="space-y-4">
          {queueItems.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">{item.label}</span>
                <span className="text-sm text-muted-foreground" data-testid={`queue-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  {item.value}{item.unit || ''}/{item.max}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`bg-${item.color} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}

          {/* Queue Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
            <div className="text-center">
              <div className="text-accent font-semibold" data-testid="text-completed-jobs">
                {queueMetrics?.completed || 0}
              </div>
              <div className="text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-destructive font-semibold" data-testid="text-failed-jobs">
                {queueMetrics?.failed || 0}
              </div>
              <div className="text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Queue Controls */}
          <div className="grid grid-cols-2 gap-2 pt-4">
            <Button
              size="sm"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-resume-queue"
            >
              <i className="fas fa-play mr-1"></i>
              Resume
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              data-testid="button-pause-queue"
            >
              <i className="fas fa-pause mr-1"></i>
              Pause
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              data-testid="button-retry-failed"
            >
              <i className="fas fa-redo mr-1"></i>
              Retry Failed
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              data-testid="button-clear-queue"
            >
              <i className="fas fa-broom mr-1"></i>
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
