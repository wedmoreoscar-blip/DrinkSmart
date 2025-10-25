import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight } from "lucide-react";

const buzzDescriptions = [
  { level: 1, label: "Slightly Buzzed", desc: "Feeling warm and relaxed" },
  { level: 2, label: "Light Buzz", desc: "A bit more talkative and comfortable" },
  { level: 3, label: "Tipsy", desc: "Giggly and carefree, inhibitions lowering" },
  { level: 4, label: "Moderately Drunk", desc: "Feeling confident and social" },
  { level: 5, label: "Properly Drunk", desc: "Everything's funny, balance getting wobbly" },
  { level: 6, label: "Very Drunk", desc: "Dancing feels amazing, judgment's out the window" },
  { level: 7, label: "Heavily Drunk", desc: "Slurring words, coordination struggling" },
  { level: 8, label: "Wasted", desc: "Room's spinning, memories getting blurry" },
  { level: 9, label: "Blackout Territory", desc: "High risk of memory loss and poor decisions" },
  { level: 10, label: "Danger Zone", desc: "Serious impairment, health risks present" },
];

const InebriationLevelTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateInebriationLevel } = useAppContext();
  const [localLevel, setLocalLevel] = useState(state.inebriationLevel);
  
  const currentDescription = buzzDescriptions[localLevel - 1];
  
  const handleSliderChange = (value: number[]) => {
    setLocalLevel(value[0]);
    updateInebriationLevel(value[0]);
  };

  // Calculate gradient color based on level
  const getSliderGradient = () => {
    if (localLevel <= 3) return "from-green-500 to-yellow-500";
    if (localLevel <= 6) return "from-yellow-500 to-orange-500";
    return "from-orange-500 to-red-500";
  };

  const getTextColor = () => {
    if (localLevel <= 3) return "text-green-600 dark:text-green-400";
    if (localLevel <= 6) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">How Drunk?</h2>
        <p className="text-muted-foreground">
          Slide to choose your target buzz level
        </p>
      </div>

      <Card className="p-8 md:p-12 space-y-10">
        {/* Large Number Display */}
        <div className="text-center space-y-4">
          <div className={`text-8xl md:text-9xl font-bold font-mono transition-colors duration-300 ${getTextColor()}`}>
            {localLevel}
          </div>
          <div className="space-y-2">
            <h3 className={`text-2xl md:text-3xl font-semibold transition-colors duration-300 ${getTextColor()}`}>
              {currentDescription.label}
            </h3>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              {currentDescription.desc}
            </p>
          </div>
        </div>

        {/* Interactive Slider */}
        <div className="space-y-6 px-4">
          <div className="relative">
            <div className={`absolute inset-0 h-3 rounded-full bg-gradient-to-r ${getSliderGradient()} opacity-20 blur-sm`}></div>
            <Slider
              value={[localLevel]}
              onValueChange={handleSliderChange}
              min={1}
              max={10}
              step={1}
              className="relative"
            />
          </div>
          
          {/* Scale Labels */}
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>
            <span>8</span>
            <span>9</span>
            <span>10</span>
          </div>
        </div>

        {/* Responsible Drinking Note */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground italic">
            Remember: Know your limits, stay safe, and never drink and drive
          </p>
        </div>
      </Card>

      {/* Next Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>
          Next: Add Your Drinks
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default InebriationLevelTab;
