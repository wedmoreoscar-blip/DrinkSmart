import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { Home, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ResultsTab = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Placeholder Content */}
      <Card className="p-12 text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-primary" />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Calculations Coming Soon</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            This is where your personalized alcohol metabolism calculations, timeline predictions, 
            and drinking pace recommendations will appear based on your body metrics and drink selections.
          </p>
        </div>

        <div className="pt-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4 text-left">
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">Blood Alcohol Content</h3>
              <p className="text-sm text-muted-foreground">Estimated BAC over time</p>
            </Card>
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">Drinking Pace</h3>
              <p className="text-sm text-muted-foreground">Recommended timing between drinks</p>
            </Card>
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-2">Safety Timeline</h3>
              <p className="text-sm text-muted-foreground">When you'll be safe to drive</p>
            </Card>
          </div>
        </div>
      </Card>

      {/* Current State Summary */}
      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold mb-4">Current Configuration</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">User Metrics:</span>
            <span className="ml-2 font-medium">
              {state.userMetrics.metricType === "bmi" 
                ? `${state.userMetrics.weight} ${state.userMetrics.weightUnit}` 
                : `${state.userMetrics.bodyFat}% body fat`}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Drinks Added:</span>
            <span className="ml-2 font-medium">{state.drinks.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Inebriation Level:</span>
            <span className="ml-2 font-medium">{state.inebriationLevel}/10</span>
          </div>
          <div>
            <span className="text-muted-foreground">Time Elapsed:</span>
            <span className="ml-2 font-medium">
              {Math.floor(state.startTime / 60)} minutes
            </span>
          </div>
        </div>
      </Card>

      {/* Safety Disclaimer */}
      <Card className="p-6 bg-accent/10 border-accent/30">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-accent-foreground">
              Important Safety Reminders
            </p>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>These calculations are estimates and may vary based on individual factors</li>
              <li>Always err on the side of caution and drink less than recommended</li>
              <li>Never drink and drive - arrange alternative transportation</li>
              <li>Stay hydrated and eat food while drinking</li>
              <li>Know your personal limits and stop if you feel unwell</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center">
        <Button onClick={() => navigate("/")}>
          <Home className="w-4 h-4 mr-2" />
          Return to Welcome
        </Button>
      </div>
    </div>
  );
};

export default ResultsTab;
