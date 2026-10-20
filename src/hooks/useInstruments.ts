
import { useState, useCallback } from "react";
import { Instrument } from "../types";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

export const useInstruments = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);

  // Load instruments from Supabase
  const loadInstruments = useCallback(async () => {
    try {
      console.log("Loading instruments from Supabase");
      const { data, error } = await supabase
        .from('instruments')
        .select('*');

      if (error) {
        throw error;
      }

      if (data) {
        // Transform Supabase data to match our Instrument type
        const formattedInstruments: Instrument[] = data.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type || "",
          model: item.model || "",
          location: item.location,
          // Ensure status is one of the allowed values
          status: (item.status as "available" | "in_use" | "maintenance" | "offline"),
          image: item.image || "",
          description: item.description,
          specifications: item.specifications,
          calibrationDue: item.calibration_due ? new Date(item.calibration_due).toISOString() : undefined,
          maintenanceHistory: []
        }));
        
        // Load maintenance history for each instrument
        for (const instrument of formattedInstruments) {
          const { data: maintenanceData, error: maintenanceError } = await supabase
            .from('maintenance_history')
            .select('*')
            .eq('instrument_id', instrument.id);
            
          if (maintenanceError) {
            console.error("Error fetching maintenance history:", maintenanceError);
          } else if (maintenanceData) {
            instrument.maintenanceHistory = maintenanceData.map(item => ({
              date: new Date(item.date).toISOString().split('T')[0],
              description: item.description
            }));
          }
        }
        
        console.log(`Loaded ${formattedInstruments.length} instruments from Supabase`);
        setInstruments(formattedInstruments);
      }
    } catch (error) {
      console.error("Error loading instruments:", error);
      toast.error("Failed to load instruments");
    }
  }, []);

  // Function to add a new instrument
  const addInstrument = async (instrumentData: Omit<Instrument, "id">) => {
    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('instruments')
        .insert({
          name: instrumentData.name,
          type: instrumentData.type,
          model: instrumentData.model,
          location: instrumentData.location,
          status: instrumentData.status,
          image: instrumentData.image,
          description: instrumentData.description,
          specifications: instrumentData.specifications,
          calibration_due: instrumentData.calibrationDue
        })
        .select();

      if (error) {
        throw error;
      }
      
      if (data && data[0]) {
        // Add maintenance history if present
        if (instrumentData.maintenanceHistory && instrumentData.maintenanceHistory.length > 0) {
          for (const maintenance of instrumentData.maintenanceHistory) {
            await supabase
              .from('maintenance_history')
              .insert({
                instrument_id: data[0].id,
                date: maintenance.date,
                description: maintenance.description
              });
          }
        }

        // Reload instruments to get the updated list
        await loadInstruments();
        toast.success("Instrument added successfully");
      }
    } catch (error) {
      console.error("Error adding instrument:", error);
      toast.error("Failed to add instrument");
    }
  };

  // Function to update an existing instrument
  const updateInstrument = async (instrumentData: Instrument) => {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('instruments')
        .update({
          name: instrumentData.name,
          type: instrumentData.type,
          model: instrumentData.model,
          location: instrumentData.location,
          status: instrumentData.status,
          image: instrumentData.image,
          description: instrumentData.description,
          specifications: instrumentData.specifications,
          calibration_due: instrumentData.calibrationDue
        })
        .eq('id', instrumentData.id);

      if (error) {
        throw error;
      }
      
      // Update maintenance history
      if (instrumentData.maintenanceHistory) {
        // Delete existing maintenance history
        await supabase
          .from('maintenance_history')
          .delete()
          .eq('instrument_id', instrumentData.id);
          
        // Add updated maintenance history
        for (const maintenance of instrumentData.maintenanceHistory) {
          await supabase
            .from('maintenance_history')
            .insert({
              instrument_id: instrumentData.id,
              date: maintenance.date,
              description: maintenance.description
            });
        }
      }

      // Reload instruments to get the updated list
      await loadInstruments();
      toast.success("Instrument updated successfully");
    } catch (error) {
      console.error("Error updating instrument:", error);
      toast.error("Failed to update instrument");
    }
  };

  // Function to delete an instrument
  const deleteInstrument = async (instrumentId: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('instruments')
        .delete()
        .eq('id', instrumentId);

      if (error) {
        throw error;
      }

      // Reload instruments to get the updated list
      await loadInstruments();
      toast.success("Instrument deleted successfully");
    } catch (error) {
      console.error("Error deleting instrument:", error);
      toast.error("Failed to delete instrument");
    }
  };

  return {
    instruments,
    loadInstruments,
    addInstrument,
    updateInstrument,
    deleteInstrument
  };
};
