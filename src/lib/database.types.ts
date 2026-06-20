export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          created_at: string
          day_type_id: string
          doctor_id: string
          end_date: string
          id: string
          note: string | null
          service_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          day_type_id: string
          doctor_id: string
          end_date: string
          id?: string
          note?: string | null
          service_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          day_type_id?: string
          doctor_id?: string
          end_date?: string
          id?: string
          note?: string | null
          service_id?: string
          start_date?: string
        }
        Relationships: []
      }
      day_types: {
        Row: {
          allows_guard: boolean
          blocks_adjacent: boolean
          color: string
          counts_as_worked: boolean
          created_at: string
          id: string
          is_system: boolean
          name: string
          service_id: string
        }
        Insert: {
          allows_guard: boolean
          blocks_adjacent?: boolean
          color?: string
          counts_as_worked: boolean
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          service_id: string
        }
        Update: {
          allows_guard?: boolean
          blocks_adjacent?: boolean
          color?: string
          counts_as_worked?: boolean
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          service_id?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          created_at: string
          does_guards: boolean
          first_name: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["doctor_kind"]
          last_name: string
          part_time: boolean
          resident_level: Database["public"]["Enums"]["resident_level"] | null
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          does_guards?: boolean
          first_name: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["doctor_kind"]
          last_name: string
          part_time?: boolean
          resident_level?: Database["public"]["Enums"]["resident_level"] | null
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          does_guards?: boolean
          first_name?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["doctor_kind"]
          last_name?: string
          part_time?: boolean
          resident_level?: Database["public"]["Enums"]["resident_level"] | null
          service_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          is_eve: boolean
          name: string | null
          service_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_eve?: boolean
          name?: string | null
          service_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_eve?: boolean
          name?: string | null
          service_id?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          service_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          service_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          service_id?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          approx_doctors: number | null
          created_at: string
          has_residents: boolean
          hospital_name: string
          id: string
          onboarding_completed: boolean
          region: string | null
          specialty: string
          updated_at: string
        }
        Insert: {
          approx_doctors?: number | null
          created_at?: string
          has_residents?: boolean
          hospital_name: string
          id?: string
          onboarding_completed?: boolean
          region?: string | null
          specialty: string
          updated_at?: string
        }
        Update: {
          approx_doctors?: number | null
          created_at?: string
          has_residents?: boolean
          hospital_name?: string
          id?: string
          onboarding_completed?: boolean
          region?: string | null
          specialty?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_service: {
        Args: {
          p_approx_doctors: number
          p_has_residents: boolean
          p_hospital_name: string
          p_region: string
          p_specialty: string
        }
        Returns: string
      }
      is_member_of: { Args: { p_service_id: string }; Returns: boolean }
    }
    Enums: {
      doctor_kind: "adjunto" | "residente"
      membership_role: "admin" | "editor" | "viewer"
      resident_level: "R1" | "R2" | "R3" | "R4" | "R5"
    }
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T]
