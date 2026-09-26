
import React from "react";
import { Input } from "../ui/input";
import { Search } from "lucide-react";

interface BookingSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const BookingSearch: React.FC<BookingSearchProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        type="text"
        placeholder="Search bookings by title, description, instrument, or comments..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
};
