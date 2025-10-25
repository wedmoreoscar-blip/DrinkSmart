import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";

const inebriationLevels = [
  { value: 1, label: "Slight Buzz", description: "Relaxed, slightly euphoric" },
  { value: 2, label: "Slight Buzz", description: "Relaxed, slightly euphoric" },
  { value: 3, label: "Tipsy", description: "More talkative, lowered inhibitions" },
  { value: 4, label: "Tipsy", description: "More talkative, lowered inhibitions" },
  { value: 5, label: "Moderately Drunk", description: "Impaired coordination, slurred speech" },
  { value: 6, label: "Moderately Drunk", description: "Impaired coordination, slurred speech" },
  { value: 7, label: "Very Drunk", description: "Significant impairment, poor decision making" },
  { value: 8, label: "Very Drunk", description: "Significant impairment, poor decision making" },
  { value: 9, label: "Heavily Intoxicated", description: "Severe impairment, risk of alcohol poisoning" },
  { value: 10, label: "Heavily Intoxicated", description: "Severe impairment, risk of alcohol poisoning" },
];

const Inebriation = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState([3]);

  const currentLevel = inebriationLevels[level[0] - 1];

  const getColorClass = (value: number) => {
    if (value <= 2) return "text-success";
    if (value <= 4) return "text-primary";
    if (value <= 6) return "text-accent";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Desired Inebriation Level</h1>
          <p className="text-muted-foreground">
            Select your target feeling for responsible planning
          </p>
        </div>

        <Card className="p-8 space-y-8">
          {/* Current Level Display */}
          <div className="text-center space-y-4">
            <div className={`text-6xl font-bold ${getColorClass(level[0])}`}>
              {level[0]}
            </div>
            <div className="space-y-1">
              <h3 className={`text-2xl font-semibold ${getColorClass(level[0])}`}>
                {currentLevel.label}
              </h3>
              <p className="text-muted-foreground">
                {currentLevel.description}
              </p>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-6 pt-4">
            <Slider
              value={level}
              onValueChange={setLevel}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            
            {/* Scale Labels */}
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>1 (Slight)</span>
              <span>5 (Moderate)</span>
              <span>10 (Heavy)</span>
            </div>
          </div>

          {/* Safety Warning */}
          {level[0] >= 7 && (
            <Card className="p-4 bg-destructive/10 border-destructive/30 animate-in fade-in duration-300">
              <p className="text-sm text-center">
                <strong>Warning:</strong> High intoxication levels carry serious health risks. 
                Please reconsider and drink responsibly.
              </p>
            </Card>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/metrics")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate("/drinks")}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Inebriation;
