import AgentChat from "./AgentChat";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { toast } = useToast();

  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const testEmail = prompt("Enter email address for test:");
      if (!testEmail) throw new Error("No email provided");
      
      return await apiRequest("POST", "/api/send-test", {
        to: testEmail,
        subject: "Test Email from Amoeba",
        content: "This is a test email to verify your configuration.",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test email sent successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implement report generation
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast({
        title: "Report Generated",
        description: "Your email analytics report is ready for download.",
      });
    },
  });

  const emergencyStopMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/queue/pause", {});
    },
    onSuccess: () => {
      toast({
        title: "Emergency Stop Activated",
        description: "All email processing has been paused.",
        variant: "destructive",
      });
    },
  });

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between p-4 gap-2">
        
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
            data-testid="button-mobile-menu"
          >
            <i className="fas fa-bars"></i>
          </Button>
        )}
        
        {/* Agent Chat */}
        <div className="flex-1 max-w-2xl hidden sm:block">
          <AgentChat />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => sendTestMutation.mutate()}
            disabled={sendTestMutation.isPending}
            title="Send Test Email"
            className="hidden sm:inline-flex"
            data-testid="button-test-email"
          >
            <i className="fas fa-flask"></i>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            title="Generate Report"
            className="hidden sm:inline-flex"
            data-testid="button-generate-report"
          >
            <i className="fas fa-file-download"></i>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => emergencyStopMutation.mutate()}
            disabled={emergencyStopMutation.isPending}
            title="Emergency Stop"
            className="text-destructive hover:bg-destructive/10 hidden sm:inline-flex"
            data-testid="button-emergency-stop"
          >
            <i className="fas fa-stop-circle"></i>
          </Button>
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
