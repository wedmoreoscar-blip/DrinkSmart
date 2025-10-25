import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Play, Pause, RotateCcw } from "lucide-react";

const TimelineTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateTimeline } = useAppContext();
  const [isRunning, setIsRunning] = useState(state.isTimerRunning);
  const [seconds, setSeconds] = useState(state.startTime);
  const [customStart, setCustomStart] = useState({ hours: "0", minutes: "0", seconds: "0" });
  const [useCustomStart, setUseCustomStart] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => {
          const newSeconds = s + 1;
          updateTimeline(newSeconds, true);
          return newSeconds;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, updateTimeline]);

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
    updateTimeline(totalSeconds, false);
    setUseCustomStart(false);
  };

  const toggleTimer = () => {
    const newIsRunning = !isRunning;
    setIsRunning(newIsRunning);
    updateTimeline(seconds, newIsRunning);
  };

  const reset = () => {
    setSeconds(0);
    setIsRunning(false);
    updateTimeline(0, false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="p-8 space-y-8">
        {/* Stopwatch Display */}
        <div className="text-center space-y-4">
          <div className="text-6xl md:text-7xl font-bold font-mono text-primary">
            {formatTime(seconds)}
          </div>
          <p className="text-muted-foreground">Time elapsed since starting</p>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            variant={isRunning ? "outline" : "default"}
            onClick={toggleTimer}
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

        {/* Timeline Preview - Trainline Style */}
        <Card className="p-6 bg-muted/50 space-y-6">
          <h3 className="font-semibold text-center text-lg">Drinking Journey Timeline</h3>
          
          <div className="relative space-y-6 pl-8">
            {/* Timeline Line */}
            <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-primary/30"></div>
            
            {/* Timeline Events */}
            <div className="relative">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-background"></div>
              </div>
              <div className="bg-background rounded-lg p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Started Drinking</span>
                  <span className="text-sm text-muted-foreground">{formatTime(0)}</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-primary/50 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-background"></div>
              </div>
              <div className="bg-background rounded-lg p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Peak Effects</span>
                  <span className="text-sm text-muted-foreground">~45-60 min</span>
                </div>
                <p className="text-sm text-muted-foreground">Maximum blood alcohol content reached</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-background"></div>
              </div>
              <div className="bg-background rounded-lg p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Next Drink Window</span>
                  <span className="text-sm text-muted-foreground">~90 min</span>
                </div>
                <p className="text-sm text-muted-foreground">Safe time for next drink if continuing</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 w-6 h-6 rounded-full bg-muted flex items-center justify-center border-2 border-primary/30">
                <div className="w-2 h-2 rounded-full bg-background"></div>
              </div>
              <div className="bg-background rounded-lg p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Sobering Up</span>
                  <span className="text-sm text-muted-foreground">~2-3 hours</span>
                </div>
                <p className="text-sm text-muted-foreground">Effects significantly diminishing</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-center text-muted-foreground pt-2">
            * Timeline predictions based on your inputs - actual calculations on Results tab
          </p>
        </Card>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button onClick={onNext}>
          View Results
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default TimelineTab;
