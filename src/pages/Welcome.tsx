import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Activity, Clock, Droplets } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Activity className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            DrinkSmart
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A responsible drinking calculator that helps you understand your ideal alcohol intake based on your body metrics
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card className="p-6 space-y-3 border-2 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Personalized Calculations</h3>
            <p className="text-sm text-muted-foreground">
              Based on your BMI or FFMI for accurate results
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-2 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Timeline Predictions</h3>
            <p className="text-sm text-muted-foreground">
              See when you'll feel effects and when to pace yourself
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-2 hover:border-primary/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Comprehensive Database</h3>
            <p className="text-sm text-muted-foreground">
              Track various drinks and their alcohol content accurately
            </p>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center space-y-6 pt-4">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 h-auto"
            onClick={() => navigate("/metrics")}
          >
            Get Started
          </Button>

          {/* Disclaimer */}
          <Card className="p-4 bg-accent/10 border-accent/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm text-left">
                <p className="font-semibold text-accent-foreground mb-1">
                  Important Disclaimer
                </p>
                <p className="text-muted-foreground">
                  This app is for educational purposes only. Always drink responsibly, know your limits, and never drink and drive. 
                  Consult with healthcare professionals for personalized advice.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
