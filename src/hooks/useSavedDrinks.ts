import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SavedDrink = {
  id: string;
  drink_name: string;
  abv: number;
  created_at: string;
  isSessionOnly?: boolean;
};

export const useSavedDrinks = () => {
  const [savedDrinks, setSavedDrinks] = useState<SavedDrink[]>([]);
  const [sessionDrinks, setSessionDrinks] = useState<SavedDrink[]>([]);
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
    // Check if it's a session drink
    if (drinkId.startsWith('session-')) {
      setSessionDrinks(prev => prev.filter(d => d.id !== drinkId));
      toast({
        title: "Drink removed",
        description: "The drink has been removed.",
        duration: 3000,
      });
      return true;
    }

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

  // Add a session-only drink (for guests)
  const addSessionDrink = (drinkName: string, abv: number) => {
    const newDrink: SavedDrink = {
      id: `session-${Date.now()}`,
      drink_name: drinkName,
      abv,
      created_at: new Date().toISOString(),
      isSessionOnly: true,
    };
    setSessionDrinks(prev => [...prev, newDrink]);
    return newDrink.id;
  };

  // Clear session drinks
  const clearSessionDrinks = () => {
    setSessionDrinks([]);
  };

  // Combine saved drinks and session drinks for logged-in users
  // For guests, only session drinks are available
  const allSavedDrinks = userId ? savedDrinks : [];

  return {
    savedDrinks: allSavedDrinks,
    sessionDrinks,
    loading,
    isLoggedIn: !!userId,
    saveDrink,
    deleteDrink,
    addSessionDrink,
    clearSessionDrinks,
    refetch: fetchSavedDrinks,
  };
};
