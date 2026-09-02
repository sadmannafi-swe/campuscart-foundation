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
      profiles: {
        Row: {
          avatar_path: string | null
          batch: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          batch?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          batch?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_identity: {
        Row: {
          created_at: string
          seller_id: string
          student_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          seller_id: string
          student_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          seller_id?: string
          student_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_identity_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_products: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string
          id: string
          images: Json
          in_stock: boolean
          is_active: boolean
          name: string
          price: number
          store_id: string
          university_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          condition?: string
          created_at?: string
          description?: string
          id?: string
          images?: Json
          in_stock?: boolean
          is_active?: boolean
          name: string
          price: number
          store_id: string
          university_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string
          id?: string
          images?: Json
          in_stock?: boolean
          is_active?: boolean
          name?: string
          price?: number
          store_id?: string
          university_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_products_university_slug_fkey"
            columns: ["university_slug"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["slug"]
          },
        ]
      }
      sellers: {
        Row: {
          avatar_path: string | null
          batch: string
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          phone: string
          status: Database["public"]["Enums"]["store_status"]
          university_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          batch: string
          created_at?: string
          department: string
          email: string
          full_name: string
          id?: string
          phone: string
          status?: Database["public"]["Enums"]["store_status"]
          university_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          batch?: string
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          status?: Database["public"]["Enums"]["store_status"]
          university_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sellers_university_slug_fkey"
            columns: ["university_slug"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["slug"]
          },
        ]
      }
      stores: {
        Row: {
          approved_at: string | null
          category: string
          contact_number: string
          created_at: string
          description: string
          id: string
          logo_path: string | null
          name: string
          rejection_reason: string | null
          seller_id: string
          status: Database["public"]["Enums"]["store_status"]
          university_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          category: string
          contact_number: string
          created_at?: string
          description: string
          id?: string
          logo_path?: string | null
          name: string
          rejection_reason?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["store_status"]
          university_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          category?: string
          contact_number?: string
          created_at?: string
          description?: string
          id?: string
          logo_path?: string | null
          name?: string
          rejection_reason?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["store_status"]
          university_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_university_slug_fkey"
            columns: ["university_slug"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["slug"]
          },
        ]
      }
      student_identity: {
        Row: {
          created_at: string
          student_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          student_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          student_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          created_at: string
          is_active: boolean
          name: string
          short_name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          name: string
          short_name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          is_active?: boolean
          name?: string
          short_name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      store_status: "pending" | "approved" | "rejected" | "suspended"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      store_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
