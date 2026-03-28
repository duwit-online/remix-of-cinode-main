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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          ad_type: string
          clicks: number
          content_html: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          link_url: string | null
          name: string
          placement: string
          priority: number
          start_date: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ad_type: string
          clicks?: number
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          link_url?: string | null
          name: string
          placement?: string
          priority?: number
          start_date?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ad_type?: string
          clicks?: number
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          link_url?: string | null
          name?: string
          placement?: string
          priority?: number
          start_date?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      affiliate_earnings: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          payment_submission_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          created_at?: string
          id?: string
          payment_submission_id: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          payment_submission_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_earnings_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_payment_submission_id_fkey"
            columns: ["payment_submission_id"]
            isOneToOne: true
            referencedRelation: "payment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          referral_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          referral_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          referral_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      email_config: {
        Row: {
          api_key_encrypted: string | null
          from_email: string
          from_name: string
          id: string
          is_active: boolean
          provider: string
          smtp_host: string | null
          smtp_pass_encrypted: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          provider?: string
          smtp_host?: string | null
          smtp_pass_encrypted?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          provider?: string
          smtp_host?: string | null
          smtp_pass_encrypted?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      media_sources: {
        Row: {
          created_at: string
          created_by: string | null
          episode: number | null
          file_name: string | null
          id: string
          is_active: boolean
          media_type: string
          season: number | null
          source: string
          stream_url: string
          title: string | null
          tmdb_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          episode?: number | null
          file_name?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          season?: number | null
          source?: string
          stream_url: string
          title?: string | null
          tmdb_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          episode?: number | null
          file_name?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          season?: number | null
          source?: string
          stream_url?: string
          title?: string | null
          tmdb_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      movie_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          custom_title: string | null
          custom_url: string | null
          episode: number | null
          id: string
          media_type: string
          season: number | null
          tmdb_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_title?: string | null
          custom_url?: string | null
          episode?: number | null
          id?: string
          media_type: string
          season?: number | null
          tmdb_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_title?: string | null
          custom_url?: string | null
          episode?: number | null
          id?: string
          media_type?: string
          season?: number | null
          tmdb_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
          target: string
          target_user_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message: string
          target?: string
          target_user_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          target?: string
          target_user_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          plan_type: string
          proof_image_url: string | null
          referral_code: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_name: string | null
          status: string
          transaction_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          plan_type: string
          proof_image_url?: string | null
          referral_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_name?: string | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          plan_type?: string
          proof_image_url?: string | null
          referral_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_name?: string | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          referred_user_id: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          referred_user_id: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          referred_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_servers: {
        Row: {
          api_key_encrypted: string
          created_at: string
          created_by: string | null
          id: string
          is_enabled: boolean
          name: string
          priority: number
          server_type: string
          server_url: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          priority?: number
          server_type?: string
          server_url: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          priority?: number
          server_type?: string
          server_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          plan_type: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          plan_type: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          plan_type?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string
          id: string
          media_type: string
          poster_path: string | null
          title: string | null
          tmdb_id: number
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          media_type: string
          poster_path?: string | null
          title?: string | null
          tmdb_id: number
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          media_type?: string
          poster_path?: string | null
          title?: string | null
          tmdb_id?: number
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
