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
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          address: string | null
          amount: number | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          scheduled_at: string | null
          service: string
          status: string
          technician_id: string
        }
        Insert: {
          address?: string | null
          amount?: number | null
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          service: string
          status?: string
          technician_id: string
        }
        Update: {
          address?: string | null
          amount?: number | null
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          scheduled_at?: string | null
          service?: string
          status?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          location: string | null
          phone: string | null
          push_token: string | null
          user_type: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          location?: string | null
          phone?: string | null
          push_token?: string | null
          user_type: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          location?: string | null
          phone?: string | null
          push_token?: string | null
          user_type?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          booking_id: string | null
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolver_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_note?: string | null
          booking_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolver_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_note?: string | null
          booking_id?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolver_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolver_id_fkey"
            columns: ["resolver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          customer_id: string
          id: string
          rating: number
          technician_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          rating: number
          technician_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          rating?: number
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          technician_id: string
          trial_ends_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status?: string
          technician_id: string
          trial_ends_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          technician_id?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_profiles: {
        Row: {
          bio: string | null
          certifications_url: string | null
          created_at: string | null
          emirates_id_url: string | null
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          payment_methods: Json | null
          profession: string
          rating: number | null
          service_area: Json | null
          services: Json | null
          total_reviews: number | null
        }
        Insert: {
          bio?: string | null
          certifications_url?: string | null
          created_at?: string | null
          emirates_id_url?: string | null
          hourly_rate?: number | null
          id: string
          is_available?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          payment_methods?: Json | null
          profession: string
          rating?: number | null
          service_area?: Json | null
          services?: Json | null
          total_reviews?: number | null
        }
        Update: {
          bio?: string | null
          certifications_url?: string | null
          created_at?: string | null
          emirates_id_url?: string | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          payment_methods?: Json | null
          profession?: string
          rating?: number | null
          service_area?: Json | null
          services?: Json | null
          total_reviews?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "technician_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_account: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const