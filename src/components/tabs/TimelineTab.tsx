import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Clock, Check } from "lucide-react";

const TimelineTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateStartTime } = useAppContext();
  const [showTimeSelection, setShowTimeSelection] = useState(!state.startDateTime);
  const [startOption, setStartOption] = useState<"now" | "earlier">("now");
  const [selectedHour, setSelectedHour] = useState("12");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">("PM");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTimeline = () => {
    if (startOption === "now") {
      updateStartTime(new Date());
    } else {
      const now = new Date();
      const hour = selectedPeriod === "PM" && selectedHour !== "12" 
        ? parseInt(selectedHour) + 12 
        : selectedPeriod === "AM" && selectedHour === "12" 
        ? 0 
        : parseInt(selectedHour);
      
      const startTime = new Date(now);
      startTime.setHours(hour, parseInt(selectedMinute), 0, 0);
      
      // If the time is in the future, assume it was yesterday
      if (startTime > now) {
        startTime.setDate(startTime.getDate() - 1);
      }
      
      updateStartTime(startTime);
    }
    setShowTimeSelection(false);
  };

  // Calculate timeline stages
  const getTimelineStages = () => {
    if (!state.startDateTime) return [];
    
    const start = new Date(state.startDateTime);
    const stages = [
      { 
        name: "Start", 
        time: start, 
        description: "First drink consumed",
        offsetMinutes: 0
      },
      { 
        name: "Peak Buzz", 
        time: new Date(start.getTime() + 45 * 60000), 
        description: "Maximum effects reached",
        offsetMinutes: 45
      },
      { 
        name: "Sobering Up", 
        time: new Date(start.getTime() + 120 * 60000), 
        description: "Effects diminishing",
        offsetMinutes: 120
      },
      { 
        name: "Recovery", 
        time: new Date(start.getTime() + 180 * 60000), 
        description: "Significant recovery",
        offsetMinutes: 180
      },
      { 
        name: "Sober", 
        time: new Date(start.getTime() + 300 * 60000), 
        description: "Back to baseline",
        offsetMinutes: 300
      },
    ];
    
    return stages;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getElapsedTime = () => {
    if (!state.startDateTime) return "0h 0m";
    const elapsed = currentTime.getTime() - new Date(state.startDateTime).getTime();
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const getCurrentStageIndex = () => {
    if (!state.startDateTime) return -1;
    const elapsed = currentTime.getTime() - new Date(state.startDateTime).getTime();
    const minutes = elapsed / 60000;
    
    if (minutes < 45) return 0;
    if (minutes < 120) return 1;
    if (minutes < 180) return 2;
    if (minutes < 300) return 3;
    return 4;
  };

  const getIndicatorPosition = () => {
    if (!state.startDateTime) return 0;
    const stages = getTimelineStages();
    const currentIndex = getCurrentStageIndex();
    
    if (currentIndex >= stages.length - 1) return 100;
    if (currentIndex < 0) return 0;
    
    const currentStage = stages[currentIndex];
    const nextStage = stages[currentIndex + 1];
    const elapsed = currentTime.getTime() - new Date(state.startDateTime).getTime();
    const currentMinutes = elapsed / 60000;
    
    const stageProgress = (currentMinutes - currentStage.offsetMinutes) / 
                         (nextStage.offsetMinutes - currentStage.offsetMinutes);
    
    const basePosition = (currentIndex / (stages.length - 1)) * 100;
    const stageSize = (1 / (stages.length - 1)) * 100;
    
    return basePosition + (stageProgress * stageSize);
  };

  if (showTimeSelection) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">When did you start drinking?</h2>
          <p className="text-muted-foreground">
            This helps us track your journey accurately
          </p>
        </div>

        <Card className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-lg">Start Time</Label>
            <Select value={startOption} onValueChange={(val) => setStartOption(val as "now" | "earlier")}>
              <SelectTrigger className="text-lg h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="now">Right Now</SelectItem>
                <SelectItem value="earlier">Earlier (Select Time)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {startOption === "earlier" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <Label className="text-base">Select the time you started</Label>
              <div className="flex gap-3 items-center justify-center">
                <Select value={selectedHour} onValueChange={setSelectedHour}>
                  <SelectTrigger className="w-24 h-14 text-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i + 1;
                      return (
                        <SelectItem key={hour} value={hour.toString().padStart(2, "0")}>
                          {hour.toString().padStart(2, "0")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                <span className="text-3xl font-bold">:</span>
                
                <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                  <SelectTrigger className="w-24 h-14 text-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i} value={i.toString().padStart(2, "0")}>
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedPeriod} onValueChange={(val) => setSelectedPeriod(val as "AM" | "PM")}>
                  <SelectTrigger className="w-24 h-14 text-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleCreateTimeline}
          >
            <Clock className="w-5 h-5 mr-2" />
            Create Timeline
          </Button>
        </Card>
      </div>
    );
  }

  const stages = getTimelineStages();
  const currentStageIndex = getCurrentStageIndex();
  const indicatorPosition = getIndicatorPosition();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Elapsed Time Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl font-bold text-primary font-mono">
          {getElapsedTime()}
        </div>
        <p className="text-muted-foreground">since you started drinking</p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowTimeSelection(true)}
          className="text-xs"
        >
          Change start time
        </Button>
      </div>

      {/* Dynamic Timeline */}
      <Card className="p-6 min-h-[600px] relative">
        <div className="relative h-[550px]">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-muted"></div>
          
          {/* Moving Indicator */}
          <div 
            className="absolute left-6 w-5 h-5 rounded-full bg-primary animate-pulse transition-all duration-1000 ease-linear z-20"
            style={{ top: `${indicatorPosition}%`, transform: 'translateY(-50%)' }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping"></div>
          </div>

          {/* Timeline Stages */}
          <div className="relative space-y-0 h-full flex flex-col justify-between">
            {stages.map((stage, index) => {
              const isPast = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isFuture = index > currentStageIndex;

              return (
                <div key={stage.name} className="relative flex items-center gap-6 py-2">
                  {/* Stage Node */}
                  <div 
                    className={`relative z-10 w-6 h-6 rounded-full border-4 transition-all duration-300 ${
                      isPast 
                        ? 'bg-muted border-muted' 
                        : isCurrent 
                        ? 'bg-primary border-primary scale-125' 
                        : 'bg-background border-primary'
                    }`}
                  >
                    {isPast && (
                      <Check className="w-3 h-3 text-muted-foreground absolute inset-0 m-auto" />
                    )}
                  </div>

                  {/* Stage Content */}
                  <div 
                    className={`flex-1 transition-all duration-300 ${
                      isPast ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 
                          className={`font-semibold transition-all ${
                            isCurrent ? 'text-xl text-primary' : 'text-lg'
                          }`}
                        >
                          {stage.name}
                        </h3>
                        <p 
                          className={`text-sm text-muted-foreground ${
                            isCurrent ? 'font-medium' : ''
                          }`}
                        >
                          {stage.description}
                        </p>
                      </div>
                      <span 
                        className={`text-sm font-mono ${
                          isCurrent ? 'text-primary font-bold' : 'text-muted-foreground'
                        }`}
                      >
                        {formatTime(stage.time)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4 pt-4 border-t">
          Timeline updates automatically based on your start time
        </p>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>
          View Results
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default TimelineTab;
