import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { isAdmin: false, userId: null };
      }

      // Check if user has admin role using the has_role function
      const { data: hasAdminRole, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error) {
        console.error("Error checking admin role:", error);
        return { isAdmin: false, userId: user.id };
      }

      return { isAdmin: !!hasAdminRole, userId: user.id };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    userId: data?.userId ?? null,
    isLoading,
  };
};
