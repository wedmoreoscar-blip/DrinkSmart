import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, Clock, Check } from "lucide-react";

const TimelineTab = ({ onNext }: { onNext: () => void }) => {
  const { state } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate timeline stages
  const getTimelineStages = () => {
    if (!state.drinkingStartTime) return [];
    
    const start = new Date(state.drinkingStartTime);
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
    if (!state.drinkingStartTime) return "0h 0m";
    const elapsed = currentTime.getTime() - new Date(state.drinkingStartTime).getTime();
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const getCurrentStageIndex = () => {
    if (!state.drinkingStartTime) return -1;
    const elapsed = currentTime.getTime() - new Date(state.drinkingStartTime).getTime();
    const minutes = elapsed / 60000;
    
    if (minutes < 45) return 0;
    if (minutes < 120) return 1;
    if (minutes < 180) return 2;
    if (minutes < 300) return 3;
    return 4;
  };

  const getIndicatorPosition = () => {
    if (!state.drinkingStartTime) return 0;
    const stages = getTimelineStages();
    const currentIndex = getCurrentStageIndex();
    
    if (currentIndex >= stages.length - 1) return 100;
    if (currentIndex < 0) return 0;
    
    const currentStage = stages[currentIndex];
    const nextStage = stages[currentIndex + 1];
    const elapsed = currentTime.getTime() - new Date(state.drinkingStartTime).getTime();
    const currentMinutes = elapsed / 60000;
    
    const stageProgress = (currentMinutes - currentStage.offsetMinutes) / 
                         (nextStage.offsetMinutes - currentStage.offsetMinutes);
    
    const basePosition = (currentIndex / (stages.length - 1)) * 100;
    const stageSize = (1 / (stages.length - 1)) * 100;
    
    return basePosition + (stageProgress * stageSize);
  };

  const stages = getTimelineStages();
  
  // Show message if no start time set
  if (!state.drinkingStartTime) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card className="p-8 text-center">
          <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Set Your Start Time First</h2>
          <p className="text-muted-foreground">
            Please go back to the Target Buzz tab and set your drinking start time to view your timeline.
          </p>
        </Card>
      </div>
    );
  }
  
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
