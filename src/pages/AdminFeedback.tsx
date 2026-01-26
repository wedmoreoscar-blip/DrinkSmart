import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import FeedbackList from "@/components/admin/FeedbackList";
import AdminManagement from "@/components/admin/AdminManagement";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

const AdminFeedback = () => {
  const { isAdmin, isLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect non-admins after loading completes
    if (!isLoading && !isAdmin) {
      // We'll show the not authorized message instead of redirecting
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Not Authorized</h1>
        <p className="text-muted-foreground text-center mb-6">
          You don't have permission to access this page.
        </p>
        <Button onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage feedback and administrators</p>
          </div>
        </div>

        <div className="space-y-6">
          <FeedbackList />
          <AdminManagement />
        </div>
      </div>
    </div>
  );
};

export default AdminFeedback;
