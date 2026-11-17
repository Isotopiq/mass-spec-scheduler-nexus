
import React from "react";
import { Filter } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Instrument } from "../../types";

interface InstrumentFilterProps {
  instruments: Instrument[];
  selectedInstrument: string;
  onInstrumentChange: (instrumentId: string) => void;
}

const InstrumentFilter: React.FC<InstrumentFilterProps> = ({
  instruments,
  selectedInstrument,
  onInstrumentChange
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          <span>Filter</span>
          {selectedInstrument !== "all" && (
            <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1">
              1
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by Instrument:</label>
          <Select value={selectedInstrument} onValueChange={onInstrumentChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select instrument" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instruments</SelectItem>
              {instruments.map((instrument) => (
                <SelectItem key={instrument.id} value={instrument.id}>
                  {instrument.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InstrumentFilter;
