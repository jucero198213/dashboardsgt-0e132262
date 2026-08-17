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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      first_access_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string | null
          referencia_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          referencia_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string | null
          referencia_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      page_permissions: {
        Row: {
          created_at: string
          id: string
          page: Database["public"]["Enums"]["app_page"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page: Database["public"]["Enums"]["app_page"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page?: Database["public"]["Enums"]["app_page"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          departamento: Database["public"]["Enums"]["departamento"] | null
          display_name: string
          id: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          departamento?: Database["public"]["Enums"]["departamento"] | null
          display_name: string
          id: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          departamento?: Database["public"]["Enums"]["departamento"] | null
          display_name?: string
          id?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sofia_conversas: {
        Row: {
          conteudo: string
          criado_em: string
          id: number
          role: string
          telefone: string
        }
        Insert: {
          conteudo: string
          criado_em?: string
          id?: never
          role: string
          telefone: string
        }
        Update: {
          conteudo?: string
          criado_em?: string
          id?: never
          role?: string
          telefone?: string
        }
        Relationships: []
      }
      ticket_anexos: {
        Row: {
          arquivo_url: string
          created_at: string
          id: string
          mensagem_id: string | null
          nome_arquivo: string | null
          tamanho: number | null
          ticket_id: string
          tipo: string | null
          uploaded_by: string | null
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          id?: string
          mensagem_id?: string | null
          nome_arquivo?: string | null
          tamanho?: number | null
          ticket_id: string
          tipo?: string | null
          uploaded_by?: string | null
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          id?: string
          mensagem_id?: string | null
          nome_arquivo?: string | null
          tamanho?: number | null
          ticket_id?: string
          tipo?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_anexos_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "ticket_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_anexos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      ticket_mensagens: {
        Row: {
          autor_id: string
          conteudo: string
          created_at: string
          id: string
          ticket_id: string
          tipo: string
        }
        Insert: {
          autor_id: string
          conteudo: string
          created_at?: string
          id?: string
          ticket_id: string
          tipo?: string
        }
        Update: {
          autor_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          ticket_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_mensagens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          aberto_por: string | null
          categoria_id: string | null
          cliente_setor: string | null
          created_at: string
          created_by: string | null
          data_chamado: string
          departamento: Database["public"]["Enums"]["departamento"] | null
          descricao: string | null
          horario_chamado: string | null
          id: string
          observacoes: string | null
          prioridade: string
          responsavel: string | null
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          aberto_por?: string | null
          categoria_id?: string | null
          cliente_setor?: string | null
          created_at?: string
          created_by?: string | null
          data_chamado: string
          departamento?: Database["public"]["Enums"]["departamento"] | null
          descricao?: string | null
          horario_chamado?: string | null
          id?: string
          observacoes?: string | null
          prioridade?: string
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          aberto_por?: string | null
          categoria_id?: string | null
          cliente_setor?: string | null
          created_at?: string
          created_by?: string | null
          data_chamado?: string
          departamento?: Database["public"]["Enums"]["departamento"] | null
          descricao?: string | null
          horario_chamado?: string | null
          id?: string
          observacoes?: string | null
          prioridade?: string
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "ticket_categorias"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_page_access: {
        Args: {
          _page: Database["public"]["Enums"]["app_page"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_page:
        | "dashboard"
        | "indicadores"
        | "financeiro"
        | "gestao"
        | "operacao"
        | "compras"
        | "rh"
        | "suporte"
        | "fin-painel"
        | "fin-pagar"
        | "fin-receber"
        | "fin-conciliacao"
        | "fin-realizado"
        | "fin-previsto"
        | "fin-relatorios"
        | "ext-fiscal"
        | "fin-fornecedores"
        | "fin-clientes"
        | "fin-categorias"
        | "fin-bancos"
        | "ext-executivo"
        | "ext-indicadores"
        | "ext-faturamento"
        | "ext-operacional"
        | "ext-frota"
        | "ext-fin-frota"
        | "ext-manutencao"
        | "ext-abastecimento"
        | "ext-compras"
        | "ext-rh"
        | "ext-chamados"
        | "portal-receitaflow"
        | "portal-visual"
        | "sofia-ai"
      app_role: "admin" | "user"
      departamento:
        | "ti"
        | "financeiro"
        | "operacao"
        | "rh"
        | "diretoria"
        | "compras"
        | "comercial"
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
      app_page: [
        "dashboard",
        "indicadores",
        "financeiro",
        "gestao",
        "operacao",
        "compras",
        "rh",
        "suporte",
        "fin-painel",
        "fin-pagar",
        "fin-receber",
        "fin-conciliacao",
        "fin-realizado",
        "fin-previsto",
        "fin-relatorios",
        "ext-fiscal",
        "fin-fornecedores",
        "fin-clientes",
        "fin-categorias",
        "fin-bancos",
        "ext-executivo",
        "ext-indicadores",
        "ext-faturamento",
        "ext-operacional",
        "ext-frota",
        "ext-fin-frota",
        "ext-manutencao",
        "ext-abastecimento",
        "ext-compras",
        "ext-rh",
        "ext-chamados",
        "portal-receitaflow",
        "portal-visual",
        "sofia-ai",
      ],
      app_role: ["admin", "user"],
      departamento: [
        "ti",
        "financeiro",
        "operacao",
        "rh",
        "diretoria",
        "compras",
        "comercial",
      ],
    },
  },
} as const
