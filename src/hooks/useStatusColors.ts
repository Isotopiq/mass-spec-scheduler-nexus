
import { useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

export interface StatusColor {
  id: string;
  status: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export const useStatusColors = () => {
  const [statusColors, setStatusColors] = useState<StatusColor[]>([]);

  // Load status colors from Supabase
  const loadStatusColors = useCallback(async () => {
    try {
      console.log("Loading status colors from Supabase");
      const { data, error } = await supabase
        .from('status_colors')
        .select('*')
        .order('status');

      if (error) {
        throw error;
      }

      if (data) {
        const formattedColors: StatusColor[] = data.map(color => ({
          id: color.id,
          status: color.status,
          color: color.color,
          createdAt: color.created_at,
          updatedAt: color.updated_at
        }));

        console.log(`Loaded ${formattedColors.length} status colors`);
        setStatusColors(formattedColors);
      }
    } catch (error) {
      console.error("Error loading status colors:", error);
      toast.error("Failed to load status colors");
    }
  }, []);

  // Update a status color
  const updateStatusColor = async (status: string, color: string) => {
    try {
      const { error } = await supabase
        .from('status_colors')
        .update({ 
          color: color,
          updated_at: new Date().toISOString()
        })
        .eq('status', status);

      if (error) {
        throw error;
      }

      // Reload colors to get updated data
      await loadStatusColors();
      toast.success("Status color updated successfully");
    } catch (error) {
      console.error("Error updating status color:", error);
      toast.error("Failed to update status color");
      throw error;
    }
  };

  // Get color for a specific status
  const getStatusColor = (status: string): string => {
    const statusColor = statusColors.find(sc => sc.status === status);
    return statusColor?.color || '#6b7280'; // Default gray color
  };

  return {
    statusColors,
    loadStatusColors,
    updateStatusColor,
    getStatusColor
  };
};
