import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight } from "lucide-react";

type MetricType = "bmi" | "ffmi";
type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lbs";

const Metrics = () => {
  const navigate = useNavigate();
  const [metricType, setMetricType] = useState<MetricType>("bmi");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  // BMI inputs
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weight, setWeight] = useState("");

  // FFMI input
  const [bodyFat, setBodyFat] = useState("");

  const handleContinue = () => {
    // Validation would go here
    navigate("/inebriation");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Your Body Metrics</h1>
          <p className="text-muted-foreground">
            Enter your measurements for accurate calculations
          </p>
        </div>

        <Card className="p-8 space-y-6">
          {/* Metric Type Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-semibold">
                  {metricType === "bmi" ? "Use BMI (Height & Weight)" : "Use FFMI (Body Fat %)"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {metricType === "bmi" 
                    ? "Calculate based on height and weight" 
                    : "Calculate based on body fat percentage"}
                </p>
              </div>
              <Switch 
                checked={metricType === "ffmi"}
                onCheckedChange={(checked) => setMetricType(checked ? "ffmi" : "bmi")}
              />
            </div>
          </div>

          {/* BMI Inputs */}
          {metricType === "bmi" && (
            <div className="space-y-6">
              {/* Height Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Height</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={heightUnit === "cm" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHeightUnit("cm")}
                    >
                      cm
                    </Button>
                    <Button
                      variant={heightUnit === "ft" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHeightUnit("ft")}
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
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="text-lg"
                  />
                ) : (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Feet"
                        value={heightFt}
                        onChange={(e) => setHeightFt(e.target.value)}
                        className="text-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Inches"
                        value={heightIn}
                        onChange={(e) => setHeightIn(e.target.value)}
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
                      variant={weightUnit === "kg" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWeightUnit("kg")}
                    >
                      kg
                    </Button>
                    <Button
                      variant={weightUnit === "lbs" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWeightUnit("lbs")}
                    >
                      lbs
                    </Button>
                  </div>
                </div>
                
                <Input
                  type="number"
                  placeholder={weightUnit === "kg" ? "e.g., 75" : "e.g., 165"}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="text-lg"
                />
              </div>
            </div>
          )}

          {/* FFMI Input */}
          {metricType === "ffmi" && (
            <div className="space-y-3">
              <Label className="text-base">Body Fat Percentage</Label>
              <Input
                type="number"
                placeholder="e.g., 15"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="text-lg"
                min="1"
                max="50"
              />
              <p className="text-sm text-muted-foreground">
                Enter your body fat percentage (typically 10-30% for most adults)
              </p>
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleContinue}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Metrics;
