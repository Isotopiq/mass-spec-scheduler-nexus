
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Calculator, Clock } from "lucide-react";

interface DurationCalculatorProps {
  onDurationChange: (durationMinutes: number) => void;
  initialSamples?: number;
  initialRunTime?: number;
}

const DurationCalculator: React.FC<DurationCalculatorProps> = ({
  onDurationChange,
  initialSamples = 1,
  initialRunTime = 30
}) => {
  const [samples, setSamples] = useState(initialSamples);
  const [runTimePerSample, setRunTimePerSample] = useState(initialRunTime);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    const duration = samples * runTimePerSample;
    setTotalDuration(duration);
    onDurationChange(duration);
  }, [samples, runTimePerSample, onDurationChange]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center">
          <Calculator className="h-4 w-4 mr-2" />
          Duration Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="samples">Number of Samples</Label>
            <Input
              id="samples"
              type="number"
              min="1"
              value={samples}
              onChange={(e) => setSamples(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="runtime">Run Time per Sample (minutes)</Label>
            <Input
              id="runtime"
              type="number"
              min="1"
              value={runTimePerSample}
              onChange={(e) => setRunTimePerSample(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">Total Duration:</span>
            </div>
            <span className="text-lg font-bold text-primary">
              {formatDuration(totalDuration)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DurationCalculator;
