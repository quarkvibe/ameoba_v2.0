import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AgentResponse {
  message: string;
  actions?: Array<{
    type: string;
    parameters: any;
    description: string;
  }>;
  suggestions?: string[];
}

export default function AgentChat() {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      setIsTyping(true);
      const response = await apiRequest("POST", "/api/agent/chat", {
        message: userMessage,
      });
      return await response.json() as AgentResponse;
    },
    onSuccess: (response) => {
      setIsTyping(false);
      setMessage("");
      
      // Show agent response
      toast({
        title: "Agent Response",
        description: response.message,
        duration: 8000,
      });

      // Show suggestions if any
      if (response.suggestions && response.suggestions.length > 0) {
        setTimeout(() => {
          toast({
            title: "Agent Suggestions",
            description: response.suggestions!.join(" • "),
            duration: 10000,
          });
        }, 1000);
      }
    },
    onError: (error) => {
      setIsTyping(false);
      
      if (isUnauthorizedError(error)) {
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

      toast({
        title: "Agent Error",
        description: error.message || "Failed to communicate with agent",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || chatMutation.isPending) return;
    
    chatMutation.mutate(message.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              isTyping ? 'bg-yellow-500' : 'bg-accent'
            }`}></div>
            <span className="text-sm font-medium text-accent">
              {isTyping ? 'Agent Thinking...' : 'Agent'}
            </span>
          </div>
          <Input
            type="text"
            placeholder="Ask me anything or give me a command..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={chatMutation.isPending}
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid="input-agent-chat"
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={!message.trim() || chatMutation.isPending}
            className="p-1 text-muted-foreground hover:text-foreground"
            data-testid="button-send-message"
          >
            {chatMutation.isPending ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-paper-plane"></i>
            )}
          </Button>
        </div>
      </form>

      {/* Quick Command Suggestions */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-all duration-200 z-50">
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-2">Quick Commands:</p>
          <div className="space-y-1">
            {[
              "Show me email metrics for today",
              "Why did delivery rate drop?",
              "Optimize send times for better engagement",
              "Create a new welcome email campaign",
              "Test email configuration",
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setMessage(suggestion)}
                className="block w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                data-testid={`suggestion-${index}`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
