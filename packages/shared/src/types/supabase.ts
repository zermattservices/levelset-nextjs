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
          location_id: string | null
          org_id: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          org_id: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          org_id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
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
          tool_call_id: string | null
          tool_calls: Json | null
          ui_blocks: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          tool_call_id?: string | null
          tool_calls?: Json | null
          ui_blocks?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
          ui_blocks?: Json | null
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
      ai_usage_monthly: {
        Row: {
          created_at: string | null
          id: string
          included_queries: number
          month: string
          org_id: string
          overage_cost_cents: number
          overage_queries: number
          total_queries: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          included_queries?: number
          month: string
          org_id: string
          overage_cost_cents?: number
          overage_queries?: number
          total_queries?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          included_queries?: number
          month?: string
          org_id?: string
          overage_cost_cents?: number
          overage_queries?: number
          total_queries?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_monthly_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
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
      approval_denial_reasons: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean
          label: string
          org_id: string
          request_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          org_id: string
          request_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          org_id?: string
          request_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_denial_reasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_change_requests: {
        Row: {
          created_at: string | null
          denial_message: string | null
          denial_reason_id: string | null
          effective_date: string | null
          employee_id: string
          employee_notes: string | null
          end_date: string | null
          id: string
          is_permanent: boolean | null
          manager_notes: string | null
          org_id: string
          requested_availability: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          denial_message?: string | null
          denial_reason_id?: string | null
          effective_date?: string | null
          employee_id: string
          employee_notes?: string | null
          end_date?: string | null
          id?: string
          is_permanent?: boolean | null
          manager_notes?: string | null
          org_id: string
          requested_availability: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          denial_message?: string | null
          denial_reason_id?: string | null
          effective_date?: string | null
          employee_id?: string
          employee_notes?: string | null
          end_date?: string | null
          id?: string
          is_permanent?: boolean | null
          manager_notes?: string | null
          org_id?: string
          requested_availability?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_change_requests_denial_reason_id_fkey"
            columns: ["denial_reason_id"]
            isOneToOne: false
            referencedRelation: "approval_denial_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "availability_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_change_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "availability_change_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      board_task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "board_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "board_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      board_task_workstreams: {
        Row: {
          created_at: string
          id: string
          task_id: string
          workstream_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          workstream_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          workstream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_task_workstreams_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "board_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_task_workstreams_workstream_id_fkey"
            columns: ["workstream_id"]
            isOneToOne: false
            referencedRelation: "board_workstreams"
            referencedColumns: ["id"]
          },
        ]
      }
      board_tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          roadmap_feature_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          roadmap_feature_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          roadmap_feature_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_tasks_roadmap_feature_id_fkey"
            columns: ["roadmap_feature_id"]
            isOneToOne: true
            referencedRelation: "roadmap_features"
            referencedColumns: ["id"]
          },
        ]
      }
      board_workstreams: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      break_rules: {
        Row: {
          break_duration_minutes: number
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          org_id: string
          trigger_hours: number
          updated_at: string | null
        }
        Insert: {
          break_duration_minutes: number
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          org_id: string
          trigger_hours: number
          updated_at?: string | null
        }
        Update: {
          break_duration_minutes?: number
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          org_id?: string
          trigger_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "break_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
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
      cfa_location_directory: {
        Row: {
          created_at: string | null
          id: string
          location_name: string
          location_number: string
          location_type: string | null
          open_date: string | null
          operator_name: string | null
          state: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_name: string
          location_number: string
          location_type?: string | null
          open_date?: string | null
          operator_name?: string | null
          state?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_name?: string
          location_number?: string
          location_type?: string | null
          open_date?: string | null
          operator_name?: string | null
          state?: string | null
        }
        Relationships: []
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
      context_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_digest_id: string | null
          embedding: string | null
          global_document_digest_id: string | null
          heading: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          source_type: string
          token_count: number | null
          updated_at: string | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_digest_id?: string | null
          embedding?: string | null
          global_document_digest_id?: string | null
          heading?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          source_type: string
          token_count?: number | null
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_digest_id?: string | null
          embedding?: string | null
          global_document_digest_id?: string | null
          heading?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          source_type?: string
          token_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "context_chunks_document_digest_id_fkey"
            columns: ["document_digest_id"]
            isOneToOne: false
            referencedRelation: "document_digests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_chunks_global_document_digest_id_fkey"
            columns: ["global_document_digest_id"]
            isOneToOne: false
            referencedRelation: "global_document_digests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "context_chunks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
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
          action_es: string | null
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
          action_es?: string | null
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
          action_es?: string | null
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
      document_digests: {
        Row: {
          content_hash: string | null
          content_md: string | null
          created_at: string
          document_id: string
          embedding_status: string | null
          extraction_error: string | null
          extraction_method: string | null
          extraction_status: string
          id: string
          metadata: Json
          org_id: string
          pageindex_indexed: boolean | null
          pageindex_indexed_at: string | null
          pageindex_tree_id: string | null
          previous_content_md: string | null
          updated_at: string
          version: number
        }
        Insert: {
          content_hash?: string | null
          content_md?: string | null
          created_at?: string
          document_id: string
          embedding_status?: string | null
          extraction_error?: string | null
          extraction_method?: string | null
          extraction_status?: string
          id?: string
          metadata?: Json
          org_id: string
          pageindex_indexed?: boolean | null
          pageindex_indexed_at?: string | null
          pageindex_tree_id?: string | null
          previous_content_md?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          content_hash?: string | null
          content_md?: string | null
          created_at?: string
          document_id?: string
          embedding_status?: string | null
          extraction_error?: string | null
          extraction_method?: string | null
          extraction_status?: string
          id?: string
          metadata?: Json
          org_id?: string
          pageindex_indexed?: boolean | null
          pageindex_indexed_at?: string | null
          pageindex_tree_id?: string | null
          previous_content_md?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_digests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_digests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          org_id: string
          parent_folder_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          org_id: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          content_diff_summary: string | null
          created_at: string
          document_id: string
          file_size: number | null
          id: string
          replaced_by: string | null
          storage_path: string
          version_number: number
        }
        Insert: {
          content_diff_summary?: string | null
          created_at?: string
          document_id: string
          file_size?: number | null
          id?: string
          replaced_by?: string | null
          storage_path: string
          version_number: number
        }
        Update: {
          content_diff_summary?: string | null
          created_at?: string
          document_id?: string
          file_size?: number | null
          id?: string
          replaced_by?: string | null
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          current_version: number
          description: string | null
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          name: string
          org_id: string
          original_filename: string | null
          original_url: string | null
          source_type: string
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          current_version?: number
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          name: string
          org_id: string
          original_filename?: string | null
          original_url?: string | null
          source_type: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          current_version?: number
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          org_id?: string
          original_filename?: string | null
          original_url?: string | null
          source_type?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          delivered_at: string | null
          id: string
          lead_id: string
          opened_at: string | null
          resend_message_id: string | null
          sent_at: string
          sequence_id: string | null
          status: string | null
          template_slug: string
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          delivered_at?: string | null
          id?: string
          lead_id: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          sequence_id?: string | null
          status?: string | null
          template_slug: string
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          delivered_at?: string | null
          id?: string
          lead_id?: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          sequence_id?: string | null
          status?: string | null
          template_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          active: boolean | null
          delay_hours: number
          id: string
          sequence_id: string
          step_order: number
          template_slug: string
        }
        Insert: {
          active?: boolean | null
          delay_hours: number
          id?: string
          sequence_id: string
          step_order: number
          template_slug: string
        }
        Update: {
          active?: boolean | null
          delay_hours?: number
          id?: string
          sequence_id?: string
          step_order?: number
          template_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_steps_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["slug"]
          },
        ]
      }
      email_sequences: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          name: string
          trigger_event: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          name: string
          trigger_event: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          name?: string
          trigger_event?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          preview_text: string | null
          slug: string
          subject: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          preview_text?: string | null
          slug: string
          subject: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          preview_text?: string | null
          slug?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          org_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          org_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          org_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_availability_org_id_fkey"
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
          actual_pay: number | null
          actual_pay_annual: number | null
          actual_pay_type: string | null
          availability: Database["public"]["Enums"]["availability_type"] | null
          availability_max_days_week: number | null
          availability_max_hours_week: number | null
          birth_date: string | null
          calculated_pay: number | null
          certified_status: string
          consolidated_employee_id: string | null
          created_at: string
          department_id: string | null
          direct_supervisor_id: string | null
          email: string | null
          first_name: string
          full_name: string | null
          hire_date: string | null
          hs_id: number | null
          id: string
          is_boh: boolean
          is_foh: boolean
          is_leader: boolean
          is_trainer: boolean
          last_name: string | null
          last_points_total: number | null
          location_id: string
          org_id: string
          payroll_name: string | null
          phone: string | null
          role: string
          supervisor_group_id: string | null
          termination_date: string | null
          termination_reason: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          actual_pay?: number | null
          actual_pay_annual?: number | null
          actual_pay_type?: string | null
          availability?: Database["public"]["Enums"]["availability_type"] | null
          availability_max_days_week?: number | null
          availability_max_hours_week?: number | null
          birth_date?: string | null
          calculated_pay?: number | null
          certified_status?: string
          consolidated_employee_id?: string | null
          created_at?: string
          department_id?: string | null
          direct_supervisor_id?: string | null
          email?: string | null
          first_name: string
          full_name?: string | null
          hire_date?: string | null
          hs_id?: number | null
          id?: string
          is_boh?: boolean
          is_foh?: boolean
          is_leader?: boolean
          is_trainer?: boolean
          last_name?: string | null
          last_points_total?: number | null
          location_id: string
          org_id: string
          payroll_name?: string | null
          phone?: string | null
          role: string
          supervisor_group_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          actual_pay?: number | null
          actual_pay_annual?: number | null
          actual_pay_type?: string | null
          availability?: Database["public"]["Enums"]["availability_type"] | null
          availability_max_days_week?: number | null
          availability_max_hours_week?: number | null
          birth_date?: string | null
          calculated_pay?: number | null
          certified_status?: string
          consolidated_employee_id?: string | null
          created_at?: string
          department_id?: string | null
          direct_supervisor_id?: string | null
          email?: string | null
          first_name?: string
          full_name?: string | null
          hire_date?: string | null
          hs_id?: number | null
          id?: string
          is_boh?: boolean
          is_foh?: boolean
          is_leader?: boolean
          is_trainer?: boolean
          last_name?: string | null
          last_points_total?: number | null
          location_id?: string
          org_id?: string
          payroll_name?: string | null
          phone?: string | null
          role?: string
          supervisor_group_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          title?: string | null
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
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "org_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_direct_supervisor_id_fkey"
            columns: ["direct_supervisor_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_direct_supervisor_id_fkey"
            columns: ["direct_supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_direct_supervisor_id_fkey"
            columns: ["direct_supervisor_id"]
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
            foreignKeyName: "employees_supervisor_group_id_fkey"
            columns: ["supervisor_group_id"]
            isOneToOne: false
            referencedRelation: "org_groups"
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
      form_connectors: {
        Row: {
          category: string
          created_at: string
          description: string | null
          description_es: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          name_es: string | null
          params: Json | null
          return_type: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          description_es?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          name_es?: string | null
          params?: Json | null
          return_type: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          description_es?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          name_es?: string | null
          params?: Json | null
          return_type?: string
        }
        Relationships: []
      }
      form_groups: {
        Row: {
          created_at: string
          description: string | null
          description_es: string | null
          display_order: number
          icon: string | null
          id: string
          is_system: boolean
          name: string
          name_es: string | null
          org_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_es?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          name_es?: string | null
          org_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_es?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          name_es?: string | null
          org_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          employee_id: string | null
          form_type: string
          id: string
          location_id: string | null
          metadata: Json | null
          org_id: string
          response_data: Json
          schema_snapshot: Json
          score: number | null
          status: string
          submitted_by: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          form_type: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          org_id: string
          response_data?: Json
          schema_snapshot?: Json
          score?: number | null
          status?: string
          submitted_by?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          form_type?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          org_id?: string
          response_data?: Json
          schema_snapshot?: Json
          score?: number | null
          status?: string
          submitted_by?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "form_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "form_submissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          description_es: string | null
          form_type: string
          group_id: string
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          name_es: string | null
          org_id: string
          schema: Json
          settings: Json
          slug: string
          ui_schema: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_es?: string | null
          form_type: string
          group_id: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          name_es?: string | null
          org_id: string
          schema?: Json
          settings?: Json
          slug: string
          ui_schema?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_es?: string | null
          form_type?: string
          group_id?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          name_es?: string | null
          org_id?: string
          schema?: Json
          settings?: Json
          slug?: string
          ui_schema?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "form_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      global_document_digests: {
        Row: {
          content_hash: string | null
          content_md: string | null
          created_at: string
          document_id: string
          embedding_status: string | null
          extraction_error: string | null
          extraction_method: string | null
          extraction_status: string
          id: string
          metadata: Json
          pageindex_indexed: boolean | null
          pageindex_indexed_at: string | null
          pageindex_tree_id: string | null
          previous_content_md: string | null
          updated_at: string
          version: number
        }
        Insert: {
          content_hash?: string | null
          content_md?: string | null
          created_at?: string
          document_id: string
          embedding_status?: string | null
          extraction_error?: string | null
          extraction_method?: string | null
          extraction_status?: string
          id?: string
          metadata?: Json
          pageindex_indexed?: boolean | null
          pageindex_indexed_at?: string | null
          pageindex_tree_id?: string | null
          previous_content_md?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          content_hash?: string | null
          content_md?: string | null
          created_at?: string
          document_id?: string
          embedding_status?: string | null
          extraction_error?: string | null
          extraction_method?: string | null
          extraction_status?: string
          id?: string
          metadata?: Json
          pageindex_indexed?: boolean | null
          pageindex_indexed_at?: string | null
          pageindex_tree_id?: string | null
          previous_content_md?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "global_document_digests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "global_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      global_document_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_document_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "global_document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      global_document_versions: {
        Row: {
          content_diff_summary: string | null
          created_at: string
          document_id: string
          file_size: number | null
          id: string
          replaced_by: string | null
          storage_path: string
          version_number: number
        }
        Insert: {
          content_diff_summary?: string | null
          created_at?: string
          document_id: string
          file_size?: number | null
          id?: string
          replaced_by?: string | null
          storage_path: string
          version_number: number
        }
        Update: {
          content_diff_summary?: string | null
          created_at?: string
          document_id?: string
          file_size?: number | null
          id?: string
          replaced_by?: string | null
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "global_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "global_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_document_versions_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      global_documents: {
        Row: {
          category: string
          created_at: string
          current_version: number
          description: string | null
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          name: string
          original_filename: string | null
          original_url: string | null
          raw_content: string | null
          source_type: string
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          current_version?: number
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          name: string
          original_filename?: string | null
          original_url?: string | null
          raw_content?: string | null
          source_type: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          current_version?: number
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          original_filename?: string | null
          original_url?: string | null
          raw_content?: string | null
          source_type?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "global_document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
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
      hs_position_mappings: {
        Row: {
          created_at: string | null
          hs_job_id: number
          hs_job_name: string
          hs_role_id: number | null
          hs_role_name: string | null
          id: string
          location_id: string
          org_id: string
          position_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hs_job_id: number
          hs_job_name: string
          hs_role_id?: number | null
          hs_role_name?: string | null
          id?: string
          location_id: string
          org_id: string
          position_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hs_job_id?: number
          hs_job_name?: string
          hs_role_id?: number | null
          hs_role_name?: string | null
          id?: string
          location_id?: string
          org_id?: string
          position_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hs_position_mappings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_position_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hs_position_mappings_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
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
          infraction_es: string | null
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
          infraction_es?: string | null
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
          infraction_es?: string | null
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
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string | null
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          org_id: string
          period_end: string | null
          period_start: string | null
          status: string
          stripe_invoice_id: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string | null
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string | null
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          lead_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          admin_notes: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          engagement_score: number | null
          estimated_value_cents: number | null
          first_name: string | null
          id: string
          is_multi_unit: boolean | null
          is_operator: boolean | null
          last_name: string | null
          locations: Json | null
          lost_at: string | null
          lost_reason: string | null
          message: string | null
          metadata: Json | null
          onboarded_at: string | null
          operator_name: string | null
          org_id: string | null
          pipeline_stage: string | null
          role: string | null
          source: string | null
          stage_changed_at: string | null
          store_number: string | null
          trial_started_at: string | null
          updated_at: string
          visitor_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          engagement_score?: number | null
          estimated_value_cents?: number | null
          first_name?: string | null
          id?: string
          is_multi_unit?: boolean | null
          is_operator?: boolean | null
          last_name?: string | null
          locations?: Json | null
          lost_at?: string | null
          lost_reason?: string | null
          message?: string | null
          metadata?: Json | null
          onboarded_at?: string | null
          operator_name?: string | null
          org_id?: string | null
          pipeline_stage?: string | null
          role?: string | null
          source?: string | null
          stage_changed_at?: string | null
          store_number?: string | null
          trial_started_at?: string | null
          updated_at?: string
          visitor_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          engagement_score?: number | null
          estimated_value_cents?: number | null
          first_name?: string | null
          id?: string
          is_multi_unit?: boolean | null
          is_operator?: boolean | null
          last_name?: string | null
          locations?: Json | null
          lost_at?: string | null
          lost_reason?: string | null
          message?: string | null
          metadata?: Json | null
          onboarded_at?: string | null
          operator_name?: string | null
          org_id?: string | null
          pipeline_stage?: string | null
          role?: string | null
          source?: string | null
          stage_changed_at?: string | null
          store_number?: string | null
          trial_started_at?: string | null
          updated_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_org_id_fkey"
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
      levi_core_context: {
        Row: {
          active: boolean | null
          content: string
          context_key: string
          created_at: string | null
          id: string
          token_count: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          active?: boolean | null
          content: string
          context_key: string
          created_at?: string | null
          id?: string
          token_count?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          active?: boolean | null
          content?: string
          context_key?: string
          created_at?: string | null
          id?: string
          token_count?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      levi_usage_log: {
        Row: {
          conversation_id: string | null
          cost_usd: number | null
          created_at: string | null
          escalated: boolean | null
          escalation_reason: string | null
          fallback: boolean | null
          id: string
          input_tokens: number
          latency_ms: number | null
          model: string
          orchestrator_cost_usd: number | null
          orchestrator_input_tokens: number | null
          orchestrator_model: string | null
          orchestrator_output_tokens: number | null
          org_id: string
          output_tokens: number
          task_type: string
          tier: string
          tool_count: number | null
          tool_duration_ms: number | null
          user_id: string | null
          worker_cost_usd: number | null
          worker_input_tokens: number | null
          worker_model: string | null
          worker_output_tokens: number | null
        }
        Insert: {
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          escalated?: boolean | null
          escalation_reason?: string | null
          fallback?: boolean | null
          id?: string
          input_tokens: number
          latency_ms?: number | null
          model: string
          orchestrator_cost_usd?: number | null
          orchestrator_input_tokens?: number | null
          orchestrator_model?: string | null
          orchestrator_output_tokens?: number | null
          org_id: string
          output_tokens: number
          task_type: string
          tier: string
          tool_count?: number | null
          tool_duration_ms?: number | null
          user_id?: string | null
          worker_cost_usd?: number | null
          worker_input_tokens?: number | null
          worker_model?: string | null
          worker_output_tokens?: number | null
        }
        Update: {
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          escalated?: boolean | null
          escalation_reason?: string | null
          fallback?: boolean | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          model?: string
          orchestrator_cost_usd?: number | null
          orchestrator_input_tokens?: number | null
          orchestrator_model?: string | null
          orchestrator_output_tokens?: number | null
          org_id?: string
          output_tokens?: number
          task_type?: string
          tier?: string
          tool_count?: number | null
          tool_duration_ms?: number | null
          user_id?: string | null
          worker_cost_usd?: number | null
          worker_input_tokens?: number | null
          worker_model?: string | null
          worker_output_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "levi_usage_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "levi_usage_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "levi_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
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
          hs_client_id: number | null
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
          state: string | null
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
          hs_client_id?: number | null
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
          state?: string | null
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
          hs_client_id?: number | null
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
          state?: string | null
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
      onboarding_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          employee_id: string | null
          first_name: string | null
          id: string
          invited_by: string | null
          last_name: string | null
          org_id: string
          role: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          employee_id?: string | null
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          org_id: string
          role?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          org_id?: string
          role?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_invites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "onboarding_invites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_invites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "onboarding_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_levi_analysis: {
        Row: {
          created_at: string | null
          document_ids: string[] | null
          extracted_actions: Json | null
          extracted_infractions: Json | null
          id: string
          model: string | null
          org_id: string
          raw_response: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_ids?: string[] | null
          extracted_actions?: Json | null
          extracted_infractions?: Json | null
          id?: string
          model?: string | null
          org_id: string
          raw_response?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_ids?: string[] | null
          extracted_actions?: Json | null
          extracted_infractions?: Json | null
          id?: string
          model?: string | null
          org_id?: string
          raw_response?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_levi_analysis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_sessions: {
        Row: {
          completed_at: string | null
          completed_steps: number[] | null
          created_at: string | null
          current_step: number | null
          email: string
          id: string
          org_id: string
          started_at: string | null
          step_data: Json | null
          token: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number[] | null
          created_at?: string | null
          current_step?: number | null
          email: string
          id?: string
          org_id: string
          started_at?: string | null
          step_data?: Json | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number[] | null
          created_at?: string | null
          current_step?: number | null
          email?: string
          id?: string
          org_id?: string
          started_at?: string | null
          step_data?: Json | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_departments: {
        Row: {
          created_at: string
          department_head_id: string | null
          id: string
          location_id: string | null
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_head_id?: string | null
          id?: string
          location_id?: string | null
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_head_id?: string | null
          id?: string
          location_id?: string | null
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_dept_head"
            columns: ["department_head_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_dept_head"
            columns: ["department_head_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dept_head"
            columns: ["department_head_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "org_departments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
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
      org_group_members: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          org_group_id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          org_group_id: string
          org_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          org_group_id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "org_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "org_group_members_org_group_id_fkey"
            columns: ["org_group_id"]
            isOneToOne: false
            referencedRelation: "org_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_group_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_groups: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          location_id: string | null
          name: string
          org_id: string
          role_name: string
          supervisor_group_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          location_id?: string | null
          name: string
          org_id: string
          role_name: string
          supervisor_group_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          location_id?: string | null
          name?: string
          org_id?: string
          role_name?: string
          supervisor_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_groups_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "org_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_groups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_groups_supervisor_group_id_fkey"
            columns: ["supervisor_group_id"]
            isOneToOne: false
            referencedRelation: "org_groups"
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
          area_id: string | null
          created_at: string
          description: string | null
          description_es: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          name_es: string | null
          org_id: string
          position_type: string
          scheduling_enabled: boolean
          updated_at: string
          zone: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          description_es?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          name_es?: string | null
          org_id: string
          position_type?: string
          scheduling_enabled?: boolean
          updated_at?: string
          zone: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          description_es?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          name_es?: string | null
          org_id?: string
          position_type?: string
          scheduling_enabled?: boolean
          updated_at?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_positions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "scheduling_areas"
            referencedColumns: ["id"]
          },
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
          custom_price_cents: number | null
          custom_pricing: boolean | null
          id: string
          is_multi_unit: boolean | null
          name: string
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          operator_name: string | null
          start_date: string | null
          state: string | null
          stripe_customer_id: string | null
          subscription_plan: string | null
          team_member_website: string | null
          trial_ai_queries_used: number | null
          trial_ai_query_limit: number | null
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string
          custom_price_cents?: number | null
          custom_pricing?: boolean | null
          id?: string
          is_multi_unit?: boolean | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          operator_name?: string | null
          start_date?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string | null
          team_member_website?: string | null
          trial_ai_queries_used?: number | null
          trial_ai_query_limit?: number | null
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string
          custom_price_cents?: number | null
          custom_pricing?: boolean | null
          id?: string
          is_multi_unit?: boolean | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          operator_name?: string | null
          start_date?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string | null
          team_member_website?: string | null
          trial_ai_queries_used?: number | null
          trial_ai_query_limit?: number | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      overtime_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          multiplier: number
          priority: number
          rule_type: string
          state_code: string
          threshold_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          priority?: number
          rule_type: string
          state_code: string
          threshold_hours: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          multiplier?: number
          priority?: number
          rule_type?: string
          state_code?: string
          threshold_hours?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          referrer: string | null
          session_id: string | null
          time_on_page_seconds: number | null
          url: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          referrer?: string | null
          session_id?: string | null
          time_on_page_seconds?: number | null
          url: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          referrer?: string | null
          session_id?: string | null
          time_on_page_seconds?: number | null
          url?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
          agent_context: string | null
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
          agent_context?: string | null
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
          agent_context?: string | null
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
      sales_forecast_intervals: {
        Row: {
          created_at: string | null
          forecast_id: string
          id: string
          interval_start: string
          sales_amount: number | null
          transaction_count: number | null
        }
        Insert: {
          created_at?: string | null
          forecast_id: string
          id?: string
          interval_start: string
          sales_amount?: number | null
          transaction_count?: number | null
        }
        Update: {
          created_at?: string | null
          forecast_id?: string
          id?: string
          interval_start?: string
          sales_amount?: number | null
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_forecast_intervals_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "sales_forecasts"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_forecasts: {
        Row: {
          created_at: string | null
          forecast_date: string
          id: string
          location_id: string
          org_id: string
          projected_sales: number | null
          projected_transactions: number | null
          source: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          forecast_date: string
          id?: string
          location_id: string
          org_id: string
          projected_sales?: number | null
          projected_transactions?: number | null
          source?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          forecast_date?: string
          id?: string
          location_id?: string
          org_id?: string
          projected_sales?: number | null
          projected_transactions?: number | null
          source?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_forecasts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_forecasts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
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
      scheduling_areas: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_areas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_assignments: {
        Row: {
          assigned_by: string | null
          assignment_date: string
          created_at: string
          employee_id: string
          end_time: string
          id: string
          org_id: string
          position_id: string
          shift_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assignment_date: string
          created_at?: string
          employee_id: string
          end_time: string
          id?: string
          org_id: string
          position_id: string
          shift_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assignment_date?: string
          created_at?: string
          employee_id?: string
          end_time?: string
          id?: string
          org_id?: string
          position_id?: string
          shift_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "setup_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "setup_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_template_blocks: {
        Row: {
          block_time: string
          created_at: string
          id: string
          is_custom: boolean
          template_id: string
        }
        Insert: {
          block_time: string
          created_at?: string
          id?: string
          is_custom?: boolean
          template_id: string
        }
        Update: {
          block_time?: string
          created_at?: string
          id?: string
          is_custom?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_template_blocks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "setup_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_template_schedules: {
        Row: {
          created_at: string
          day_of_week: number[]
          end_time: string
          id: string
          start_time: string
          template_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number[]
          end_time: string
          id?: string
          start_time: string
          template_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number[]
          end_time?: string
          id?: string
          start_time?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_template_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "setup_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_template_slots: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          position_id: string
          slot_count: number
          template_id: string
          time_slot: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          position_id: string
          slot_count?: number
          template_id: string
          time_slot: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          position_id?: string
          slot_count?: number
          template_id?: string
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_template_slots_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "org_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setup_template_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "setup_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          priority: number
          updated_at: string
          zone: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          priority?: number
          updated_at?: string
          zone: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          priority?: number
          updated_at?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "setup_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
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
      shift_trade_requests: {
        Row: {
          created_at: string | null
          denial_message: string | null
          denial_reason_id: string | null
          hs_id: number | null
          id: string
          manager_notes: string | null
          notes: string | null
          org_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          schedule_id: string | null
          source_employee_id: string | null
          source_shift_id: string
          status: string
          target_employee_id: string | null
          target_shift_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          denial_message?: string | null
          denial_reason_id?: string | null
          hs_id?: number | null
          id?: string
          manager_notes?: string | null
          notes?: string | null
          org_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_id?: string | null
          source_employee_id?: string | null
          source_shift_id: string
          status?: string
          target_employee_id?: string | null
          target_shift_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          denial_message?: string | null
          denial_reason_id?: string | null
          hs_id?: number | null
          id?: string
          manager_notes?: string | null
          notes?: string | null
          org_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          schedule_id?: string | null
          source_employee_id?: string | null
          source_shift_id?: string
          status?: string
          target_employee_id?: string | null
          target_shift_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_trade_requests_denial_reason_id_fkey"
            columns: ["denial_reason_id"]
            isOneToOne: false
            referencedRelation: "approval_denial_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_source_employee_id_fkey"
            columns: ["source_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_trade_requests_source_employee_id_fkey"
            columns: ["source_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_source_employee_id_fkey"
            columns: ["source_employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_trade_requests_source_shift_id_fkey"
            columns: ["source_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_target_employee_id_fkey"
            columns: ["target_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_trade_requests_target_employee_id_fkey"
            columns: ["target_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_trade_requests_target_employee_id_fkey"
            columns: ["target_employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "shift_trade_requests_target_shift_id_fkey"
            columns: ["target_shift_id"]
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
          pending_delete: boolean
          position_id: string | null
          published_at: string | null
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
          pending_delete?: boolean
          position_id?: string | null
          published_at?: string | null
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
          pending_delete?: boolean
          position_id?: string | null
          published_at?: string | null
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          plan_tier: string
          quantity: number
          status: string
          stripe_price_id: string | null
          stripe_subscription_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          plan_tier: string
          quantity?: number
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          plan_tier?: string
          quantity?: number
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      termination_reasons: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          display_order: number
          id: string
          org_id: string
          reason: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          display_order?: number
          id?: string
          org_id: string
          reason: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          display_order?: number
          id?: string
          org_id?: string
          reason?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "termination_reasons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      the_approach: {
        Row: {
          active: boolean
          badge_text: string | null
          created_at: string | null
          day_label: string
          ends_at: string
          feature_cards: Json
          headline: string
          id: string
          starts_at: string
          subtext: string
          time_range: string
          timeslot_number: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          badge_text?: string | null
          created_at?: string | null
          day_label: string
          ends_at: string
          feature_cards?: Json
          headline: string
          id?: string
          starts_at: string
          subtext: string
          time_range: string
          timeslot_number: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          badge_text?: string | null
          created_at?: string | null
          day_label?: string
          ends_at?: string
          feature_cards?: Json
          headline?: string
          id?: string
          starts_at?: string
          subtext?: string
          time_range?: string
          timeslot_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          created_at: string | null
          denial_message: string | null
          denial_reason_id: string | null
          employee_id: string
          end_datetime: string
          hs_id: number | null
          id: string
          is_paid: boolean | null
          location_id: string
          note: string | null
          org_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_datetime: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          denial_message?: string | null
          denial_reason_id?: string | null
          employee_id: string
          end_datetime: string
          hs_id?: number | null
          id?: string
          is_paid?: boolean | null
          location_id: string
          note?: string | null
          org_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_datetime: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          denial_message?: string | null
          denial_reason_id?: string | null
          employee_id?: string
          end_datetime?: string
          hs_id?: number | null
          id?: string
          is_paid?: boolean | null
          location_id?: string
          note?: string | null
          org_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_datetime?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_denial_reason_id_fkey"
            columns: ["denial_reason_id"]
            isOneToOne: false
            referencedRelation: "approval_denial_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_latest_rating"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_infraction_rollup"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_off_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
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
      visitor_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          entry_page: string | null
          exit_page: string | null
          id: string
          is_bounce: boolean | null
          lead_id: string | null
          page_count: number | null
          referrer: string | null
          session_id: string
          started_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          is_bounce?: boolean | null
          lead_id?: string | null
          page_count?: number | null
          referrer?: string | null
          session_id: string
          started_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          is_bounce?: boolean | null
          lead_id?: string | null
          page_count?: number | null
          referrer?: string | null
          session_id?: string
          started_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          is_multi_unit: boolean | null
          message: string | null
          metadata: Json | null
          notes: string | null
          operator_name: string | null
          source: string | null
          store_number: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_multi_unit?: boolean | null
          message?: string | null
          metadata?: Json | null
          notes?: string | null
          operator_name?: string | null
          source?: string | null
          store_number?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_multi_unit?: boolean | null
          message?: string | null
          metadata?: Json | null
          notes?: string | null
          operator_name?: string | null
          source?: string | null
          store_number?: string | null
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
      count_unique_visitors: {
        Args: { from_ts: string; to_ts: string }
        Returns: number
      }
      daily_visitor_trend: {
        Args: { from_ts: string; to_ts: string }
        Returns: {
          day: string
          session_count: number
          unique_visitors: number
        }[]
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
      get_user_org_id: { Args: never; Returns: string }
      increment_session_page_count: {
        Args: { p_exit_page: string; p_session_id: string }
        Returns: undefined
      }
      is_levelset_admin: { Args: never; Returns: boolean }
      match_context_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_org_id?: string
          query_embedding: string
        }
        Returns: {
          content: string
          document_digest_id: string
          global_document_digest_id: string
          heading: string
          id: string
          similarity: number
          source_type: string
          token_count: number
        }[]
      }
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
      session_analytics_summary: {
        Args: { from_ts: string; to_ts: string }
        Returns: {
          avg_duration: number
          avg_page_count: number
          bounce_count: number
          total_sessions: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      store_daily_position_averages: { Args: never; Returns: number }
      sync_employee_availability: {
        Args: {
          p_employee_id: string
          p_max_days_week?: number
          p_max_hours_week?: number
          p_org_id: string
          p_ranges: Json
        }
        Returns: undefined
      }
      sync_forecast_intervals: {
        Args: { p_forecast_id: string; p_intervals: Json }
        Returns: number
      }
      top_pages: {
        Args: { from_ts: string; max_results?: number; to_ts: string }
        Returns: {
          avg_time_on_page: number
          url: string
          views: number
        }[]
      }
      top_referrers: {
        Args: { from_ts: string; max_results?: number; to_ts: string }
        Returns: {
          sessions: number
          source: string
        }[]
      }
      upsert_time_off_request: {
        Args: {
          p_employee_id: string
          p_end_datetime: string
          p_hs_id: number
          p_is_paid: boolean
          p_location_id: string
          p_note: string
          p_org_id: string
          p_start_datetime: string
          p_status: string
        }
        Returns: string
      }
      utm_campaign_stats: {
        Args: { from_ts: string; max_results?: number; to_ts: string }
        Returns: {
          campaign: string
          medium: string
          sessions: number
          source: string
        }[]
      }
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
