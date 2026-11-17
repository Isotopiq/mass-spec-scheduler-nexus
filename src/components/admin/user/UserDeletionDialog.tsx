
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { User } from "../../../types";

interface UserDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: User | null;
  isDeleting: boolean;
}

const UserDeletionDialog: React.FC<UserDeletionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  isDeleting
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User Permanently</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete user "{user?.name}" ({user?.email})? 
            <br /><br />
            <strong>This action cannot be undone and will permanently delete:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>User profile and account data</li>
              <li>All bookings created by this user</li>
              <li>All comments made by this user</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UserDeletionDialog;
