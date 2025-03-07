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
      review_takeaways: {
        Row: {
          id: string
          listing_id: string
          positive_takeaway: string | null
          negative_takeaway: string | null
          review_summary: string | null
          average_rating: number
          review_count: number
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          positive_takeaway?: string | null
          negative_takeaway?: string | null
          review_summary?: string | null
          average_rating: number
          review_count: number
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          listing_id?: string
          positive_takeaway?: string | null
          negative_takeaway?: string | null
          review_summary?: string | null
          average_rating?: number
          review_count?: number
          created_at?: string
          expires_at?: string
        }
      }
      location_videos: {
        Row: {
          id: string
          location_id: string
          video_id: string
          title: string
          channel_name: string
          thumbnail_url: string
          summary: string
          relevance_score: number
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          location_id: string
          video_id: string
          title: string
          channel_name: string
          thumbnail_url: string
          summary: string
          relevance_score: number
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          location_id?: string
          video_id?: string
          title?: string
          channel_name?: string
          thumbnail_url?: string
          summary?: string
          relevance_score?: number
          created_at?: string
          expires_at?: string
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