
import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Calendar } from "../../ui/calendar";
import { Button } from "../../ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Instrument } from "../../../types";
import { supabase } from "../../../integrations/supabase/client";
import { ImageCropDialog } from "@/components/ui/ImageCropDialog";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  type: z.string().min(2, { message: "Type must be at least 2 characters" }),
  model: z.string().min(2, { message: "Model must be at least 2 characters" }),
  location: z.string().min(2, { message: "Location is required" }),
  status: z.enum(["available", "maintenance", "in_use", "offline"]),
  description: z.string().optional(),
  image: z.string().optional(),
  calibrationDue: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InstrumentDialogsProps {
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  selectedInstrument: Instrument | null;
  onAddDialogClose: () => void;
  onEditDialogClose: () => void;
  onDeleteDialogClose: () => void;
  onAddInstrument: (data: FormValues) => Promise<void>;
  onEditInstrument: (data: FormValues) => Promise<void>;
  onDeleteInstrument: () => Promise<void>;
}

const InstrumentDialogs: React.FC<InstrumentDialogsProps> = ({
  isAddDialogOpen,
  isEditDialogOpen,
  isDeleteDialogOpen,
  selectedInstrument,
  onAddDialogClose,
  onEditDialogClose,
  onDeleteDialogClose,
  onAddInstrument,
  onEditInstrument,
  onDeleteInstrument
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      model: "",
      location: "",
      status: "available",
      description: "",
      image: "",
    }
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: selectedInstrument?.name || "",
      type: selectedInstrument?.type || "",
      model: selectedInstrument?.model || "",
      location: selectedInstrument?.location || "",
      status: selectedInstrument?.status as any || "available",
      description: selectedInstrument?.description || "",
      image: selectedInstrument?.image || "",
      calibrationDue: selectedInstrument?.calibrationDue ? new Date(selectedInstrument.calibrationDue) : undefined,
    }
  });

  React.useEffect(() => {
    if (selectedInstrument) {
      editForm.reset({
        name: selectedInstrument.name,
        type: selectedInstrument.type || "",
        model: selectedInstrument.model || "",
        location: selectedInstrument.location,
        status: selectedInstrument.status as any,
        description: selectedInstrument.description || "",
        image: selectedInstrument.image || "",
        calibrationDue: selectedInstrument.calibrationDue ? new Date(selectedInstrument.calibrationDue) : undefined,
      });
    }
  }, [selectedInstrument, editForm]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropMime, setCropMime] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropSrc(event.target?.result as string);
      setCropMime(file.type);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCroppedImage = async (file: File) => {
    setCropOpen(false);
    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `instrument-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from("instrument-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message || "Upload failed");

      const { data: publicUrlData } = supabase
        .storage
        .from("instrument-images")
        .getPublicUrl(fileName);

      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      const targetForm = isAddDialogOpen ? form : isEditDialogOpen ? editForm : null;
      targetForm?.setValue("image", publicUrl, { shouldDirty: true });
    } catch (err) {
      console.error("Instrument image upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload instrument image");
    } finally {
      setUploadingImage(false);
    }
  };

  const renderImageField = (formInstance: any) => (
    <FormField
      control={formInstance.control}
      name="image"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Instrument Image</FormLabel>
          <FormControl>
            <div className="space-y-3">
              {field.value ? (
                <div className="relative w-fit">
                  <img
                    src={field.value}
                    alt="Instrument preview"
                    className="h-32 w-auto rounded-md border object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => field.onChange("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-32 w-full rounded-md border border-dashed bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleFileSelect}
                disabled={uploadingImage}
                className="w-full"
              >
                {uploadingImage ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {field.value ? "Replace Image" : "Upload Image"}
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderFormFields = (formInstance: any) => (
    <>
      <FormField
        control={formInstance.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Instrument name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={formInstance.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <FormControl>
              <Input placeholder="Instrument type" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={formInstance.control}
        name="model"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Model</FormLabel>
            <FormControl>
              <Input placeholder="Manufacturer and model" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={formInstance.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl>
              <Input placeholder="Lab and room number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={formInstance.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={formInstance.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Instrument description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {renderImageField(formInstance)}
      
      <FormField
        control={formInstance.control}
        name="calibrationDue"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Calibration Due Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  return (
    <>
      {/* Add Instrument Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={onAddDialogClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Instrument</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddInstrument)} className="space-y-4">
              {renderFormFields(form)}
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onAddDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">Add Instrument</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Instrument Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={onEditDialogClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Instrument</DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditInstrument)} className="space-y-4">
              {renderFormFields(editForm)}
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onEditDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Instrument Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instrument</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedInstrument?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteInstrument} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={cropSrc}
        title="Crop instrument image"
        aspect={16 / 9}
        cropShape="rect"
        mimeType={cropMime || undefined}
        onCropped={handleCroppedImage}
      />
    </>
  );
};

export default InstrumentDialogs;
