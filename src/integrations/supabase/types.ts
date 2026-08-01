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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_plans: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          prompt: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          prompt?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          prompt?: string
          title?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          id: string
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          student_id: string
          token_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id: string
          token_code?: string
        }
        Update: {
          created_at?: string
          id?: string
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          student_id?: string
          token_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "meal_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          booking_id: string
          checked_in_at: string
          id: string
          method: string
          slot_id: string
          student_id: string
        }
        Insert: {
          booking_id: string
          checked_in_at?: string
          id?: string
          method?: string
          slot_id: string
          student_id: string
        }
        Update: {
          booking_id?: string
          checked_in_at?: string
          id?: string
          method?: string
          slot_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "meal_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_slots: {
        Row: {
          booking_cutoff_minutes: number
          capacity: number
          created_at: string
          end_time: string
          id: string
          meal: Database["public"]["Enums"]["meal_type"]
          menu: string
          slot_date: string
          start_time: string
        }
        Insert: {
          booking_cutoff_minutes?: number
          capacity?: number
          created_at?: string
          end_time: string
          id?: string
          meal: Database["public"]["Enums"]["meal_type"]
          menu?: string
          slot_date: string
          start_time: string
        }
        Update: {
          booking_cutoff_minutes?: number
          capacity?: number
          created_at?: string
          end_time?: string
          id?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          menu?: string
          slot_date?: string
          start_time?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closes_at: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          meal: Database["public"]["Enums"]["meal_type"] | null
          target_day: string | null
          title: string
        }
        Insert: {
          closes_at?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          meal?: Database["public"]["Enums"]["meal_type"] | null
          target_day?: string | null
          title: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          meal?: Database["public"]["Enums"]["meal_type"] | null
          target_day?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          hostel: string | null
          id: string
          phone: string | null
          roll_number: string | null
          room_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          hostel?: string | null
          id: string
          phone?: string | null
          roll_number?: string | null
          room_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          hostel?: string | null
          id?: string
          phone?: string | null
          roll_number?: string | null
          room_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_reply: string | null
          booking_id: string
          comment: string
          created_at: string
          emoji: string | null
          hygiene: number
          id: string
          image_url: string | null
          is_anonymous: boolean
          overall: number
          quantity: number
          replied_at: string | null
          slot_id: string
          student_id: string
          taste: number
          temperature: number
        }
        Insert: {
          admin_reply?: string | null
          booking_id: string
          comment?: string
          created_at?: string
          emoji?: string | null
          hygiene: number
          id?: string
          image_url?: string | null
          is_anonymous?: boolean
          overall: number
          quantity: number
          replied_at?: string | null
          slot_id: string
          student_id: string
          taste: number
          temperature: number
        }
        Update: {
          admin_reply?: string | null
          booking_id?: string
          comment?: string
          created_at?: string
          emoji?: string | null
          hygiene?: number
          id?: string
          image_url?: string | null
          is_anonymous?: boolean
          overall?: number
          quantity?: number
          replied_at?: string | null
          slot_id?: string
          student_id?: string
          taste?: number
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "meal_slots"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_poll_results: {
        Args: never
        Returns: {
          label: string
          option_id: string
          poll_id: string
          votes: number
        }[]
      }
      get_slot_availability: {
        Args: { _from?: string; _to?: string }
        Returns: {
          booked_seats: number
          booking_cutoff_minutes: number
          capacity: number
          checked_in_count: number
          end_time: string
          meal: Database["public"]["Enums"]["meal_type"]
          menu: string
          remaining_seats: number
          slot_date: string
          slot_id: string
          start_time: string
        }[]
      }
      get_slot_rating_stats: {
        Args: never
        Returns: {
          avg_hygiene: number
          avg_overall: number
          avg_quantity: number
          avg_taste: number
          avg_temperature: number
          meal: Database["public"]["Enums"]["meal_type"]
          menu: string
          review_count: number
          slot_date: string
          slot_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      redeem_token: { Args: { _token_code: string }; Returns: string }
    }
    Enums: {
      app_role: "student" | "admin"
      booking_status: "booked" | "cancelled" | "attended"
      meal_type: "breakfast" | "lunch" | "dinner"
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
      app_role: ["student", "admin"],
      booking_status: ["booked", "cancelled", "attended"],
      meal_type: ["breakfast", "lunch", "dinner"],
    },
  },
} as const
