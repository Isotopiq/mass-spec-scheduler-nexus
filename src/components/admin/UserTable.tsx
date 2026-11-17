
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { User } from "../../types";
import { useToast } from "../../hooks/use-toast";

interface UserTableProps {
  users: User[];
  currentUserId?: string;
  onEdit: (userId: string) => void;
  onChangeRole: (userId: string, newRole: 'admin' | 'user') => void;
  onChangePassword: (userId: string) => void;
  onDelete: (userId: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({ 
  users, 
  currentUserId, 
  onEdit, 
  onChangeRole, 
  onChangePassword, 
  onDelete 
}) => {
  const { toast } = useToast();

  const handleDelete = (userId: string) => {
    // Don't allow deleting yourself
    if (userId === currentUserId) {
      toast({
        title: "Cannot delete account",
        description: "You cannot delete your own account.",
        variant: "destructive"
      });
      return;
    }
    
    onDelete(userId);
  };

  const handleRoleChange = (userId: string, currentRole: 'admin' | 'user') => {
    // Don't allow changing your own role
    if (userId === currentUserId) {
      toast({
        title: "Cannot change own role",
        description: "You cannot change your own role.",
        variant: "destructive"
      });
      return;
    }
    
    onChangeRole(userId, currentRole === "admin" ? "user" : "admin");
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>{user.department || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRoleChange(user.id, user.role)}
                      disabled={user.id === currentUserId}
                    >
                      {user.role === "admin" ? "Make User" : "Make Admin"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onChangePassword(user.id)}
                    >
                      Password
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(user.id)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                      disabled={user.id === currentUserId}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
