import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CheckCircle, Trash2, Eye, Loader2, MessageSquare } from "lucide-react";

interface FeedbackItem {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  image_url: string | null;
  status: string;
  created_at: string;
  username?: string;
}

const FeedbackList = () => {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ["adminFeedback"],
    queryFn: async () => {
      // First get all feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (feedbackError) throw feedbackError;

      // Get usernames for feedback with user_id
      const userIds = feedbackData
        .filter((f) => f.user_id)
        .map((f) => f.user_id) as string[];

      let usernames: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", userIds);

        if (profiles) {
          usernames = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.username;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return feedbackData.map((f) => ({
        ...f,
        username: f.user_id ? usernames[f.user_id] || "Unknown User" : undefined,
      })) as FeedbackItem[];
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from("feedback")
        .update({ status: "reviewed" })
        .eq("id", feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFeedback"] });
      toast({ title: "Feedback marked as reviewed" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update feedback status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from("feedback")
        .delete()
        .eq("id", feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFeedback"] });
      setSelectedFeedback(null);
      toast({ title: "Feedback deleted" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete feedback",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback Submissions ({feedbackList?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!feedbackList || feedbackList.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No feedback submissions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackList.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {feedback.title}
                      </TableCell>
                      <TableCell>
                        {feedback.username || "Anonymous"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(feedback.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={feedback.status === "new" ? "default" : "secondary"}
                        >
                          {feedback.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedFeedback(feedback)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {feedback.status === "new" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markReviewedMutation.mutate(feedback.id)}
                              disabled={markReviewedMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this feedback? This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(feedback.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedFeedback?.title}</DialogTitle>
            <DialogDescription>
              Submitted by {selectedFeedback?.username || "Anonymous"} on{" "}
              {selectedFeedback && format(new Date(selectedFeedback.created_at), "PPpp")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {selectedFeedback?.description}
              </p>
            </div>
            {selectedFeedback?.image_url && (
              <div>
                <h4 className="font-medium mb-2">Attached Image</h4>
                <a
                  href={selectedFeedback.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={selectedFeedback.image_url}
                    alt="Feedback attachment"
                    className="max-w-full rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}
            <div className="flex items-center gap-2 pt-4">
              <Badge
                variant={selectedFeedback?.status === "new" ? "default" : "secondary"}
              >
                {selectedFeedback?.status}
              </Badge>
              {selectedFeedback?.status === "new" && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (selectedFeedback) {
                      markReviewedMutation.mutate(selectedFeedback.id);
                      setSelectedFeedback({ ...selectedFeedback, status: "reviewed" });
                    }
                  }}
                  disabled={markReviewedMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Reviewed
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FeedbackList;
