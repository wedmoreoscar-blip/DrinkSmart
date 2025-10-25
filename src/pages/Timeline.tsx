import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Play, Pause, RotateCcw } from "lucide-react";

const Timeline = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [customStart, setCustomStart] = useState({ hours: "0", minutes: "0", seconds: "0" });
  const [useCustomStart, setUseCustomStart] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCustomStart = () => {
    const totalSeconds = 
      parseInt(customStart.hours || "0") * 3600 +
      parseInt(customStart.minutes || "0") * 60 +
      parseInt(customStart.seconds || "0");
    setSeconds(totalSeconds);
    setUseCustomStart(false);
  };

  const reset = () => {
    setSeconds(0);
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-6 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Drinking Timeline</h1>
          <p className="text-muted-foreground">
            Track when you start drinking for accurate predictions
          </p>
        </div>

        <Card className="p-8 space-y-8">
          {/* Stopwatch Display */}
          <div className="text-center space-y-4">
            <div className="text-7xl font-bold font-mono text-primary">
              {formatTime(seconds)}
            </div>
            <p className="text-muted-foreground">Time elapsed since starting</p>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant={isRunning ? "outline" : "default"}
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={reset}>
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          </div>

          {/* Custom Start Time */}
          <div className="pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Already been drinking?</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseCustomStart(!useCustomStart)}
              >
                Set Custom Start
              </Button>
            </div>

            {useCustomStart && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={customStart.hours}
                      onChange={(e) => setCustomStart({ ...customStart, hours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={customStart.minutes}
                      onChange={(e) => setCustomStart({ ...customStart, minutes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Seconds</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={customStart.seconds}
                      onChange={(e) => setCustomStart({ ...customStart, seconds: e.target.value })}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleCustomStart}>
                  Apply Start Time
                </Button>
              </div>
            )}
          </div>

          {/* Timeline Preview */}
          <Card className="p-6 bg-muted/50 space-y-4">
            <h3 className="font-semibold text-center">Predicted Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                <span className="text-muted-foreground">Peak Effects</span>
                <span className="font-semibold">~45-60 min</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                <span className="text-muted-foreground">Next Drink Recommended</span>
                <span className="font-semibold">~90 min</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-background rounded-lg">
                <span className="text-muted-foreground">Effects Diminishing</span>
                <span className="font-semibold">~2-3 hours</span>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground pt-2">
              * Predictions will be calculated based on your inputs
            </p>
          </Card>
        </Card>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/drinks")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate("/results")}
          >
            See Results
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
