import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isAnonymousSession } from "@/lib/anonymousAuth";
import type { Database } from "@/integrations/supabase/types";

export type SavedDrink = {
  id: string;
  drink_name: string;
  abv: number;
  serving_ml: number | null;
  price: number | null;
  created_at: string;
  isSessionOnly?: boolean;
};

type SavedDrinksTable = Database["public"]["Tables"]["saved_custom_drinks"];
type SavedDrinkRow = SavedDrinksTable["Row"];
type SavedDrinkInsert = SavedDrinksTable["Insert"];

const savedDrinksKey = (userId: string | null) => ["savedDrinks", userId] as const;
const sessionDrinksKey = ["sessionDrinks"] as const;

export const useSavedDrinks = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session && !isAnonymousSession(session) ? session.user.id : null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session && !isAnonymousSession(session) ? session.user.id : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const queryKey = savedDrinksKey(userId);

  const dbQuery = useQuery<SavedDrink[]>({
    queryKey,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_custom_drinks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows: SavedDrinkRow[] = data ?? [];
      // A row saved before the price column existed carries NULL, which is the
      // shape callers already expect.
      return rows.map((row) => ({
        id: row.id,
        drink_name: row.drink_name,
        abv: row.abv,
        serving_ml: row.serving_ml,
        price: row.price ?? null,
        created_at: row.created_at,
      }));
    },
  });

  // Session drinks are purely client-side but shared across hook instances via the
  // query cache so adds in one place show up everywhere.
  const sessionQuery = useQuery<SavedDrink[]>({
    queryKey: sessionDrinksKey,
    queryFn: () => Promise.resolve([]),
    enabled: false,
    initialData: [],
    staleTime: Infinity,
  });

  const saveDrinkMut = useMutation<
    boolean,
    Error,
    { drinkName: string; abv: number; servingMl: number; price: number | null }
  >({
    mutationFn: async ({ drinkName, abv, servingMl, price }) => {
      if (!userId) throw new Error("Not authenticated");

      // Upsert on the (user_id, drink_name) unique index: saving an edited
      // preset updates the account record instead of dead-ending on the
      // duplicate-name constraint.
      const payload: SavedDrinkInsert = {
        user_id: userId,
        drink_name: drinkName,
        abv,
        serving_ml: servingMl,
        price,
      };
      const { error } = await supabase.from("saved_custom_drinks").upsert(payload, {
        onConflict: "user_id,drink_name",
      });

      if (error) throw error;

      toast({
        title: "Drink saved! 🍹",
        description: `${drinkName} has been added to your saved drinks.`,
        duration: 3000,
      });
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => {
      console.error("Error saving drink:", err);
      toast({
        title: "Error",
        description: "Failed to save drink. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const deleteDrinkMut = useMutation<boolean, Error, string>({
    mutationFn: async (drinkId) => {
      const { error } = await supabase
        .from("saved_custom_drinks")
        .delete()
        .eq("id", drinkId);
      if (error) throw error;

      toast({
        title: "Drink removed",
        description: "The drink has been removed from your saved drinks.",
        duration: 3000,
      });
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => {
      console.error("Error deleting drink:", err);
      toast({
        title: "Error",
        description: "Failed to remove drink. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const saveDrink = useCallback(
    async (input: {
      drinkName: string;
      abv: number;
      servingMl: number;
      price: number | null;
    }): Promise<boolean> => {
      if (!userId) {
        toast({
          title: "Not logged in",
          description: "Please sign in to save custom drinks.",
          variant: "destructive",
          duration: 3000,
        });
        return false;
      }
      try {
        return await saveDrinkMut.mutateAsync(input);
      } catch {
        return false;
      }
    },
    [userId, saveDrinkMut, toast]
  );

  const deleteDrink = useCallback(
    async (drinkId: string): Promise<boolean> => {
      if (drinkId.startsWith("session-")) {
        queryClient.setQueryData<SavedDrink[]>(sessionDrinksKey, (old = []) =>
          old.filter((d) => d.id !== drinkId)
        );
        toast({
          title: "Drink removed",
          description: "The drink has been removed.",
          duration: 3000,
        });
        return true;
      }
      try {
        return await deleteDrinkMut.mutateAsync(drinkId);
      } catch {
        return false;
      }
    },
    [queryClient, deleteDrinkMut, toast]
  );

  const addSessionDrink = useCallback(
    (drinkName: string, abv: number): string => {
      const newDrink: SavedDrink = {
        id: `session-${Date.now()}`,
        drink_name: drinkName,
        abv,
        serving_ml: null,
        price: null,
        created_at: new Date().toISOString(),
        isSessionOnly: true,
      };
      queryClient.setQueryData<SavedDrink[]>(sessionDrinksKey, (old = []) => [
        ...old,
        newDrink,
      ]);
      return newDrink.id;
    },
    [queryClient]
  );

  const clearSessionDrinks = useCallback(() => {
    queryClient.setQueryData<SavedDrink[]>(sessionDrinksKey, []);
  }, [queryClient]);

  const refetch = useCallback(async () => {
    await dbQuery.refetch();
  }, [dbQuery]);

  const savedDrinks = userId ? dbQuery.data ?? [] : [];
  const sessionDrinks = sessionQuery.data ?? [];

  return {
    savedDrinks,
    sessionDrinks,
    loading: dbQuery.isLoading,
    isLoggedIn: !!userId,
    saveDrink,
    deleteDrink,
    addSessionDrink,
    clearSessionDrinks,
    refetch,
  };
};
