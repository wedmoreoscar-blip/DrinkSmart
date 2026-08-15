import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_VENUE_STORAGE_KEY = "drinksmart.activeVenue.v1";

function readStoredActiveVenueId(): string | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_VENUE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistActiveVenueId(id: string): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_VENUE_STORAGE_KEY, id);
  } catch {
    // Storage unavailable — the selection still applies for this session.
  }
}

export type Establishment = {
  id: string;
  name: string;
  isGlobal: boolean;
  isSessionOnly?: boolean;
};

export type EstablishmentDrink = {
  id: string;
  establishment_id: string;
  drink_name: string;
  abv: number | null;
  category: string;
  category_label: string;
  price: number | null;
  volume: number | null;
  volume_unit: string | null;
};

type EstablishmentsDbData = {
  establishments: Establishment[];
  drinks: EstablishmentDrink[];
};

type SessionData = {
  establishments: Establishment[];
  drinks: EstablishmentDrink[];
};

const establishmentsDbKey = (userId: string | null) =>
  ["establishments", userId] as const;
const sessionEstablishmentsKey = ["sessionEstablishments"] as const;

const emptySession: SessionData = { establishments: [], drinks: [] };

export const useEstablishments = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const queryKey = establishmentsDbKey(userId);

  const dbQuery = useQuery<EstablishmentsDbData>({
    queryKey,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data: establishmentsData, error: estError } = await supabase
        .from("establishments")
        .select("*")
        .order("name");

      if (estError) throw estError;

      const mappedEstablishments: Establishment[] = (establishmentsData ?? []).map(
        (est) => ({
          id: est.id,
          name: est.name,
          isGlobal: est.user_id === null,
        })
      );

      const { data: drinksData, error: drinksError } = await supabase
        .from("establishment_drinks")
        .select("*")
        .order("drink_name");

      if (drinksError) throw drinksError;

      return {
        establishments: mappedEstablishments,
        drinks: (drinksData ?? []) as EstablishmentDrink[],
      };
    },
  });

  const sessionQuery = useQuery<SessionData>({
    queryKey: sessionEstablishmentsKey,
    queryFn: () => Promise.resolve(emptySession),
    enabled: false,
    initialData: emptySession,
    staleTime: Infinity,
  });

  const db = dbQuery.data ?? { establishments: [], drinks: [] };
  const session = sessionQuery.data ?? emptySession;

  const allEstablishments: Establishment[] = [
    ...db.establishments,
    ...session.establishments,
  ];

  // The one persisted active venue. Resolve it after the database settles:
  // retain a persisted id only while it still exists, otherwise the global
  // "Wetherspoons" seed, otherwise the first global venue, otherwise none.
  const [activeVenueId, setActiveVenueIdState] = useState<string | null>(readStoredActiveVenueId);

  useEffect(() => {
    if (dbQuery.isLoading) return;
    if (allEstablishments.length === 0) return;
    if (activeVenueId !== null && allEstablishments.some((e) => e.id === activeVenueId)) return;
    const seed = allEstablishments.find((e) => e.isGlobal && e.name === "Wetherspoons");
    const nextId = (seed ?? allEstablishments.find((e) => e.isGlobal))?.id ?? null;
    setActiveVenueIdState(nextId);
    if (nextId !== null) persistActiveVenueId(nextId);
  }, [dbQuery.isLoading, allEstablishments, activeVenueId]);

  const setActiveVenueId = useCallback((id: string) => {
    setActiveVenueIdState(id);
    persistActiveVenueId(id);
  }, []);

  const activeVenue = useMemo(
    () => allEstablishments.find((e) => e.id === activeVenueId) ?? null,
    [allEstablishments, activeVenueId]
  );

  const getEstablishmentDrinks = useCallback(
    (establishmentId: string): EstablishmentDrink[] => {
      const sessionDrinks = session.drinks.filter(
        (d) => d.establishment_id === establishmentId
      );
      const databaseDrinks = db.drinks.filter((d) => d.establishment_id === establishmentId);
      return [...databaseDrinks, ...sessionDrinks];
    },
    [db.drinks, session.drinks]
  );

  const getGlobalEstablishments = useCallback(
    (): Establishment[] => db.establishments.filter((e) => e.isGlobal),
    [db.establishments]
  );

  const getUserEstablishments = useCallback(
    (): Establishment[] => db.establishments.filter((e) => !e.isGlobal),
    [db.establishments]
  );

  const addSessionEstablishment = useCallback(
    (
      name: string,
      drinks: Omit<EstablishmentDrink, "id" | "establishment_id">[]
    ): string => {
      const sessionEstId = `session-${Date.now()}`;
      const newEstablishment: Establishment = {
        id: sessionEstId,
        name,
        isGlobal: false,
        isSessionOnly: true,
      };

      const newDrinks: EstablishmentDrink[] = drinks.map((drink, index) => ({
        ...drink,
        id: `session-drink-${Date.now()}-${index}`,
        establishment_id: sessionEstId,
        price: drink.price ?? null,
        volume: drink.volume ?? null,
        volume_unit: drink.volume_unit ?? null,
      }));

      queryClient.setQueryData<SessionData>(sessionEstablishmentsKey, (old) => ({
        establishments: [...(old?.establishments ?? []), newEstablishment],
        drinks: [...(old?.drinks ?? []), ...newDrinks],
      }));

      return sessionEstId;
    },
    [queryClient]
  );

  const clearSessionEstablishments = useCallback(() => {
    queryClient.setQueryData<SessionData>(sessionEstablishmentsKey, emptySession);
  }, [queryClient]);

  const addEstablishmentDrink = useCallback(
    async (
      establishmentId: string,
      drink: Omit<EstablishmentDrink, "id" | "establishment_id">,
    ): Promise<void> => {
      if (userId) {
        const { error } = await supabase.from("establishment_drinks").insert({
          ...drink,
          establishment_id: establishmentId,
          user_id: userId,
        });
        if (error) throw error;
        await dbQuery.refetch();
        return;
      }

      const sessionDrink: EstablishmentDrink = {
        ...drink,
        id: `session-drink-${Date.now()}`,
        establishment_id: establishmentId,
      };
      queryClient.setQueryData<SessionData>(sessionEstablishmentsKey, (old) => ({
        establishments: old?.establishments ?? [],
        drinks: [...(old?.drinks ?? []), sessionDrink],
      }));
    },
    [dbQuery, queryClient, userId],
  );

  const getAllSearchableDrinks = useCallback(() => {
    const dbDrinks = db.drinks.map((d) => ({
      name: d.drink_name,
      abv: d.abv,
      category: d.category,
      categoryLabel: d.category_label,
      establishmentId: d.establishment_id,
      establishmentName:
        db.establishments.find((e) => e.id === d.establishment_id)?.name ?? "Unknown",
      isSessionOnly: false,
      price: d.price,
      volume: d.volume,
      volumeUnit: d.volume_unit,
    }));

    const sessionDrinks = session.drinks.map((d) => ({
      name: d.drink_name,
      abv: d.abv,
      category: d.category,
      categoryLabel: d.category_label,
      establishmentId: d.establishment_id,
      establishmentName:
        session.establishments.find((e) => e.id === d.establishment_id)?.name ??
        "Unknown",
      isSessionOnly: true,
      price: d.price,
      volume: d.volume,
      volumeUnit: d.volume_unit,
    }));

    return [...dbDrinks, ...sessionDrinks];
  }, [db.drinks, db.establishments, session.drinks, session.establishments]);

  const refetch = useCallback(async () => {
    await dbQuery.refetch();
  }, [dbQuery]);

  return {
    establishments: allEstablishments,
    loading: dbQuery.isLoading,
    isLoggedIn: !!userId,
    activeVenue,
    activeVenueId,
    setActiveVenueId,
    getEstablishmentDrinks,
    getGlobalEstablishments,
    getUserEstablishments,
    sessionEstablishments: session.establishments,
    addSessionEstablishment,
    addEstablishmentDrink,
    clearSessionEstablishments,
    getAllSearchableDrinks,
    refetch,
  };
};
