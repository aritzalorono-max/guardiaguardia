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
      assignment_audit: {
        Row: {
          actor_email: string | null
          assignment_id: string | null
          created_at: string
          cycle_id: string
          date: string
          id: string
          new_doctor_id: string | null
          old_doctor_id: string | null
          service_id: string
        }
        Insert: {
          actor_email?: string | null
          assignment_id?: string | null
          created_at?: string
          cycle_id: string
          date: string
          id?: string
          new_doctor_id?: string | null
          old_doctor_id?: string | null
          service_id: string
        }
        Update: {
          actor_email?: string | null
          assignment_id?: string | null
          created_at?: string
          cycle_id?: string
          date?: string
          id?: string
          new_doctor_id?: string | null
          old_doctor_id?: string | null
          service_id?: string
        }
        Relationships: []
      }
      cycles: {
        Row: {
          created_at: string
          id: string
          months: number
          name: string | null
          service_id: string
          start_month: number
          start_year: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          months: number
          name?: string | null
          service_id: string
          start_month: number
          start_year: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          months?: number
          name?: string | null
          service_id?: string
          start_month?: number
          start_year?: number
          status?: string
        }
        Relationships: []
      }
      guard_assignments: {
        Row: {
          category: Database["public"]["Enums"]["guard_day_category"]
          created_at: string
          cycle_id: string
          date: string
          doctor_id: string | null
          eligible: Database["public"]["Enums"]["slot_eligibility"]
          id: string
          manual: boolean
          modality: Database["public"]["Enums"]["guard_modality"]
          service_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["guard_day_category"]
          created_at?: string
          cycle_id: string
          date: string
          doctor_id?: string | null
          eligible: Database["public"]["Enums"]["slot_eligibility"]
          id?: string
          manual?: boolean
          modality: Database["public"]["Enums"]["guard_modality"]
          service_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["guard_day_category"]
          created_at?: string
          cycle_id?: string
          date?: string
          doctor_id?: string | null
          eligible?: Database["public"]["Enums"]["slot_eligibility"]
          id?: string
          manual?: boolean
          modality?: Database["public"]["Enums"]["guard_modality"]
          service_id?: string
        }
        Relationships: []
      }
      cycle_leaves: {
        Row: {
          created_at: string
          cycle_id: string
          doctor_id: string
          end_date: string
          id: string
          note: string | null
          service_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          doctor_id: string
          end_date: string
          id?: string
          note?: string | null
          service_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
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
      guard_slots: {
        Row: {
          created_at: string
          day_category: Database["public"]["Enums"]["guard_day_category"]
          eligible: Database["public"]["Enums"]["slot_eligibility"]
          id: string
          label: string | null
          modality: Database["public"]["Enums"]["guard_modality"]
          position: number
          service_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          day_category: Database["public"]["Enums"]["guard_day_category"]
          eligible?: Database["public"]["Enums"]["slot_eligibility"]
          id?: string
          label?: string | null
          modality?: Database["public"]["Enums"]["guard_modality"]
          position?: number
          service_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          day_category?: Database["public"]["Enums"]["guard_day_category"]
          eligible?: Database["public"]["Enums"]["slot_eligibility"]
          id?: string
          label?: string | null
          modality?: Database["public"]["Enums"]["guard_modality"]
          position?: number
          service_id?: string
          weight?: number
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
      service_rules: {
        Row: {
          enabled: boolean
          id: string
          rule_key: string
          service_id: string
          updated_at: string
          value: number | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          rule_key: string
          service_id: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          enabled?: boolean
          id?: string
          rule_key?: string
          service_id?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          cycle_id: string
          expires_at: string | null
          id: string
          service_id: string
          token: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          expires_at?: string | null
          id?: string
          service_id: string
          token?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          expires_at?: string | null
          id?: string
          service_id?: string
          token?: string
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
      create_cycle_with_assignments: {
        Args: {
          p_assignments: Json
          p_months: number
          p_name: string | null
          p_service_id: string
          p_start_month: number
          p_start_year: number
        }
        Returns: string
      }
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
      get_shared_cycle: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      doctor_kind: "adjunto" | "residente"
      guard_day_category: "laborable" | "vispera" | "festivo"
      guard_modality: "presencial" | "localizada" | "telefonica"
      membership_role: "admin" | "editor" | "viewer"
      resident_level: "R1" | "R2" | "R3" | "R4" | "R5"
      slot_eligibility: "cualquiera" | "adjunto" | "residente"
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
