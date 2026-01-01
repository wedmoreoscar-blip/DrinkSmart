import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  abv: number;
  category: string;
  category_label: string;
};

export const useEstablishments = () => {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [establishmentDrinks, setEstablishmentDrinks] = useState<EstablishmentDrink[]>([]);
  const [sessionEstablishments, setSessionEstablishments] = useState<Establishment[]>([]);
  const [sessionEstablishmentDrinks, setSessionEstablishmentDrinks] = useState<EstablishmentDrink[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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
    fetchEstablishments();
  }, [userId]);

  const fetchEstablishments = async () => {
    setLoading(true);
    
    // Fetch all establishments the user can see (global + their own if logged in)
    const { data: establishmentsData, error: estError } = await supabase
      .from("establishments")
      .select("*")
      .order("name");

    if (estError) {
      console.error("Error fetching establishments:", estError);
      setLoading(false);
      return;
    }

    // Map to our Establishment type
    const mappedEstablishments: Establishment[] = (establishmentsData || []).map(est => ({
      id: est.id,
      name: est.name,
      isGlobal: est.user_id === null,
    }));

    setEstablishments(mappedEstablishments);

    // Fetch all establishment drinks
    const { data: drinksData, error: drinksError } = await supabase
      .from("establishment_drinks")
      .select("*")
      .order("drink_name");

    if (drinksError) {
      console.error("Error fetching establishment drinks:", drinksError);
    } else {
      setEstablishmentDrinks(drinksData || []);
    }

    setLoading(false);
  };

  // Get drinks for a specific establishment
  const getEstablishmentDrinks = (establishmentId: string): EstablishmentDrink[] => {
    // Check session establishments first
    const sessionDrinks = sessionEstablishmentDrinks.filter(d => d.establishment_id === establishmentId);
    if (sessionDrinks.length > 0) return sessionDrinks;
    
    // Then check database establishments
    return establishmentDrinks.filter(d => d.establishment_id === establishmentId);
  };

  // Get global establishments (Wetherspoons)
  const getGlobalEstablishments = (): Establishment[] => {
    return establishments.filter(e => e.isGlobal);
  };

  // Get user establishments (non-global)
  const getUserEstablishments = (): Establishment[] => {
    return establishments.filter(e => !e.isGlobal);
  };

  // Add a session-only establishment (for guests uploading menus)
  const addSessionEstablishment = (name: string, drinks: Omit<EstablishmentDrink, 'id' | 'establishment_id'>[]) => {
    const sessionEstId = `session-${Date.now()}`;
    const newEstablishment: Establishment = {
      id: sessionEstId,
      name,
      isGlobal: false,
      isSessionOnly: true,
    };
    
    const sessionDrinks: EstablishmentDrink[] = drinks.map((drink, index) => ({
      ...drink,
      id: `session-drink-${Date.now()}-${index}`,
      establishment_id: sessionEstId,
    }));

    setSessionEstablishments(prev => [...prev, newEstablishment]);
    setSessionEstablishmentDrinks(prev => [...prev, ...sessionDrinks]);

    return sessionEstId;
  };

  // Clear session establishments
  const clearSessionEstablishments = () => {
    setSessionEstablishments([]);
    setSessionEstablishmentDrinks([]);
  };

  // Get all searchable drinks (for search functionality)
  const getAllSearchableDrinks = () => {
    const dbDrinks = establishmentDrinks.map(d => ({
      name: d.drink_name,
      abv: d.abv,
      category: d.category,
      establishmentId: d.establishment_id,
      establishmentName: establishments.find(e => e.id === d.establishment_id)?.name || "Unknown",
      isSessionOnly: false,
    }));

    const sessionDrinks = sessionEstablishmentDrinks.map(d => ({
      name: d.drink_name,
      abv: d.abv,
      category: d.category,
      establishmentId: d.establishment_id,
      establishmentName: sessionEstablishments.find(e => e.id === d.establishment_id)?.name || "Unknown",
      isSessionOnly: true,
    }));

    return [...dbDrinks, ...sessionDrinks];
  };

  // Combine all establishments (database + session)
  const allEstablishments = [...establishments, ...sessionEstablishments];

  return {
    establishments: allEstablishments,
    loading,
    isLoggedIn: !!userId,
    getEstablishmentDrinks,
    getGlobalEstablishments,
    getUserEstablishments,
    sessionEstablishments,
    addSessionEstablishment,
    clearSessionEstablishments,
    getAllSearchableDrinks,
    refetch: fetchEstablishments,
  };
};
