import React, { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cropImageToBlob } from "@/utils/cropImage";

export interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  title?: string;
  aspect?: number;
  cropShape?: "rect" | "round";
  mimeType?: string;
  onCropped: (file: File) => void;
}

export const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  onOpenChange,
  imageSrc,
  title = "Crop image",
  aspect = 1,
  cropShape = "rect",
  mimeType,
  onCropped,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setProcessing(false);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback(
    (
      _: { x: number; y: number; width: number; height: number },
      croppedAreaPixels: { x: number; y: number; width: number; height: number }
    ) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const response = await fetch(imageSrc);
      const originalBlob = await response.blob();
      const type = mimeType || originalBlob.type || "image/jpeg";
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels, type, 0.92);
      const ext = type.split("/")[1] || "jpg";
      const file = new File([blob], `cropped.${ext}`, { type });
      onCropped(file);
      onOpenChange(false);
    } catch (err) {
      console.error("Crop failed:", err);
      toast.error("Failed to crop image.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Drag and zoom to adjust the crop area.</DialogDescription>
        </DialogHeader>
        <div className="relative h-96 w-full bg-muted rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="space-y-2">
          <span className="text-sm">Zoom</span>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!croppedAreaPixels || processing}>
            {processing ? "Cropping..." : "Crop & Use"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
