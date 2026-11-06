
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ArrowUpDown } from "lucide-react";

export type SortOption = 
  | "newest-first"
  | "oldest-first"
  | "title-asc"
  | "title-desc"
  | "instrument-asc"
  | "instrument-desc";

interface BookingSortDropdownProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

export const BookingSortDropdown: React.FC<BookingSortDropdownProps> = ({
  sortBy,
  onSortChange,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <ArrowUpDown className="h-4 w-4 text-gray-500" />
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest-first">Newest First</SelectItem>
          <SelectItem value="oldest-first">Oldest First</SelectItem>
          <SelectItem value="title-asc">Title (A-Z)</SelectItem>
          <SelectItem value="title-desc">Title (Z-A)</SelectItem>
          <SelectItem value="instrument-asc">Instrument (A-Z)</SelectItem>
          <SelectItem value="instrument-desc">Instrument (Z-A)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
