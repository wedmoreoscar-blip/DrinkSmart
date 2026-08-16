import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAnonymousSession } from "@/lib/anonymousAuth";
import {
  buildOverrideMap,
  mergeDrinkOverride,
  EMPTY_OVERRIDES,
  type DrinkOverrideMap,
} from "@/lib/drinkOverrides";
import {
  loadAnonymousOverrides,
  writeAnonymousOverride,
} from "@/lib/anonymousOverrideStore";

const drinkOverridesKey = (userId: string | null) => ["drinkOverrides", userId] as const;
const anonymousOverridesKey = ["anonymousDrinkOverrides"] as const;

/**
 * A user's remembered price and serve per establishment drink.
 *
 * Account-only in Postgres — `userId` is null for an anonymous session, the
 * same derivation `useSavedDrinks` uses. Anonymous users still get working
 * overrides, held in the session-scoped store and dropped when the night ends.
 *
 * Writes are upserts on the `(user_id, establishment_drink_id)` unique
 * constraint, and an edit that leaves nothing to remember deletes the record
 * rather than storing an empty one.
 */
export const useDrinkOverrides = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const isAccount = userId !== null;
  const queryKey = drinkOverridesKey(userId);

  const dbQuery = useQuery<DrinkOverrideMap>({
    queryKey,
    enabled: isAccount,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!userId) return EMPTY_OVERRIDES;
      const { data, error } = await supabase
        .from("user_drink_overrides")
        .select("establishment_drink_id, price, serving_ml")
        .eq("user_id", userId);
      if (error) throw error;
      return buildOverrideMap(data ?? []);
    },
  });

  // Session-only home for anonymous users. `queryFn` never runs: the cache is
  // seeded from the store and mutated with setQueryData, the same pattern the
  // other session-scoped caches use.
  const anonymousQuery = useQuery<DrinkOverrideMap>({
    queryKey: anonymousOverridesKey,
    queryFn: () => Promise.resolve(loadAnonymousOverrides()),
    enabled: false,
    initialData: loadAnonymousOverrides,
    staleTime: Infinity,
  });

  const overrides = isAccount
    ? dbQuery.data ?? EMPTY_OVERRIDES
    : anonymousQuery.data ?? EMPTY_OVERRIDES;

  const setOverride = useCallback(
    async (
      establishmentDrinkId: string,
      patch: { price?: number | null; serving_ml?: number | null },
    ): Promise<void> => {
      const next = mergeDrinkOverride(overrides[establishmentDrinkId], establishmentDrinkId, patch);

      if (!isAccount || !userId) {
        queryClient.setQueryData<DrinkOverrideMap>(anonymousOverridesKey, (old) =>
          writeAnonymousOverride(old ?? {}, establishmentDrinkId, next),
        );
        return;
      }

      if (next === null) {
        const { error } = await supabase
          .from("user_drink_overrides")
          .delete()
          .eq("user_id", userId)
          .eq("establishment_drink_id", establishmentDrinkId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_drink_overrides").upsert(
          {
            user_id: userId,
            establishment_drink_id: establishmentDrinkId,
            price: next.price,
            serving_ml: next.serving_ml,
          },
          { onConflict: "user_id,establishment_drink_id" },
        );
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey });
    },
    [overrides, isAccount, userId, queryClient, queryKey],
  );

  return {
    overrides,
    loading: isAccount ? dbQuery.isLoading : false,
    isAccount,
    setOverride,
  };
};
