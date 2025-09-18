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
            <p className="text-xl text-muted-foreground">Intelligent Horoscope Service</p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <p className="text-lg text-foreground">
            A self-contained horoscope service with an intelligent agent and a sleek dashboard. 
            Deploy it, access the dashboard, and control everything through a beautiful interface 
            or natural language.
          </p>
          <p className="text-muted-foreground">
            One service, total control, zero complexity.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-brain text-primary text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">AI Agent Control</h3>
              <p className="text-sm text-muted-foreground">
                Natural language commands for complete horoscope generation management
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-chart-line text-accent text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Real-time Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Live metrics, queue monitoring, and horoscope generation in one view
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-cog text-chart-3 text-xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Visual Configuration</h3>
              <p className="text-sm text-muted-foreground">
                No-code setup for astronomy data, horoscope generation, and automation
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
            Deploy Amoeba, open the dashboard, and take control of your horoscope service 
            with the perfect blend of visual control and AI assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
