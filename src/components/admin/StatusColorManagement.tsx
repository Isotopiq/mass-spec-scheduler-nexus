
import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useStatusColors, StatusColor } from "../../hooks/useStatusColors";
import { Badge } from "../ui/badge";

const StatusColorManagement: React.FC = () => {
  const { statusColors, loadStatusColors, updateStatusColor } = useStatusColors();
  const [editingColors, setEditingColors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadStatusColors();
  }, [loadStatusColors]);

  const handleColorChange = (status: string, color: string) => {
    setEditingColors(prev => ({
      ...prev,
      [status]: color
    }));
  };

  const handleSaveColor = async (status: string) => {
    const newColor = editingColors[status];
    if (newColor) {
      try {
        await updateStatusColor(status, newColor);
        setEditingColors(prev => {
          const updated = { ...prev };
          delete updated[status];
          return updated;
        });
      } catch (error) {
        console.error("Error saving color:", error);
      }
    }
  };

  const formatStatusName = (status: string) => {
    return status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Status Color Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Customize the colors used to display booking statuses in the calendar view.
          </p>
        </div>

        <div className="grid gap-4">
          {statusColors.map((statusColor) => {
            const isEditing = editingColors[statusColor.status] !== undefined;
            const currentColor = isEditing ? editingColors[statusColor.status] : statusColor.color;

            return (
              <div key={statusColor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge 
                    style={{ backgroundColor: currentColor, color: '#fff' }}
                    className="min-w-[100px] justify-center"
                  >
                    {formatStatusName(statusColor.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {statusColor.status}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`color-${statusColor.status}`} className="text-sm">
                      Color:
                    </Label>
                    <Input
                      id={`color-${statusColor.status}`}
                      type="color"
                      value={currentColor}
                      onChange={(e) => handleColorChange(statusColor.status, e.target.value)}
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={currentColor}
                      onChange={(e) => handleColorChange(statusColor.status, e.target.value)}
                      className="w-24 h-8 text-xs"
                      placeholder="#000000"
                    />
                  </div>

                  {isEditing && (
                    <Button
                      size="sm"
                      onClick={() => handleSaveColor(statusColor.status)}
                    >
                      Save
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default StatusColorManagement;
