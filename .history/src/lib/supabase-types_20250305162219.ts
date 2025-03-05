export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      saved_reports: {
        Row: {
          id: string
          user_id: string
          listing_url: string
          listing_title: string
          safety_score: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_url: string
          listing_title: string
          safety_score: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_url?: string
          listing_title?: string
          safety_score?: number
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          updated_at: string
          created_at: string
          name: string | null
        }
        Insert: {
          id: string
          email: string
          updated_at?: string
          created_at?: string
          name?: string | null
        }
        Update: {
          id?: string
          email?: string
          updated_at?: string
          created_at?: string
          name?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 