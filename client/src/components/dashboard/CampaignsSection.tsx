import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  subject: string;
  createdAt: string;
  metadata?: any;
}

export default function CampaignsSection() {
  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sequence':
        return 'fas fa-user-plus';
      case 'broadcast':
        return 'fas fa-envelope';
      case 'trigger':
        return 'fas fa-bolt';
      default:
        return 'fas fa-envelope';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-accent';
      case 'paused':
        return 'text-yellow-500';
      case 'completed':
        return 'text-muted-foreground';
      case 'draft':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[...Array(4)].map((_, j) => (
                      <Skeleton key={j} className="h-6 w-16" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];

  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Active Campaigns</h3>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-new-campaign">
            <i className="fas fa-plus mr-2"></i>
            New Campaign
          </Button>
        </div>

        {activeCampaigns.length > 0 ? (
          <div className="space-y-4">
            {activeCampaigns.map((campaign) => (
              <div 
                key={campaign.id} 
                className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                data-testid={`campaign-${campaign.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <i className={`${getTypeIcon(campaign.type)} text-primary`}></i>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{campaign.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className={getStatusColor(campaign.status)}>{campaign.status}</span>
                        {campaign.type === 'broadcast' && ' • Next Run: 5:00 AM'}
                        {campaign.type === 'sequence' && ' • Trigger: New User Signup'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Subject: {campaign.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" data-testid={`button-pause-${campaign.id}`}>
                      Pause
                    </Button>
                    <Button size="sm" className="bg-primary text-primary-foreground" data-testid={`button-edit-${campaign.id}`}>
                      Edit
                    </Button>
                    <Button size="sm" className="bg-accent text-accent-foreground" data-testid={`button-send-${campaign.id}`}>
                      Send Now
                    </Button>
                    <Button size="sm" variant="outline" data-testid={`button-analytics-${campaign.id}`}>
                      Analytics
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted/50 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-envelope text-muted-foreground text-xl"></i>
            </div>
            <h4 className="text-lg font-medium text-foreground mb-2">No Active Campaigns</h4>
            <p className="text-muted-foreground mb-4">
              Create your first email campaign to start engaging with your audience.
            </p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <i className="fas fa-plus mr-2"></i>
              Create Campaign
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
