import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8 text-center">
        
        {/* Logo and Title */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <i className="fas fa-atom text-primary-foreground text-2xl"></i>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Amoeba</h1>
            <p className="text-xl text-muted-foreground">Universal AI Content Generation Platform</p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <p className="text-lg text-foreground">
            Generate and deliver AI content on your terms. Bring your own API keys for any AI service, 
            configure calls with precision, and automate delivery via email or API.
          </p>
          <p className="text-muted-foreground">
            Your infrastructure, your keys, total control.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-key text-primary text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Bring Your Own Keys</h3>
              <p className="text-sm text-muted-foreground">
                Use any AI provider (OpenAI, Anthropic, etc.) with your own API keys
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-sliders-h text-accent text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Configurable Workflows</h3>
              <p className="text-sm text-muted-foreground">
                Fine-tune prompts, token limits, and generation parameters with ease
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-paper-plane text-chart-3 text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Flexible Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Schedule via cron + email or deliver via API with generated keys for curl
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Login Button */}
        <div className="pt-8">
          <Button 
            size="lg" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            <i className="fas fa-sign-in-alt mr-2"></i>
            Access Dashboard
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Deploy Amoeba, configure your AI workflows, and automate content generation 
            with complete control over providers, delivery, and scheduling.
          </p>
        </div>
      </div>
    </div>
  );
}
