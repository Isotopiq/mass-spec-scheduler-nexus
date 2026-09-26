
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CreateUserData } from "../../types";
import { toast } from "sonner";

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: CreateUserData) => Promise<void>;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('AddUserDialog: Submitting user creation request');
      
      const userData: CreateUserData = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        department: department.trim() || undefined,
        role,
        profileImage: ""
      };
      
      console.log('AddUserDialog: User data prepared:', userData);
      
      await onSave(userData);
      
      console.log('AddUserDialog: User creation successful');
      
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setDepartment("");
      setRole("user");
      
      onClose();
      
      toast.success("User created successfully!");
      
    } catch (error) {
      console.error("AddUserDialog: Error creating user:", error);
      
      let errorMessage = "Failed to create user. ";
      if (error instanceof Error) {
        if (error.message.includes('User already registered')) {
          errorMessage += "A user with this email already exists.";
        } else if (error.message.includes('Invalid email')) {
          errorMessage += "Please provide a valid email address.";
        } else if (error.message.includes('Password should be at least 6 characters')) {
          errorMessage += "Password must be at least 6 characters long.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Please check the console for details.";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setName("");
    setEmail("");
    setPassword("");
    setDepartment("");
    setRole("user");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter full name"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter email address"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for auto-generated password"
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-500">
              {password ? "Password must be at least 6 characters long" : "Auto-generated password will be displayed after creation"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Enter department (optional)"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select 
              value={role} 
              onValueChange={(value: "admin" | "user") => setRole(value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
