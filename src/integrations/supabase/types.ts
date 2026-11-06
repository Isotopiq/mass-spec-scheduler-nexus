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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          s3_bucket_display: string | null
          s3_endpoint_display: string | null
          s3_path_prefix: string
          s3_uploads_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          s3_bucket_display?: string | null
          s3_endpoint_display?: string | null
          s3_path_prefix?: string
          s3_uploads_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          s3_bucket_display?: string | null
          s3_endpoint_display?: string | null
          s3_path_prefix?: string
          s3_uploads_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          details: string | null
          end_time: string
          id: string
          instrument_id: string
          purpose: string
          sequence_file_key: string | null
          sequence_file_name: string | null
          sequence_file_size: number | null
          sequence_file_uploaded_at: string | null
          start_time: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          end_time: string
          id?: string
          instrument_id: string
          purpose: string
          sequence_file_key?: string | null
          sequence_file_name?: string | null
          sequence_file_size?: number | null
          sequence_file_uploaded_at?: string | null
          start_time: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          end_time?: string
          id?: string
          instrument_id?: string
          purpose?: string
          sequence_file_key?: string | null
          sequence_file_name?: string | null
          sequence_file_size?: number | null
          sequence_file_uploaded_at?: string | null
          start_time?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          booking_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          html_content: string
          id: string
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      instruments: {
        Row: {
          calibration_due: string | null
          created_at: string
          description: string
          id: string
          image: string | null
          location: string
          model: string | null
          name: string
          specifications: string
          status: string
          type: string | null
        }
        Insert: {
          calibration_due?: string | null
          created_at?: string
          description: string
          id?: string
          image?: string | null
          location: string
          model?: string | null
          name: string
          specifications: string
          status: string
          type?: string | null
        }
        Update: {
          calibration_due?: string | null
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          location?: string
          model?: string | null
          name?: string
          specifications?: string
          status?: string
          type?: string | null
        }
        Relationships: []
      }
      maintenance_history: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          instrument_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description: string
          id?: string
          instrument_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          instrument_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_history_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          department: string | null
          email: string
          id: string
          name: string
          profile_image: string | null
          role: string
        }
        Insert: {
          department?: string | null
          email: string
          id: string
          name: string
          profile_image?: string | null
          role: string
        }
        Update: {
          department?: string | null
          email?: string
          id?: string
          name?: string
          profile_image?: string | null
          role?: string
        }
        Relationships: []
      }
      schedule_delay_bookings: {
        Row: {
          booking_id: string
          created_at: string
          delay_id: string
          id: string
          new_end: string
          new_start: string
          original_end: string
          original_start: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          delay_id: string
          id?: string
          new_end: string
          new_start: string
          original_end: string
          original_start: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          delay_id?: string
          id?: string
          new_end?: string
          new_start?: string
          original_end?: string
          original_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_delay_bookings_delay_id_fkey"
            columns: ["delay_id"]
            isOneToOne: false
            referencedRelation: "schedule_delays"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_delays: {
        Row: {
          affected_count: number
          applied_by: string | null
          applied_by_name: string | null
          created_at: string
          cutoff_time: string
          delay_minutes: number
          id: string
          instrument_id: string | null
          reason: string
          reversed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affected_count?: number
          applied_by?: string | null
          applied_by_name?: string | null
          created_at?: string
          cutoff_time: string
          delay_minutes: number
          id?: string
          instrument_id?: string | null
          reason?: string
          reversed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affected_count?: number
          applied_by?: string | null
          applied_by_name?: string | null
          created_at?: string
          cutoff_time?: string
          delay_minutes?: number
          id?: string
          instrument_id?: string | null
          reason?: string
          reversed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_delays_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          host: string
          id: string
          password: string
          port: number
          updated_at: string
          use_tls: boolean
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string
          host: string
          id?: string
          password: string
          port?: number
          updated_at?: string
          use_tls?: boolean
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          use_tls?: boolean
          username?: string
        }
        Relationships: []
      }
      status_colors: {
        Row: {
          color: string
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          status: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { user_id: string }; Returns: boolean }
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
