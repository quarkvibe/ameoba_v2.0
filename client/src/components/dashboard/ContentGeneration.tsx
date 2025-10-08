import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Brain, Clock, Target, Zap, Play, RefreshCw, FileText, Calendar } from "lucide-react";
import type { ContentTemplate, GeneratedContent, ScheduledJob } from "@shared/schema";

export default function ContentGeneration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Get all content templates
  const { data: templates, isLoading: loadingTemplates } = useQuery<ContentTemplate[]>({
    queryKey: ["/api/templates"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get recent generated content
  const { data: recentContent, isLoading: loadingContent } = useQuery<GeneratedContent[]>({
    queryKey: ["/api/generated-content"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Get scheduled jobs
  const { data: scheduledJobs, isLoading: loadingJobs } = useQuery<ScheduledJob[]>({
    queryKey: ["/api/schedule/jobs"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Get queue metrics for generation status
  const { data: queueMetrics, isLoading: loadingQueue } = useQuery<{ pending?: number }>({
    queryKey: ["/api/queue/metrics"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const generateContentMutation = useMutation({
    mutationFn: (templateId: string) => apiRequest("POST", "/api/content/generate", {
      templateId: templateId,
      timestamp: new Date().toISOString()
    }),
    onSuccess: (_, templateId) => {
      const template = templates?.find((t: ContentTemplate) => t.id === templateId);
      toast({
        title: "Generation Started",
        description: `Content generation triggered for "${template?.name}".`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/generated-content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/metrics"] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/content/generate-all", {
      timestamp: new Date().toISOString()
    }),
    onSuccess: () => {
      toast({
        title: "Batch Generation Started",
        description: "Content generation triggered for all active templates.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/generated-content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/metrics"] });
    },
    onError: (error) => {
      toast({
        title: "Batch Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runJobMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest("POST", `/api/schedule/jobs/${jobId}/run`),
    onSuccess: (_, jobId) => {
      const job = scheduledJobs?.find((j: ScheduledJob) => j.id === jobId);
      toast({
        title: "Job Triggered",
        description: `Scheduled job "${job?.name}" has been triggered manually.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/metrics"] });
    },
    onError: (error) => {
      toast({
        title: "Job Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTemplateStatus = (template: ContentTemplate) => {
    if (!template.isActive) return 'inactive';
    const lastUsed = template.lastUsed;
    if (!lastUsed) return 'pending';
    
    const lastUsedDate = new Date(lastUsed);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return lastUsedDate > twentyFourHoursAgo ? 'recent' : 'stale';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recent': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'stale': return 'bg-orange-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'recent': return 'Generated Recently';
      case 'pending': return 'Needs Generation';
      case 'stale': return 'Needs Refresh';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  const activeTemplates = templates?.filter((t: ContentTemplate) => t.isActive) || [];
  const totalTemplates = activeTemplates.length;
  const recentGenerations = activeTemplates.filter((t: ContentTemplate) => getTemplateStatus(t) === 'recent').length;
  const completionPercentage = totalTemplates > 0 ? Math.round((recentGenerations / totalTemplates) * 100) : 0;

  if (loadingTemplates || loadingContent || loadingJobs || loadingQueue) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Generation Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Universal Content Generation
            </CardTitle>
            <Badge variant={recentGenerations === totalTemplates ? "default" : "secondary"}>
              {recentGenerations}/{totalTemplates} Up to Date
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          
          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary" data-testid="text-completion-percentage">
                {completionPercentage}%
              </div>
              <div className="text-sm text-muted-foreground">Fresh Content</div>
            </div>
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-500" data-testid="text-recent-generations">
                {recentGenerations}
              </div>
              <div className="text-sm text-muted-foreground">Recent Generations</div>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold text-yellow-500" data-testid="text-pending-templates">
                {totalTemplates - recentGenerations}
              </div>
              <div className="text-sm text-muted-foreground">Need Updates</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground" data-testid="text-queue-depth">
                {queueMetrics?.pending || 0}
              </div>
              <div className="text-sm text-muted-foreground">In Queue</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Content Freshness</span>
              <span>{recentGenerations}/{totalTemplates}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => generateAllMutation.mutate()}
              disabled={generateAllMutation.isPending || totalTemplates === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-generate-all"
            >
              <Zap className="h-4 w-4 mr-2" />
              {generateAllMutation.isPending ? "Generating..." : "Generate All Content"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
                queryClient.invalidateQueries({ queryKey: ["/api/generated-content"] });
                queryClient.invalidateQueries({ queryKey: ["/api/schedule/jobs"] });
                queryClient.invalidateQueries({ queryKey: ["/api/queue/metrics"] });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalTemplates === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active content templates found.</p>
              <p className="text-sm">Create templates in the Content Configuration section.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTemplates.map((template: ContentTemplate) => {
                const status = getTemplateStatus(template);
                const isGenerating = generateContentMutation.isPending && selectedTemplate === template.id;
                
                return (
                  <div
                    key={template.id}
                    className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      status === 'recent' 
                        ? 'bg-green-500/10 border-green-500' 
                        : status === 'stale'
                        ? 'bg-orange-500/10 border-orange-500'
                        : 'bg-muted/50 border-muted hover:border-muted-foreground'
                    }`}
                    data-testid={`template-${template.id}`}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.category || 'Uncategorized'}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {template.description}
                          </div>
                        )}
                      </div>
                      
                      <Badge 
                        variant={status === 'recent' ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {getStatusText(status)}
                      </Badge>
                      
                      {template.lastUsed && (
                        <div className="text-xs text-muted-foreground">
                          Last: {new Date(template.lastUsed).toLocaleDateString()}
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          generateContentMutation.mutate(template.id);
                        }}
                        disabled={isGenerating}
                        className="w-full text-xs"
                        data-testid={`button-generate-${template.id}`}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {isGenerating ? "Generating..." : "Generate Now"}
                      </Button>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Jobs */}
      {scheduledJobs && scheduledJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Content Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledJobs.map((job: ScheduledJob) => {
                const isRunning = runJobMutation.isPending;
                const template = templates?.find((t: ContentTemplate) => t.id === job.templateId);
                
                return (
                  <div
                    key={job.id}
                    className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      job.isActive 
                        ? 'bg-blue-500/10 border-blue-500' 
                        : 'bg-muted/50 border-muted'
                    }`}
                    data-testid={`job-${job.id}`}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium text-sm">{job.name}</div>
                        <div className="text-xs text-muted-foreground">{template?.name || 'Unknown Template'}</div>
                        <div className="text-xs text-muted-foreground">Schedule: {job.cronExpression}</div>
                      </div>
                      
                      <Badge 
                        variant={job.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {job.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      
                      {job.lastRun && (
                        <div className="text-xs text-muted-foreground">
                          Last: {new Date(job.lastRun).toLocaleDateString()}
                          {job.lastStatus && (
                            <span className={`ml-2 ${job.lastStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                              ({job.lastStatus})
                            </span>
                          )}
                        </div>
                      )}
                      
                      {job.nextRun && (
                        <div className="text-xs text-muted-foreground">
                          Next: {new Date(job.nextRun).toLocaleDateString()}
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runJobMutation.mutate(job.id)}
                        disabled={isRunning || !job.isActive}
                        className="w-full text-xs"
                        data-testid={`button-run-${job.id}`}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {isRunning ? "Running..." : "Run Now"}
                      </Button>
                    </div>
                    
                    {/* Active Indicator */}
                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                      job.isActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Generated Content */}
      {recentContent && recentContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recent Generated Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentContent.slice(0, 5).map((content: GeneratedContent) => {
                const template = templates?.find((t: ContentTemplate) => t.id === content.templateId);
                
                return (
                  <div
                    key={content.id}
                    className="p-3 bg-muted/50 rounded-lg border"
                    data-testid={`content-${content.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-sm">{template?.name || 'Unknown Template'}</div>
                        <div className="text-xs text-muted-foreground">
                          Generated: {content.generatedAt ? new Date(content.generatedAt).toLocaleString() : 'Unknown'}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {template?.category || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {content.content.substring(0, 150)}...
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}