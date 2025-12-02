import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SavedDrink = {
  id: string;
  drink_name: string;
  abv: number;
  created_at: string;
};

export const useSavedDrinks = () => {
  const [savedDrinks, setSavedDrinks] = useState<SavedDrink[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchSavedDrinks();
    } else {
      setSavedDrinks([]);
      setLoading(false);
    }
  }, [userId]);

  const fetchSavedDrinks = async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_custom_drinks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching saved drinks:", error);
    } else {
      setSavedDrinks(data || []);
    }
    setLoading(false);
  };

  const saveDrink = async (drinkName: string, abv: number) => {
    if (!userId) {
      toast({
        title: "Not logged in",
        description: "Please sign in to save custom drinks.",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    // Check if drink already exists
    const existing = savedDrinks.find(
      (d) => d.drink_name.toLowerCase() === drinkName.toLowerCase()
    );
    if (existing) {
      toast({
        title: "Already saved",
        description: "This drink is already in your saved drinks.",
        duration: 3000,
      });
      return false;
    }

    const { error } = await supabase.from("saved_custom_drinks").insert({
      user_id: userId,
      drink_name: drinkName,
      abv,
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Already saved",
          description: "This drink is already in your saved drinks.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save drink. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
      return false;
    }

    toast({
      title: "Drink saved! 🍹",
      description: `${drinkName} has been added to your saved drinks.`,
      duration: 3000,
    });
    
    await fetchSavedDrinks();
    return true;
  };

  const deleteDrink = async (drinkId: string) => {
    const { error } = await supabase
      .from("saved_custom_drinks")
      .delete()
      .eq("id", drinkId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove drink. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    toast({
      title: "Drink removed",
      description: "The drink has been removed from your saved drinks.",
      duration: 3000,
    });
    
    setSavedDrinks((prev) => prev.filter((d) => d.id !== drinkId));
    return true;
  };

  return {
    savedDrinks,
    loading,
    isLoggedIn: !!userId,
    saveDrink,
    deleteDrink,
    refetch: fetchSavedDrinks,
  };
};
