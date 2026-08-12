
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Instrument } from "../../../types";

interface InstrumentTableProps {
  instruments: Instrument[];
  onAdd: () => void;
  onEdit: (instrument: Instrument) => void;
  onDelete: (instrument: Instrument) => void;
}

const InstrumentTable: React.FC<InstrumentTableProps> = ({
  instruments,
  onAdd,
  onEdit,
  onDelete
}) => {
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500">Available</Badge>;
      case "maintenance":
        return <Badge className="bg-yellow-500">Maintenance</Badge>;
      case "in_use":
        return <Badge className="bg-blue-500">In Use</Badge>;
      case "offline":
        return <Badge className="bg-gray-500">Offline</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Instrument Management</h2>
        <Button onClick={onAdd}>Add Instrument</Button>
      </div>

      {instruments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No instruments found. Add your first instrument to get started.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Calibration Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instruments.map(instrument => (
              <TableRow key={instrument.id}>
                <TableCell className="font-medium">{instrument.name}</TableCell>
                <TableCell>{instrument.type || "-"}</TableCell>
                <TableCell>{instrument.model || "-"}</TableCell>
                <TableCell>{instrument.location}</TableCell>
                <TableCell>{renderStatusBadge(instrument.status)}</TableCell>
                <TableCell>{instrument.calibrationDue || "-"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEdit(instrument)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onDelete(instrument)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
};

export default InstrumentTable;
