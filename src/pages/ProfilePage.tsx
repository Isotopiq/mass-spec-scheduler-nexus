
import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import PasswordDialog from "../components/admin/PasswordDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";

const ProfilePage: React.FC = () => {
  const { user, updateUserProfile, updateUserPassword } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    user?.profileImage || null
  );
  const [newPassword, setNewPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;

    try {
      setIsUpdating(true);
      
      // Handle file upload to Supabase storage
      let profileImageUrl = user.profileImage;
      
      if (selectedFile) {
        setIsUploadingImage(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/profile.${fileExt}`;
        
        try {
          // Upload to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, selectedFile, {
              upsert: true
            });

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL with timestamp to prevent caching
          const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName);

          profileImageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Failed to upload profile image. Saving other changes.");
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Update profile in database with correct field name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name,
          email,
          department: department || null,
          profile_image: profileImageUrl
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile in database:', updateError);
        toast.error("Failed to update profile in database.");
        return;
      }

      // Update user profile in context
      await updateUserProfile({
        ...user,
        name,
        email,
        department,
        profileImage: profileImageUrl
      });
      
      setIsEditing(false);
      setSelectedFile(null);
      setImagePreview(profileImageUrl);
      toast.success("Your profile information has been updated successfully.");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("There was a problem updating your profile.");
    } finally {
      setIsUpdating(false);
    }
  }, [user, name, email, department, selectedFile, updateUserProfile]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file (JPEG, PNG, etc.).");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Please upload an image smaller than 5MB.");
        return;
      }

      setSelectedFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleChangePassword = useCallback(async () => {
    if (!newPassword.trim()) {
      toast.error("Please provide a valid password.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (!user) return;

    setIsSubmittingPassword(true);
    
    try {
      await updateUserPassword(user.id, newPassword);
      
      toast.success("Your password has been updated successfully.");
      setIsPasswordDialogOpen(false);
      setNewPassword("");
    } catch (error) {
      toast.error("There was an error updating the password.");
    } finally {
      setIsSubmittingPassword(false);
    }
  }, [user, newPassword, updateUserPassword]);

  const handleRevert = useCallback(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setDepartment(user?.department || "");
    setImagePreview(user?.profileImage || null);
    setSelectedFile(null);
  }, [user]);

  if (!user) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your profile</h1>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">My Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              View and edit your personal information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isUpdating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isUpdating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isUpdating}
                placeholder="e.g., Research, Chemistry, Biology"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div>
                <Badge variant="outline">{user.role === "admin" ? "Administrator" : "User"}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Profile Image</Label>
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage 
                    src={imagePreview || undefined} 
                    alt={name}
                    key={imagePreview} // Force re-render when image changes
                  />
                  <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                  <Label
                    htmlFor="profileImage"
                    className="inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium cursor-pointer hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose photo
                      </>
                    )}
                  </Label>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                onClick={handleRevert}
                disabled={isUpdating || isUploadingImage}
              >
                Revert
              </Button>
              <Button onClick={handleSaveProfile} disabled={isUpdating || isUploadingImage}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Security</CardTitle>
            <CardDescription>
              Manage your account password and security settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Change Password</Label>
              <p className="text-sm text-muted-foreground">
                Update your password to maintain account security.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(true)}
            >
              Change Password
            </Button>
          </CardFooter>
        </Card>
      </div>

      <PasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        onSave={handleChangePassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        isSubmitting={isSubmittingPassword}
      />
    </div>
  );
};

export default ProfilePage;
