import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Shield, Trash2, UserPlus, Loader2, Search } from "lucide-react";

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  username: string;
}

interface SearchResult {
  user_id: string;
  username: string;
}

const AdminManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      // Get all admin roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Get usernames for these users
      const userIds = roles.map((r) => r.user_id);
      
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", userIds);

      const usernames = profiles?.reduce((acc, p) => {
        acc[p.user_id] = p.username;
        return acc;
      }, {} as Record<string, string>) || {};

      return roles.map((r) => ({
        ...r,
        username: usernames[r.user_id] || "Unknown User",
      })) as AdminUser[];
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username")
        .ilike("username", `%${searchQuery.trim()}%`)
        .limit(10);

      if (error) throw error;

      // Filter out users who are already admins
      const adminUserIds = adminUsers?.map((a) => a.user_id) || [];
      const filteredResults = data.filter(
        (p) => !adminUserIds.includes(p.user_id)
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Could not search for users",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setSearchResults([]);
      setSearchQuery("");
      toast({ title: "Admin role granted" });
    },
    onError: (error) => {
      console.error("Add admin error:", error);
      toast({
        title: "Error",
        description: "Failed to add admin role",
        variant: "destructive",
      });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast({ title: "Admin role removed" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove admin role",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Management
        </CardTitle>
        <CardDescription>
          Manage users with administrative access to the feedback system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Admin Section */}
        <div className="space-y-3">
          <Label>Add New Admin</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-md divide-y">
              {searchResults.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3"
                >
                  <span>{user.username}</span>
                  <Button
                    size="sm"
                    onClick={() => addAdminMutation.mutate(user.user_id)}
                    disabled={addAdminMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <p className="text-sm text-muted-foreground">
              No users found matching "{searchQuery}"
            </p>
          )}
        </div>

        {/* Current Admins List */}
        <div className="space-y-3">
          <Label>Current Admins</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !adminUsers || adminUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No admins found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      {admin.username}
                    </TableCell>
                    <TableCell>
                      {format(new Date(admin.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={adminUsers.length === 1}
                            title={
                              adminUsers.length === 1
                                ? "Cannot remove the last admin"
                                : "Remove admin"
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Admin</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove admin privileges from{" "}
                              <strong>{admin.username}</strong>? They will no longer
                              be able to access the admin panel.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeAdminMutation.mutate(admin.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminManagement;
