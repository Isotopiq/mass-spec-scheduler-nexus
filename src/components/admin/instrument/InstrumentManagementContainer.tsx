
import React, { useState } from "react";
import { Card } from "../../ui/card";
import { useOptimizedBooking } from "../../../contexts/OptimizedBookingContext";
import { Instrument } from "../../../types";
import { toast } from "sonner";
import InstrumentTable from "./InstrumentTable";
import InstrumentDialogs from "./InstrumentDialogs";

const InstrumentManagementContainer: React.FC = () => {
  const { instruments, addInstrument, updateInstrument, deleteInstrument } = useOptimizedBooking();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleAddInstrument = async (data: any) => {
    console.log("Adding instrument:", data);
    try {
      await addInstrument({
        name: data.name,
        type: data.type,
        model: data.model,
        location: data.location,
        status: data.status,
        description: data.description || "",
        specifications: "",
        image: "",
        calibrationDue: data.calibrationDue ? data.calibrationDue.toISOString().split('T')[0] : undefined,
      });
      
      setIsAddDialogOpen(false);
      toast.success("Instrument added successfully!");
    } catch (error) {
      console.error("Error adding instrument:", error);
      toast.error("Failed to add instrument");
    }
  };

  const handleEditInstrument = async (data: any) => {
    if (!selectedInstrument) return;
    
    console.log("Updating instrument:", data);
    try {
      const updatedInstrument = {
        ...selectedInstrument,
        name: data.name,
        type: data.type,
        model: data.model,
        location: data.location,
        status: data.status,
        description: data.description || "",
        calibrationDue: data.calibrationDue ? data.calibrationDue.toISOString().split('T')[0] : undefined,
      };

      await updateInstrument(updatedInstrument);
      setIsEditDialogOpen(false);
      setSelectedInstrument(null);
      
      toast.success("Instrument updated successfully!");
    } catch (error) {
      console.error("Error updating instrument:", error);
      toast.error("Failed to update instrument");
    }
  };

  const handleDeleteInstrument = async () => {
    if (!selectedInstrument) return;
    
    console.log("Deleting instrument:", selectedInstrument.id);
    try {
      await deleteInstrument(selectedInstrument.id);
      setIsDeleteDialogOpen(false);
      setSelectedInstrument(null);
      
      toast.success("Instrument deleted successfully!");
    } catch (error) {
      console.error("Error deleting instrument:", error);
      toast.error("Failed to delete instrument");
    }
  };

  const handleEditClick = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteClick = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <Card className="p-6">
        <InstrumentTable
          instruments={instruments}
          onAdd={() => setIsAddDialogOpen(true)}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      </Card>

      <InstrumentDialogs
        isAddDialogOpen={isAddDialogOpen}
        isEditDialogOpen={isEditDialogOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        selectedInstrument={selectedInstrument}
        onAddDialogClose={() => setIsAddDialogOpen(false)}
        onEditDialogClose={() => setIsEditDialogOpen(false)}
        onDeleteDialogClose={() => setIsDeleteDialogOpen(false)}
        onAddInstrument={handleAddInstrument}
        onEditInstrument={handleEditInstrument}
        onDeleteInstrument={handleDeleteInstrument}
      />
    </>
  );
};

export default InstrumentManagementContainer;
