export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      establishment_drinks: {
        Row: {
          abv: number | null
          category: string
          category_label: string
          created_at: string
          drink_name: string
          establishment_id: string
          id: string
          price: number | null
          user_id: string | null
          volume: number | null
          volume_unit: string | null
        }
        Insert: {
          abv?: number | null
          category: string
          category_label: string
          created_at?: string
          drink_name: string
          establishment_id: string
          id?: string
          price?: number | null
          user_id?: string | null
          volume?: number | null
          volume_unit?: string | null
        }
        Update: {
          abv?: number | null
          category?: string
          category_label?: string
          created_at?: string
          drink_name?: string
          establishment_id?: string
          id?: string
          price?: number | null
          user_id?: string | null
          volume?: number | null
          volume_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_drinks_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          body_fat: number | null
          created_at: string
          height_cm: number | null
          height_ft: number | null
          height_in: number | null
          height_unit: string | null
          id: string
          metric_type: string | null
          onboarded_at: string | null
          preferences: Json
          sex: string | null
          theme: string
          updated_at: string
          user_id: string
          username: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          body_fat?: number | null
          created_at?: string
          height_cm?: number | null
          height_ft?: number | null
          height_in?: number | null
          height_unit?: string | null
          id?: string
          metric_type?: string | null
          onboarded_at?: string | null
          preferences?: Json
          sex?: string | null
          theme?: string
          updated_at?: string
          user_id: string
          username: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          body_fat?: number | null
          created_at?: string
          height_cm?: number | null
          height_ft?: number | null
          height_in?: number | null
          height_unit?: string | null
          id?: string
          metric_type?: string | null
          onboarded_at?: string | null
          preferences?: Json
          sex?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
          username?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      saved_custom_drinks: {
        Row: {
          abv: number
          created_at: string
          drink_name: string
          id: string
          price: number | null
          serving_ml: number | null
          user_id: string
        }
        Insert: {
          abv: number
          created_at?: string
          drink_name: string
          id?: string
          price?: number | null
          serving_ml?: number | null
          user_id: string
        }
        Update: {
          abv?: number
          created_at?: string
          drink_name?: string
          id?: string
          price?: number | null
          serving_ml?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_drink_overrides: {
        Row: {
          created_at: string
          establishment_drink_id: string
          id: string
          price: number | null
          serving_ml: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_drink_id: string
          id?: string
          price?: number | null
          serving_ml?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_drink_id?: string
          id?: string
          price?: number | null
          serving_ml?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_drink_overrides_establishment_drink_id_fkey"
            columns: ["establishment_drink_id"]
            isOneToOne: false
            referencedRelation: "establishment_drinks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_session_history: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          buzz_level: number
          completed_at: string
          drinks: Json
          duration_minutes: number
          id: string
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          buzz_level: number
          completed_at?: string
          drinks: Json
          duration_minutes: number
          id?: string
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          buzz_level?: number
          completed_at?: string
          drinks?: Json
          duration_minutes?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          buzz_level: number
          drinks: Json
          duration_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          buzz_level: number
          drinks?: Json
          duration_minutes: number
          updated_at?: string
          user_id: string
        }
        Update: {
          buzz_level?: number
          drinks?: Json
          duration_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
