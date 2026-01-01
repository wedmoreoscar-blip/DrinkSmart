import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, RefreshCw, ChevronDown, ChevronUp, Info, Save, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { Alert, AlertDescription } from "@/components/ui/alert";

const UserInfoTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateUserMetrics, recalculate } = useAppContext();
  const { userMetrics } = state;
  const { toast } = useToast();
  const { metricType, heightUnit, weightUnit, heightCm, heightFt, heightIn, weight, bodyFat, age, sex } = userMetrics;
  const [isFFMIHelpOpen, setIsFFMIHelpOpen] = useState(false);
  const [hasLoadedSavedMetrics, setHasLoadedSavedMetrics] = useState(false);
  
  const { isLoggedIn, savedMetrics, saveMetrics, loading } = useUserMetrics();

  // Auto-fill metrics from saved data when user is logged in
  useEffect(() => {
    if (isLoggedIn && savedMetrics && !hasLoadedSavedMetrics && !loading) {
      // Only auto-fill if current metrics are empty
      const hasCurrentMetrics = weight || heightCm || heightFt;
      
      if (!hasCurrentMetrics) {
        updateUserMetrics({
          metricType: savedMetrics.metricType,
          heightUnit: savedMetrics.heightUnit,
          weightUnit: savedMetrics.weightUnit,
          heightCm: savedMetrics.heightCm,
          heightFt: savedMetrics.heightFt,
          heightIn: savedMetrics.heightIn,
          weight: savedMetrics.weight,
          bodyFat: savedMetrics.bodyFat,
          age: savedMetrics.age,
          sex: savedMetrics.sex,
        });
        
        toast({
          title: "Welcome back! 👋",
          description: "Your saved metrics have been loaded.",
          duration: 3000,
        });
      }
      setHasLoadedSavedMetrics(true);
    }
  }, [isLoggedIn, savedMetrics, loading, hasLoadedSavedMetrics, weight, heightCm, heightFt, updateUserMetrics, toast]);

  const handleRecalculate = async () => {
    // Determine if FFM should be used (when both BMI and FFM data is available)
    const hasFFMData = bodyFat && parseFloat(bodyFat) > 0;
    const hasBMIData = weight && age && sex;
    
    // If both are available, automatically switch to FFM as it's more accurate
    if (hasFFMData && hasBMIData && metricType === "bmi") {
      updateUserMetrics({ metricType: "ffmi" });
    }

    recalculate();
    
    // Save metrics if logged in
    if (isLoggedIn) {
      const success = await saveMetrics({
        metricType: hasFFMData && hasBMIData ? "ffmi" : metricType,
        heightUnit,
        weightUnit,
        heightCm,
        heightFt,
        heightIn,
        weight,
        bodyFat,
        age,
        sex,
      });
      
      if (success) {
        toast({
          title: "Metrics Saved! 🎉",
          description: "Your info has been saved to your account. Let's party responsibly!",
          duration: 3000,
        });
      }
    } else {
      toast({
        title: "Metrics Updated! 🎉",
        description: "Your info has been saved for this session. Sign in to save permanently!",
        duration: 3000,
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Main heading */}
      <div>
        <h2 className="text-3xl font-bold mb-2">
          {metricType === "bmi" ? "BMI" : "FFMI"} Calculator
        </h2>
        <p className="text-muted-foreground">
          {metricType === "bmi" 
            ? "Let's get your body metrics to calculate your perfect buzz! 🎉" 
            : "Track your gains and plan your party! 💪🎊"}
        </p>
      </div>

      {/* Login status indicator */}
      {isLoggedIn ? (
        <Alert className="border-green-500/30 bg-green-500/10">
          <AlertDescription className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            <span className="text-green-700">Logged in - your metrics will be saved to your account.</span>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertDescription className="flex items-center gap-2">
            <User className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700">Not logged in - metrics will only be saved for this session.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Toggle between BMI and FFMI */}
      <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="metric-toggle" className="text-lg font-semibold">
              {metricType === "bmi" ? "Using BMI" : "Using FFM"}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              {metricType === "bmi" 
                ? "Standard body mass calculation" 
                : "Advanced fitness calculation (more accurate)"}
            </p>
          </div>
          <Button
            variant={metricType === "ffmi" ? "default" : "outline"}
            size="sm"
            onClick={() => updateUserMetrics({ metricType: metricType === "ffmi" ? "bmi" : "ffmi" })}
            className="transition-all"
          >
            {metricType === "ffmi" ? "Use BMI" : "Use FFM"}
          </Button>
        </div>
      </Card>

      {/* Body Metrics Input */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-xl">
          {metricType === "bmi" ? "📏 Your Information" : "💪 Body Composition"}
        </h3>

        {/* Height Input - shown for both BMI and FFMI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Height</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={heightUnit === "cm" ? "default" : "outline"}
                size="sm"
                onClick={() => updateUserMetrics({ heightUnit: "cm" })}
              >
                cm
              </Button>
              <Button
                type="button"
                variant={heightUnit === "ft" ? "default" : "outline"}
                size="sm"
                onClick={() => updateUserMetrics({ heightUnit: "ft" })}
              >
                ft/in
              </Button>
            </div>
          </div>

          {heightUnit === "cm" ? (
            <Input
              type="number"
              placeholder="e.g., 175"
              value={heightCm}
              onChange={(e) => updateUserMetrics({ heightCm: e.target.value })}
            />
          ) : (
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="ft"
                value={heightFt}
                onChange={(e) => updateUserMetrics({ heightFt: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="in"
                value={heightIn}
                onChange={(e) => updateUserMetrics({ heightIn: e.target.value })}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {/* Weight Input - shown for both BMI and FFMI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Weight</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={weightUnit === "kg" ? "default" : "outline"}
                size="sm"
                onClick={() => updateUserMetrics({ weightUnit: "kg" })}
              >
                kg
              </Button>
              <Button
                type="button"
                variant={weightUnit === "lbs" ? "default" : "outline"}
                size="sm"
                onClick={() => updateUserMetrics({ weightUnit: "lbs" })}
              >
                lbs
              </Button>
            </div>
          </div>
          <Input
            type="number"
            placeholder={weightUnit === "kg" ? "e.g., 70" : "e.g., 154"}
            value={weight}
            onChange={(e) => updateUserMetrics({ weight: e.target.value })}
          />
        </div>

        {/* Body Fat Percentage - only shown for FFMI */}
        {metricType === "ffmi" && (
          <div className="space-y-2">
            <Label>Body Fat Percentage</Label>
            <Input
              type="number"
              placeholder="e.g., 15"
              value={bodyFat}
              onChange={(e) => updateUserMetrics({ bodyFat: e.target.value })}
            />
          </div>
        )}

        {/* Age Input - shown for both BMI and FFMI */}
        <div className="space-y-2">
          <Label>Age</Label>
          <Input
            type="number"
            placeholder="e.g., 25"
            value={age}
            onChange={(e) => updateUserMetrics({ age: e.target.value })}
            min="18"
          />
        </div>

        {/* Sex Selection - shown for both BMI and FFMI */}
        <div className="space-y-2">
          <Label>Sex</Label>
          <Select
            value={sex}
            onValueChange={(value: "male" | "female") => 
              updateUserMetrics({ sex: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your sex" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Helps us calculate accurate results
          </p>
        </div>
      </Card>

      {/* FFMI Help Section - Collapsible */}
      {metricType === "ffmi" && (
        <Collapsible open={isFFMIHelpOpen} onOpenChange={setIsFFMIHelpOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                FFMI Help & Body Fat Reference
              </span>
              {isFFMIHelpOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-accordion-down">
            <Card className="p-6 bg-secondary/10 border-secondary/30 mt-2">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="text-xl">💡</span> What is FFMI?
              </h3>
              <p className="text-sm mb-4 leading-relaxed">
                <strong>FFMI (Fat Free Mass Index)</strong> calculates your muscle mass relative to your height. 
                It's super popular with bodybuilders and fitness enthusiasts to compare physique and track gains. 
                Think of it as BMI's cooler, more athletic cousin! 🏋️
              </p>
              
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Body Fat % Reference Guide</h4>
                
                {/* Women's Table */}
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-2 text-secondary">For Women 👩</p>
                  <div className="bg-card rounded-lg overflow-hidden border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-semibold">Classification</th>
                          <th className="text-left p-2 font-semibold">Body Fat %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="p-2">Essential Fat</td><td className="p-2 font-mono">10-13%</td></tr>
                        <tr className="bg-muted/30"><td className="p-2">Athletes</td><td className="p-2 font-mono">18-20%</td></tr>
                        <tr><td className="p-2">Fitness</td><td className="p-2 font-mono">21-24%</td></tr>
                        <tr className="bg-muted/30"><td className="p-2">Average</td><td className="p-2 font-mono">25-31%</td></tr>
                        <tr><td className="p-2">Obese</td><td className="p-2 font-mono">32%+</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Men's Table */}
                <div>
                  <p className="text-sm font-semibold mb-2 text-primary">For Men 👨</p>
                  <div className="bg-card rounded-lg overflow-hidden border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-semibold">Classification</th>
                          <th className="text-left p-2 font-semibold">Body Fat %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr><td className="p-2">Essential Fat</td><td className="p-2 font-mono">2-5%</td></tr>
                        <tr className="bg-muted/30"><td className="p-2">Athletes</td><td className="p-2 font-mono">10-13%</td></tr>
                        <tr><td className="p-2">Fitness</td><td className="p-2 font-mono">14-17%</td></tr>
                        <tr className="bg-muted/30"><td className="p-2">Average</td><td className="p-2 font-mono">18-24%</td></tr>
                        <tr><td className="p-2">Obese</td><td className="p-2 font-mono">25%+</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleRecalculate}
        >
          {isLoggedIn ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save & Update
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Metrics
            </>
          )}
        </Button>
        <Button
          className="flex-1"
          onClick={onNext}
        >
          See Your Results
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default UserInfoTab;
