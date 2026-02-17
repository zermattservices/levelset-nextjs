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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          org_id: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          employee_id: string | null
          first_name: string
          id: string
          last_name: string
          location_id: string | null
          nickname: string | null
          org_id: string | null
          permission_profile_id: string | null
          permissions: string | null
          profile_image: string | null
          role: string
          temp_password: string | null
          use_role_default: boolean | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          employee_id?: string | null
          first_name: string
          id?: string
          last_name: string
          location_id?: string | null
          nickname?: string | null
          org_id?: string | null
          permission_profile_id?: string | null
          permissions?: string | null
          profile_image?: string | null
          role: string
          temp_password?: string | null
          use_role_default?: boolean | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          employee_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          location_id?: string | null
          nickname?: string | null
          org_id?: string | null
          permission_profile_id?: string | null
          permissions?: string | null
          profile_image?: string | null
          role?: string
          temp_password?: string | null
          use_role_default?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "app_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "app_users_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_app_users_org_loc"
            columns: ["org_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      certification_audit: {
        Row: {
          all_positions_qualified: boolean
          audit_date: string
          created_at: string | null
          employee_id: string
          employee_name: string | null
          id: string
          location_id: string
          notes: string | null
          org_id: string
          position_averages: Json
          status_after: string
          status_before: string
        }
        Insert: {
          all_positions_qualified: boolean
          audit_date: string
          created_at?: string | null
          employee_id: string
          employee_name?: string | null
          id?: string
          location_id: string
          notes?: string | null
          org_id: string
          position_averages?: Json
          status_after: string
          status_before: string
        }
        Update: {
          all_positions_qualified?: boolean
          audit_date?: string
          created_at?: string | null
          employee_id?: string
          employee_name?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          position_averages?: Json
          status_after?: string
          status_before?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "certification_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "certification_audit_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_audit_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      cfa_locations: {
        Row: {
          created_at: string | null
          id: string
          location_name: string | null
          location_num: string | null
          open_date: string | null
          operator: string | null
          state: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_name?: string | null
          location_num?: string | null
          open_date?: string | null
          operator?: string | null
          state?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_name?: string | null
          location_num?: string | null
          open_date?: string | null
          operator?: string | null
          state?: string | null
          type?: string | null
        }
        Relationships: []
      }
      daily_position_averages: {
        Row: {
          calculation_date: string
          created_at: string | null
          employee_id: string
          id: string
          location_id: string
          org_id: string
          position_averages: Json
        }
        Insert: {
          calculation_date: string
          created_at?: string | null
          employee_id: string
          id?: string
          location_id: string
          org_id: string
          position_averages?: Json
        }
        Update: {
          calculation_date?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          location_id?: string
          org_id?: string
          position_averages?: Json
        }
        Relationships: [
          {
            foreignKeyName: "daily_position_averages_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "daily_position_averages_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_position_averages_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "daily_position_averages_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_position_averages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      disc_actions: {
        Row: {
          acting_leader: string | null
          action: string | null
          action_date: string | null
          action_id: string
          created_at: string
          employee_id: string
          employee_name: string | null
          id: string
          leader_name: string | null
          location_id: string | null
          notes: string | null
          org_id: string | null
        }
        Insert: {
          acting_leader?: string | null
          action?: string | null
          action_date?: string | null
          action_id: string
          created_at?: string
          employee_id: string
          employee_name?: string | null
          id?: string
          leader_name?: string | null
          location_id?: string | null
          notes?: string | null
          org_id?: string | null
        }
        Update: {
          acting_leader?: string | null
          action?: string | null
          action_date?: string | null
          action_id?: string
          created_at?: string
          employee_id?: string
          employee_name?: string | null
          id?: string
          leader_name?: string | null
          location_id?: string | null
          notes?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disc_actions_acting_leader_fkey"
            columns: ["acting_leader"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "disc_actions_acting_leader_fkey"
            columns: ["acting_leader"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_actions_acting_leader_fkey"
            columns: ["acting_leader"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "disc_actions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "disc_actions_rubric"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "disc_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "disc_actions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      disc_actions_rubric: {
        Row: {
          action: string | null
          created_at: string
          id: string
          location_id: string | null
          org_id: string
          points_threshold: number | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          org_id: string
          points_threshold?: number | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          org_id?: string
          points_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "disc_actions_rubric_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_actions_rubric_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_actions_rubric_org_id_fkey1"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_role_access: {
        Row: {
          can_submit: boolean | null
          created_at: string | null
          id: string
          org_id: string
          role_name: string
          updated_at: string | null
        }
        Insert: {
          can_submit?: boolean | null
          created_at?: string | null
          id?: string
          org_id: string
          role_name: string
          updated_at?: string | null
        }
        Update: {
          can_submit?: boolean | null
          created_at?: string | null
          id?: string
          org_id?: string
          role_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discipline_role_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          availability: Database["public"]["Enums"]["availability_type"] | null
          birth_date: string | null
          calculated_pay: number | null
          certified_status: string
          consolidated_employee_id: string | null
          created_at: string
          email: string | null
          first_name: string
          full_name: string | null
          hire_date: string | null
          hs_id: number | null
          id: string
          is_boh: boolean
          is_foh: boolean
          is_leader: boolean | null
          is_trainer: boolean | null
          last_name: string | null
          last_points_total: number | null
          location_id: string
          org_id: string
          payroll_name: string | null
          phone: string | null
          role: string
          termination_date: string | null
          termination_reason: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          availability?: Database["public"]["Enums"]["availability_type"] | null
          birth_date?: string | null
          calculated_pay?: number | null
          certified_status?: string
          consolidated_employee_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          full_name?: string | null
          hire_date?: string | null
          hs_id?: number | null
          id?: string
          is_boh?: boolean
          is_foh?: boolean
          is_leader?: boolean | null
          is_trainer?: boolean | null
          last_name?: string | null
          last_points_total?: number | null
          location_id: string
          org_id: string
          payroll_name?: string | null
          phone?: string | null
          role: string
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          availability?: Database["public"]["Enums"]["availability_type"] | null
          birth_date?: string | null
          calculated_pay?: number | null
          certified_status?: string
          consolidated_employee_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          full_name?: string | null
          hire_date?: string | null
          hs_id?: number | null
          id?: string
          is_boh?: boolean
          is_foh?: boolean
          is_leader?: boolean | null
          is_trainer?: boolean | null
          last_name?: string | null
          last_points_total?: number | null
          location_id?: string
          org_id?: string
          payroll_name?: string | null
          phone?: string | null
          role?: string
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_consolidated_employee_id_fkey"
            columns: ["consolidated_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_consolidated_employee_id_fkey"
            columns: ["consolidated_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_consolidated_employee_id_fkey"
            columns: ["consolidated_employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_employees_org_loc"
            columns: ["org_id", "location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["org_id", "id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          employee_id: string | null
          employee_name: string
          evaluation_date: string | null
          id: string
          leader_id: string | null
          leader_name: string | null
          location_id: string | null
          month: string
          notes: string | null
          org_id: string | null
          rating_status: boolean
          role: string | null
          state_after: string | null
          state_before: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          employee_name: string
          evaluation_date?: string | null
          id?: string
          leader_id?: string | null
          leader_name?: string | null
          location_id?: string | null
          month: string
          notes?: string | null
          org_id?: string | null
          rating_status?: boolean
          role?: string | null
          state_after?: string | null
          state_before?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          evaluation_date?: string | null
          id?: string
          leader_id?: string | null
          leader_name?: string | null
          location_id?: string | null
          month?: string
          notes?: string | null
          org_id?: string | null
          rating_status?: boolean
          role?: string | null
          state_after?: string | null
          state_before?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "evaluations_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "evaluations_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "evaluations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      google_reviews: {
        Row: {
          ai_analyzed_at: string | null
          ai_summary: string | null
          ai_tags: Json | null
          author_name: string | null
          author_photo_url: string | null
          author_uri: string | null
          created_at: string
          first_synced_at: string
          google_maps_uri: string | null
          google_review_name: string
          id: string
          last_synced_at: string
          location_id: string
          mentioned_employee_ids: Json | null
          org_id: string
          original_language: string | null
          original_text: string | null
          pillar_score_applied: boolean | null
          publish_time: string
          rating: number
          relative_time_description: string | null
          review_language: string | null
          review_text: string | null
          sentiment_score: number | null
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_summary?: string | null
          ai_tags?: Json | null
          author_name?: string | null
          author_photo_url?: string | null
          author_uri?: string | null
          created_at?: string
          first_synced_at?: string
          google_maps_uri?: string | null
          google_review_name: string
          id?: string
          last_synced_at?: string
          location_id: string
          mentioned_employee_ids?: Json | null
          org_id: string
          original_language?: string | null
          original_text?: string | null
          pillar_score_applied?: boolean | null
          publish_time: string
          rating: number
          relative_time_description?: string | null
          review_language?: string | null
          review_text?: string | null
          sentiment_score?: number | null
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_summary?: string | null
          ai_tags?: Json | null
          author_name?: string | null
          author_photo_url?: string | null
          author_uri?: string | null
          created_at?: string
          first_synced_at?: string
          google_maps_uri?: string | null
          google_review_name?: string
          id?: string
          last_synced_at?: string
          location_id?: string
          mentioned_employee_ids?: Json | null
          org_id?: string
          original_language?: string | null
          original_text?: string | null
          pillar_score_applied?: boolean | null
          publish_time?: string
          rating?: number
          relative_time_description?: string | null
          review_language?: string | null
          review_text?: string | null
          sentiment_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "google_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_sync_notifications: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          org_id: string
          sync_data: Json
          viewed: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          org_id: string
          sync_data: Json
          viewed?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          org_id?: string
          sync_data?: Json
          viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hs_sync_notifications_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_sync_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      infraction_documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          infraction_id: string
          location_id: string
          org_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          infraction_id: string
          location_id: string
          org_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          infraction_id?: string
          location_id?: string
          org_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infraction_documents_infraction_id_fkey"
            columns: ["infraction_id"]
            isOneToOne: false
            referencedRelation: "infractions"
            referencedColumns: ["id"]
          },
        ]
      }
      infractions: {
        Row: {
          ack_bool: boolean | null
          acknowledgement: string | null
          created_at: string
          employee_id: string | null
          employee_name: string | null
          id: string
          infraction: string | null
          infraction_date: string | null
          leader_id: string | null
          leader_name: string | null
          leader_signature: string | null
          location_id: string | null
          notes: string | null
          org_id: string | null
          points: number | null
          team_member_signature: string | null
        }
        Insert: {
          ack_bool?: boolean | null
          acknowledgement?: string | null
          created_at?: string
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          infraction?: string | null
          infraction_date?: string | null
          leader_id?: string | null
          leader_name?: string | null
          leader_signature?: string | null
          location_id?: string | null
          notes?: string | null
          org_id?: string | null
          points?: number | null
          team_member_signature?: string | null
        }
        Update: {
          ack_bool?: boolean | null
          acknowledgement?: string | null
          created_at?: string
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          infraction?: string | null
          infraction_date?: string | null
          leader_id?: string | null
          leader_name?: string | null
          leader_signature?: string | null
          location_id?: string | null
          notes?: string | null
          org_id?: string | null
          points?: number | null
          team_member_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infractions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "infractions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infractions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "infractions_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "infractions_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infractions_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "infractions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infractions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      infractions_rubric: {
        Row: {
          action: string | null
          action_es: string | null
          created_at: string
          id: string
          location_id: string | null
          org_id: string
          points: number | null
          require_leader_signature: boolean | null
          require_tm_signature: boolean | null
        }
        Insert: {
          action?: string | null
          action_es?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          org_id: string
          points?: number | null
          require_leader_signature?: boolean | null
          require_tm_signature?: boolean | null
        }
        Update: {
          action?: string | null
          action_es?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          org_id?: string
          points?: number | null
          require_leader_signature?: boolean | null
          require_tm_signature?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "disc_rubric_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disc_rubric_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      levi_config: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "levi_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      location_business_hours: {
        Row: {
          close_hour: number
          close_minute: number
          created_at: string | null
          day_of_week: number
          id: string
          location_id: string
          open_hour: number
          open_minute: number
          period_index: number
          updated_at: string | null
        }
        Insert: {
          close_hour: number
          close_minute: number
          created_at?: string | null
          day_of_week: number
          id?: string
          location_id: string
          open_hour: number
          open_minute: number
          period_index?: number
          updated_at?: string | null
        }
        Update: {
          close_hour?: number
          close_minute?: number
          created_at?: string | null
          day_of_week?: number
          id?: string
          location_id?: string
          open_hour?: number
          open_minute?: number
          period_index?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_business_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_role_hierarchy: {
        Row: {
          created_at: string
          hierarchy_level: number
          id: string
          is_leader: boolean
          is_trainer: boolean
          location_id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hierarchy_level: number
          id?: string
          is_leader?: boolean
          is_trainer?: boolean
          location_id: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hierarchy_level?: number
          id?: string
          is_leader?: boolean
          is_trainer?: boolean
          location_id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_role_hierarchy_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          discipline_password: string | null
          google_hours_display: Json | null
          google_last_synced_at: string | null
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          has_synced_before: boolean | null
          id: string
          image_url: string | null
          latitude: number | null
          location_mobile_token: string | null
          location_number: string
          location_type: string | null
          longitude: number | null
          name: string
          operator: string | null
          org_id: string
          phone: string | null
          yelp_biz_id: string | null
          yelp_business_url: string | null
          yelp_last_synced_at: string | null
          yelp_rating: number | null
          yelp_review_count: number | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          discipline_password?: string | null
          google_hours_display?: Json | null
          google_last_synced_at?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          has_synced_before?: boolean | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_mobile_token?: string | null
          location_number: string
          location_type?: string | null
          longitude?: number | null
          name: string
          operator?: string | null
          org_id: string
          phone?: string | null
          yelp_biz_id?: string | null
          yelp_business_url?: string | null
          yelp_last_synced_at?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          discipline_password?: string | null
          google_hours_display?: Json | null
          google_last_synced_at?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          has_synced_before?: boolean | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location_mobile_token?: string | null
          location_number?: string
          location_type?: string | null
          longitude?: number | null
          name?: string
          operator?: string | null
          org_id?: string
          phone?: string | null
          yelp_biz_id?: string | null
          yelp_business_url?: string | null
          yelp_last_synced_at?: string | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      oe_pillars: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          name: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order: number
          id?: string
          name: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          weight?: number | null
        }
        Relationships: []
      }
      org_feature_toggles: {
        Row: {
          created_at: string
          custom_roles: Json | null
          enable_certified_status: boolean
          enable_evaluations: boolean
          enable_pip_logic: boolean
          id: string
          org_id: string
          require_rating_comments: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_roles?: Json | null
          enable_certified_status?: boolean
          enable_evaluations?: boolean
          enable_pip_logic?: boolean
          id?: string
          org_id: string
          require_rating_comments?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_roles?: Json | null
          enable_certified_status?: boolean
          enable_evaluations?: boolean
          enable_pip_logic?: boolean
          id?: string
          org_id?: string
          require_rating_comments?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_feature_toggles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_features: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          feature_key: string
          id: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          feature_key: string
          id?: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          feature_key?: string
          id?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_features_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_pay_config: {
        Row: {
          availability_description: string | null
          created_at: string
          has_availability_rules: boolean
          has_certification_rules: boolean
          has_zone_rules: boolean
          id: string
          org_id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          availability_description?: string | null
          created_at?: string
          has_availability_rules?: boolean
          has_certification_rules?: boolean
          has_zone_rules?: boolean
          id?: string
          org_id: string
          role_name: string
          updated_at?: string
        }
        Update: {
          availability_description?: string | null
          created_at?: string
          has_availability_rules?: boolean
          has_certification_rules?: boolean
          has_zone_rules?: boolean
          id?: string
          org_id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_pay_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_pay_rates: {
        Row: {
          availability: string | null
          created_at: string
          hourly_rate: number
          id: string
          is_certified: boolean
          org_id: string
          role_name: string
          updated_at: string
          zone: string | null
        }
        Insert: {
          availability?: string | null
          created_at?: string
          hourly_rate?: number
          id?: string
          is_certified?: boolean
          org_id: string
          role_name: string
          updated_at?: string
          zone?: string | null
        }
        Update: {
          availability?: string | null
          created_at?: string
          hourly_rate?: number
          id?: string
          is_certified?: boolean
          org_id?: string
          role_name?: string
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_pay_rates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_positions: {
        Row: {
          created_at: string
          description: string | null
          description_es: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          name_es: string | null
          org_id: string
          updated_at: string
          zone: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_es?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          name_es?: string | null
          org_id: string
          updated_at?: string
          zone: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_es?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          name_es?: string | null
          org_id?: string
          updated_at?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_positions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          color: string
          created_at: string | null
          hierarchy_level: number
          id: string
          is_leader: boolean
          is_trainer: boolean
          org_id: string
          role_name: string
          updated_at: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          hierarchy_level: number
          id?: string
          is_leader?: boolean
          is_trainer?: boolean
          org_id: string
          role_name: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          hierarchy_level?: number
          id?: string
          is_leader?: boolean
          is_trainer?: boolean
          org_id?: string
          role_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
          operator_name: string | null
          start_date: string | null
          state: string | null
          subscription_plan: string | null
          team_member_website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          operator_name?: string | null
          start_date?: string | null
          state?: string | null
          subscription_plan?: string | null
          team_member_website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          operator_name?: string | null
          start_date?: string | null
          state?: string | null
          subscription_plan?: string | null
          team_member_website?: string | null
        }
        Relationships: []
      }
      payroll_sync_notifications: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          org_id: string
          sync_data: Json
          viewed: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          org_id: string
          sync_data: Json
          viewed?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          org_id?: string
          sync_data?: Json
          viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_sync_notifications_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_sync_notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_modules: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          key: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          key: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
        }
        Relationships: []
      }
      permission_profile_access: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean
          profile_id: string
          sub_item_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          profile_id: string
          sub_item_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          profile_id?: string
          sub_item_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_profile_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_profile_access_sub_item_id_fkey"
            columns: ["sub_item_id"]
            isOneToOne: false
            referencedRelation: "permission_sub_items"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          created_at: string | null
          hierarchy_level: number
          id: string
          is_admin_profile: boolean | null
          is_system_default: boolean | null
          linked_role_name: string | null
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hierarchy_level: number
          id?: string
          is_admin_profile?: boolean | null
          is_system_default?: boolean | null
          linked_role_name?: string | null
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hierarchy_level?: number
          id?: string
          is_admin_profile?: boolean | null
          is_system_default?: boolean | null
          linked_role_name?: string | null
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_sub_items: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          key: string
          module_id: string
          name: string
          requires_sub_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order: number
          id?: string
          key: string
          module_id: string
          name: string
          requires_sub_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          key?: string
          module_id?: string
          name?: string
          requires_sub_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_sub_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "permission_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_sub_items_requires_sub_item_id_fkey"
            columns: ["requires_sub_item_id"]
            isOneToOne: false
            referencedRelation: "permission_sub_items"
            referencedColumns: ["id"]
          },
        ]
      }
      position_big5_labels: {
        Row: {
          created_at: string | null
          id: string
          label_1: string
          label_1_es: string | null
          label_2: string
          label_2_es: string | null
          label_3: string
          label_3_es: string | null
          label_4: string
          label_4_es: string | null
          label_5: string
          label_5_es: string | null
          location_id: string
          org_id: string
          position: string
          position_es: string | null
          updated_at: string | null
          zone: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label_1: string
          label_1_es?: string | null
          label_2: string
          label_2_es?: string | null
          label_3: string
          label_3_es?: string | null
          label_4: string
          label_4_es?: string | null
          label_5: string
          label_5_es?: string | null
          location_id: string
          org_id: string
          position: string
          position_es?: string | null
          updated_at?: string | null
          zone: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label_1?: string
          label_1_es?: string | null
          label_2?: string
          label_2_es?: string | null
          label_3?: string
          label_3_es?: string | null
          label_4?: string
          label_4_es?: string | null
          label_5?: string
          label_5_es?: string | null
          location_id?: string
          org_id?: string
          position?: string
          position_es?: string | null
          updated_at?: string | null
          zone?: string
        }
        Relationships: []
      }
      position_criteria: {
        Row: {
          created_at: string
          criteria_order: number
          description: string | null
          description_es: string | null
          id: string
          name: string
          name_es: string | null
          pillar_1_id: string | null
          pillar_2_id: string | null
          position_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria_order: number
          description?: string | null
          description_es?: string | null
          id?: string
          name: string
          name_es?: string | null
          pillar_1_id?: string | null
          pillar_2_id?: string | null
          position_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria_order?: number
          description?: string | null
          description_es?: string | null
          id?: string
          name?: string
          name_es?: string | null
          pillar_1_id?: string | null
          pillar_2_id?: string | null
          position_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_criteria_pillar_1_id_fkey"
            columns: ["pillar_1_id"]
            isOneToOne: false
            referencedRelation: "oe_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_criteria_pillar_2_id_fkey"
            columns: ["pillar_2_id"]
            isOneToOne: false
            referencedRelation: "oe_pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_criteria_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      position_role_permissions: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          is_locked: boolean
          position_id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          is_locked?: boolean
          position_id: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          is_locked?: boolean
          position_id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_role_permissions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_thresholds: {
        Row: {
          created_at: string
          green_threshold: number
          id: string
          location_id: string | null
          org_id: string | null
          updated_at: string
          yellow_threshold: number
        }
        Insert: {
          created_at?: string
          green_threshold?: number
          id?: string
          location_id?: string | null
          org_id?: string | null
          updated_at?: string
          yellow_threshold?: number
        }
        Update: {
          created_at?: string
          green_threshold?: number
          id?: string
          location_id?: string | null
          org_id?: string | null
          updated_at?: string
          yellow_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_rating_thresholds_location"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_thresholds_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          location_id: string
          notes: string | null
          org_id: string
          position: string
          position_id: string | null
          rater_user_id: string
          rating_1: number | null
          rating_2: number | null
          rating_3: number | null
          rating_4: number | null
          rating_5: number | null
          rating_avg: number | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          location_id: string
          notes?: string | null
          org_id: string
          position: string
          position_id?: string | null
          rater_user_id: string
          rating_1?: number | null
          rating_2?: number | null
          rating_3?: number | null
          rating_4?: number | null
          rating_5?: number | null
          rating_avg?: number | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          position?: string
          position_id?: string | null
          rater_user_id?: string
          rating_1?: number | null
          rating_2?: number | null
          rating_3?: number | null
          rating_4?: number | null
          rating_5?: number | null
          rating_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ratings_location"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ratings_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "ratings_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "ratings_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_user_id_fkey"
            columns: ["rater_user_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      recommended_disc_actions: {
        Row: {
          action_taken: string | null
          action_taken_at: string | null
          action_taken_by: string | null
          created_at: string | null
          disc_action_id: string | null
          employee_id: string
          id: string
          location_id: string
          org_id: string
          points_when_recommended: number
          recommended_action: string
          recommended_action_id: string
        }
        Insert: {
          action_taken?: string | null
          action_taken_at?: string | null
          action_taken_by?: string | null
          created_at?: string | null
          disc_action_id?: string | null
          employee_id: string
          id?: string
          location_id: string
          org_id: string
          points_when_recommended?: number
          recommended_action: string
          recommended_action_id: string
        }
        Update: {
          action_taken?: string | null
          action_taken_at?: string | null
          action_taken_by?: string | null
          created_at?: string | null
          disc_action_id?: string | null
          employee_id?: string
          id?: string
          location_id?: string
          org_id?: string
          points_when_recommended?: number
          recommended_action?: string
          recommended_action_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommended_disc_actions_action_taken_by_fkey"
            columns: ["action_taken_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_disc_actions_disc_action_id_fkey"
            columns: ["disc_action_id"]
            isOneToOne: false
            referencedRelation: "disc_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_disc_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recommended_disc_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_disc_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "recommended_disc_actions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_disc_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_disc_actions_recommended_action_id_fkey"
            columns: ["recommended_action_id"]
            isOneToOne: false
            referencedRelation: "disc_actions_rubric"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_comments: {
        Row: {
          author_email: string | null
          author_name: string | null
          content: string
          created_at: string | null
          feature_id: string
          id: string
        }
        Insert: {
          author_email?: string | null
          author_name?: string | null
          content: string
          created_at?: string | null
          feature_id: string
          id?: string
        }
        Update: {
          author_email?: string | null
          author_name?: string | null
          content?: string
          created_at?: string | null
          feature_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_comments_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "roadmap_features"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_features: {
        Row: {
          category: string
          comment_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          organization_id: string | null
          priority: string | null
          status: string
          title: string
          updated_at: string | null
          vote_count: number | null
        }
        Insert: {
          category: string
          comment_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          organization_id?: string | null
          priority?: string | null
          status?: string
          title: string
          updated_at?: string | null
          vote_count?: number | null
        }
        Update: {
          category?: string
          comment_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          organization_id?: string | null
          priority?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_votes: {
        Row: {
          anonymous_token: string | null
          created_at: string | null
          feature_id: string
          id: string
          user_id: string | null
          vote_type: string | null
        }
        Insert: {
          anonymous_token?: string | null
          created_at?: string | null
          feature_id: string
          id?: string
          user_id?: string | null
          vote_type?: string | null
        }
        Update: {
          anonymous_token?: string | null
          created_at?: string | null
          feature_id?: string
          id?: string
          user_id?: string | null
          vote_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_votes_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "roadmap_features"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          notes: string | null
          org_id: string
          published_at: string | null
          published_by: string | null
          status: string
          total_hours: number | null
          total_labor_cost: number | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          notes?: string | null
          org_id: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          total_hours?: number | null
          total_labor_cost?: number | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          org_id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          total_hours?: number | null
          total_labor_cost?: number | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_areas: {
        Row: {
          color: string
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean
          location_id: string
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_areas_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_areas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          org_id: string
          projected_cost: number | null
          shift_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          org_id: string
          projected_cost?: number | null
          shift_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          org_id?: string
          projected_cost?: number | null
          shift_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          created_at: string | null
          end_date: string | null
          end_time: string
          id: string
          is_house_shift: boolean
          notes: string | null
          org_id: string
          position_id: string | null
          schedule_id: string
          shift_area_id: string | null
          shift_date: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          break_minutes?: number
          created_at?: string | null
          end_date?: string | null
          end_time: string
          id?: string
          is_house_shift?: boolean
          notes?: string | null
          org_id: string
          position_id?: string | null
          schedule_id: string
          shift_area_id?: string | null
          shift_date: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          break_minutes?: number
          created_at?: string | null
          end_date?: string | null
          end_time?: string
          id?: string
          is_house_shift?: boolean
          notes?: string | null
          org_id?: string
          position_id?: string | null
          schedule_id?: string
          shift_area_id?: string | null
          shift_date?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_shift_area_id_fkey"
            columns: ["shift_area_id"]
            isOneToOne: false
            referencedRelation: "shift_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_location_access: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_access_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_location_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          notes: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          source?: string | null
        }
        Relationships: []
      }
      yelp_reviews: {
        Row: {
          ai_analyzed_at: string | null
          ai_summary: string | null
          ai_tags: Json | null
          author_name: string | null
          created_at: string
          first_synced_at: string
          id: string
          last_synced_at: string
          location_id: string
          mentioned_employee_ids: Json | null
          org_id: string
          owner_replies: Json | null
          pillar_score_applied: boolean | null
          publish_time: string | null
          rating: number
          review_photos: Json | null
          review_tags: Json | null
          review_text: string | null
          sentiment_score: number | null
          yelp_review_id: string
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_summary?: string | null
          ai_tags?: Json | null
          author_name?: string | null
          created_at?: string
          first_synced_at?: string
          id?: string
          last_synced_at?: string
          location_id: string
          mentioned_employee_ids?: Json | null
          org_id: string
          owner_replies?: Json | null
          pillar_score_applied?: boolean | null
          publish_time?: string | null
          rating: number
          review_photos?: Json | null
          review_tags?: Json | null
          review_text?: string | null
          sentiment_score?: number | null
          yelp_review_id: string
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_summary?: string | null
          ai_tags?: Json | null
          author_name?: string | null
          created_at?: string
          first_synced_at?: string
          id?: string
          last_synced_at?: string
          location_id?: string
          mentioned_employee_ids?: Json | null
          org_id?: string
          owner_replies?: Json | null
          pillar_score_applied?: boolean | null
          publish_time?: string | null
          rating?: number
          review_photos?: Json | null
          review_tags?: Json | null
          review_text?: string | null
          sentiment_score?: number | null
          yelp_review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yelp_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yelp_reviews_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employee_latest_rating: {
        Row: {
          created_at: string | null
          employee_id: string | null
          full_name: string | null
          location_id: string | null
          position: string | null
          rating_avg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_employee_infraction_rollup: {
        Row: {
          current_points: number | null
          employee_id: string | null
          full_name: string | null
          last_infraction: string | null
          role: string | null
        }
        Insert: {
          current_points?: never
          employee_id?: string | null
          full_name?: string | null
          last_infraction?: never
          role?: string | null
        }
        Update: {
          current_points?: never
          employee_id?: string | null
          full_name?: string | null
          last_infraction?: never
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_daily_position_averages: {
        Args: never
        Returns: {
          employee_id: string
          location_id: string
          org_id: string
          position_averages: Json
        }[]
      }
      consolidate_employee: {
        Args: { p_employee_id: string }
        Returns: undefined
      }
      find_consolidated_employee_id: {
        Args: { p_email: string; p_full_name: string; p_org_id: string }
        Returns: string
      }
      generate_disciplinary_recommendations: {
        Args: { p_location_id: string; p_org_id: string }
        Returns: undefined
      }
      generate_location_mobile_token: { Args: never; Returns: string }
      new_location_mobile_token: { Args: never; Returns: string }
      random_role_color: { Args: never; Returns: string }
      refresh_all_disciplinary_recommendations: {
        Args: never
        Returns: undefined
      }
      refresh_recommendations_for_employee: {
        Args: { p_employee_id: string; p_location_id: string; p_org_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      store_daily_position_averages: { Args: never; Returns: number }
    }
    Enums: {
      availability_type: "Limited" | "Available"
      certification_status_enum:
        | "Not Certified"
        | "Pending"
        | "Certified"
        | "PIP"
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
      availability_type: ["Limited", "Available"],
      certification_status_enum: [
        "Not Certified",
        "Pending",
        "Certified",
        "PIP",
      ],
    },
  },
} as const

