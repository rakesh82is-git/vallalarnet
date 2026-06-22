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
      campaign_updates: {
        Row: {
          content_en: string | null
          content_ta: string | null
          created_at: string
          external_url: string | null
          fieldwork_event_id: string | null
          gallery_item_id: string | null
          id: string
          is_pinned: boolean
          media_url: string | null
          status: string
          title_en: string | null
          title_ta: string | null
        }
        Insert: {
          content_en?: string | null
          content_ta?: string | null
          created_at?: string
          external_url?: string | null
          fieldwork_event_id?: string | null
          gallery_item_id?: string | null
          id?: string
          is_pinned?: boolean
          media_url?: string | null
          status?: string
          title_en?: string | null
          title_ta?: string | null
        }
        Update: {
          content_en?: string | null
          content_ta?: string | null
          created_at?: string
          external_url?: string | null
          fieldwork_event_id?: string | null
          gallery_item_id?: string | null
          id?: string
          is_pinned?: boolean
          media_url?: string | null
          status?: string
          title_en?: string | null
          title_ta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_updates_fieldwork_event_id_fkey"
            columns: ["fieldwork_event_id"]
            isOneToOne: false
            referencedRelation: "fieldwork_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_updates_gallery_item_id_fkey"
            columns: ["gallery_item_id"]
            isOneToOne: false
            referencedRelation: "gallery_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fieldwork_events: {
        Row: {
          caption_en: string | null
          caption_ta: string | null
          created_at: string
          event_date: string | null
          id: string
          location: string | null
          sort_order: number
          title_en: string
          title_ta: string
          updated_at: string
        }
        Insert: {
          caption_en?: string | null
          caption_ta?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          location?: string | null
          sort_order?: number
          title_en: string
          title_ta: string
          updated_at?: string
        }
        Update: {
          caption_en?: string | null
          caption_ta?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          location?: string | null
          sort_order?: number
          title_en?: string
          title_ta?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          kind: Database["public"]["Enums"]["gallery_kind"]
          sort_order: number
          thumb_url: string | null
          title_en: string
          title_ta: string
          url: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["gallery_kind"]
          sort_order?: number
          thumb_url?: string | null
          title_en: string
          title_ta: string
          url: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["gallery_kind"]
          sort_order?: number
          thumb_url?: string | null
          title_en?: string
          title_ta?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "fieldwork_events"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          age: number | null
          consent: boolean
          country: string | null
          created_at: string
          district: string | null
          document_title: string | null
          email: string | null
          full_name: string | null
          id: string
          kind: Database["public"]["Enums"]["signature_kind"] | null
          manual_document_url: string | null
          message: string | null
          mobile_number: string | null
          name: string | null
          phone_hash: string | null
          phone_masked: string | null
          phone_number: string | null
          pincode: string | null
          residential_address: string | null
          scan_url: string | null
          signature_image: string | null
          signature_svg: string | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          age?: number | null
          consent?: boolean
          country?: string | null
          created_at?: string
          district?: string | null
          document_title?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["signature_kind"] | null
          manual_document_url?: string | null
          message?: string | null
          mobile_number?: string | null
          name?: string | null
          phone_hash?: string | null
          phone_masked?: string | null
          phone_number?: string | null
          pincode?: string | null
          residential_address?: string | null
          scan_url?: string | null
          signature_image?: string | null
          signature_svg?: string | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          age?: number | null
          consent?: boolean
          country?: string | null
          created_at?: string
          district?: string | null
          document_title?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["signature_kind"] | null
          manual_document_url?: string | null
          message?: string | null
          mobile_number?: string | null
          name?: string | null
          phone_hash?: string | null
          phone_masked?: string | null
          phone_number?: string | null
          pincode?: string | null
          residential_address?: string | null
          scan_url?: string | null
          signature_image?: string | null
          signature_svg?: string | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gallery_kind: "photo" | "video" | "fieldwork"
      signature_kind: "digital" | "manual"
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
      gallery_kind: ["photo", "video", "fieldwork"],
      signature_kind: ["digital", "manual"],
    },
  },
} as const
