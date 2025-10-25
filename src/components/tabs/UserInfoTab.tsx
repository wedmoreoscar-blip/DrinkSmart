import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/contexts/AppContext";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UserInfoTab = ({ onNext }: { onNext: () => void }) => {
  const { state, updateUserMetrics, recalculate } = useAppContext();
  const { userMetrics } = state;
  const { toast } = useToast();

  const handleRecalculate = () => {
    recalculate();
    toast({
      title: "Metrics Updated",
      description: "Your information has been saved and calculations updated.",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="p-6 md:p-8 space-y-6">
        {/* Metric Type Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-base font-semibold">
              {userMetrics.metricType === "bmi" ? "Use BMI (Height & Weight)" : "Use FFMI (Body Fat %)"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {userMetrics.metricType === "bmi" 
                ? "Calculate based on height and weight" 
                : "Calculate based on body fat percentage"}
            </p>
          </div>
          <Switch 
            checked={userMetrics.metricType === "ffmi"}
            onCheckedChange={(checked) => 
              updateUserMetrics({ metricType: checked ? "ffmi" : "bmi" })
            }
          />
        </div>

        {/* BMI Inputs */}
        {userMetrics.metricType === "bmi" && (
          <div className="space-y-6">
            {/* Height Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Height</Label>
                <div className="flex gap-2">
                  <Button
                    variant={userMetrics.heightUnit === "cm" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateUserMetrics({ heightUnit: "cm" })}
                  >
                    cm
                  </Button>
                  <Button
                    variant={userMetrics.heightUnit === "ft" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateUserMetrics({ heightUnit: "ft" })}
                  >
                    ft/in
                  </Button>
                </div>
              </div>
              
              {userMetrics.heightUnit === "cm" ? (
                <Input
                  type="number"
                  placeholder="e.g., 175"
                  value={userMetrics.heightCm}
                  onChange={(e) => updateUserMetrics({ heightCm: e.target.value })}
                  className="text-lg"
                />
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Feet"
                      value={userMetrics.heightFt}
                      onChange={(e) => updateUserMetrics({ heightFt: e.target.value })}
                      className="text-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Inches"
                      value={userMetrics.heightIn}
                      onChange={(e) => updateUserMetrics({ heightIn: e.target.value })}
                      className="text-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Weight Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Weight</Label>
                <div className="flex gap-2">
                  <Button
                    variant={userMetrics.weightUnit === "kg" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateUserMetrics({ weightUnit: "kg" })}
                  >
                    kg
                  </Button>
                  <Button
                    variant={userMetrics.weightUnit === "lbs" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateUserMetrics({ weightUnit: "lbs" })}
                  >
                    lbs
                  </Button>
                </div>
              </div>
              
              <Input
                type="number"
                placeholder={userMetrics.weightUnit === "kg" ? "e.g., 75" : "e.g., 165"}
                value={userMetrics.weight}
                onChange={(e) => updateUserMetrics({ weight: e.target.value })}
                className="text-lg"
              />
            </div>
          </div>
        )}

        {/* FFMI Input */}
        {userMetrics.metricType === "ffmi" && (
          <div className="space-y-3">
            <Label className="text-base">Body Fat Percentage</Label>
            <Input
              type="number"
              placeholder="e.g., 15"
              value={userMetrics.bodyFat}
              onChange={(e) => updateUserMetrics({ bodyFat: e.target.value })}
              className="text-lg"
              min="1"
              max="50"
            />
            <p className="text-sm text-muted-foreground">
              Enter your body fat percentage (typically 10-30% for most adults)
            </p>
          </div>
        )}

        {/* Age Input */}
        <div className="space-y-3">
          <Label className="text-base">Age</Label>
          <Input
            type="number"
            placeholder="e.g., 25"
            value={userMetrics.age}
            onChange={(e) => updateUserMetrics({ age: e.target.value })}
            className="text-lg"
            min="18"
            max="120"
          />
        </div>

        {/* Sex Selection */}
        <div className="space-y-3">
          <Label className="text-base">Sex</Label>
          <Select
            value={userMetrics.sex}
            onValueChange={(value: "male" | "female") => 
              updateUserMetrics({ sex: value })
            }
          >
            <SelectTrigger className="text-lg">
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Used for accurate metabolism calculations
          </p>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleRecalculate}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Recalculate
        </Button>
        <Button
          className="flex-1"
          onClick={onNext}
        >
          Next: Drinks
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default UserInfoTab;
