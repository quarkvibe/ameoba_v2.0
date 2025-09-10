import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";
import SystemStatus from "@/components/dashboard/SystemStatus";
import HourlyChart from "@/components/dashboard/HourlyChart";
import QueueStatus from "@/components/dashboard/QueueStatus";
import CampaignsSection from "@/components/dashboard/CampaignsSection";
import AgentInsights from "@/components/dashboard/AgentInsights";
import FloatingActionMenu from "@/components/dashboard/FloatingActionMenu";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // WebSocket connection for real-time updates
  useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'metrics_update':
          // Handle real-time metrics updates
          console.log('Metrics updated:', message.data);
          break;
        case 'new_activity':
          // Show notification for new activity
          toast({
            title: "New Activity",
            description: message.message,
          });
          break;
        default:
          console.log('Unknown WebSocket message:', message);
      }
    },
    onConnect: () => {
      console.log('Connected to real-time updates');
    },
    onDisconnect: () => {
      console.log('Disconnected from real-time updates');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto animate-pulse">
            <i className="fas fa-atom text-primary-foreground"></i>
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="flex min-h-screen bg-background" data-testid="dashboard-container">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-64">
        
        {/* Top Bar */}
        <TopBar />

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          
          {/* Metrics Grid */}
          <MetricsGrid />

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Activity Feed */}
            <div className="lg:col-span-2">
              <LiveActivityFeed />
            </div>

            {/* System Status */}
            <SystemStatus />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HourlyChart />
            <QueueStatus />
          </div>

          {/* Campaigns Section */}
          <CampaignsSection />

          {/* Agent Insights */}
          <AgentInsights />

        </div>
      </main>

      {/* Floating Action Menu */}
      <FloatingActionMenu />
    </div>
  );
}
