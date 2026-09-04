import { supabase } from "@/integrations/supabase/client";

export type TableInfo = {
  table_name: string;
  column_count: number;
  row_count: number;
};

export type ColumnInfo = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  max_length: number | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
};

export type TableData = {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  per_page: number;
};

export async function listTables(): Promise<TableInfo[]> {
  const { data, error } = await supabase.functions.invoke("list-tables");
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as TableInfo[]) ?? [];
}

export async function describeTable(tableName: string): Promise<ColumnInfo[]> {
  const { data, error } = await supabase.functions.invoke("describe-table", {
    body: { table_name: tableName },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as ColumnInfo[]) ?? [];
}

export async function readTable(tableName: string, page = 1, perPage = 50): Promise<TableData> {
  const { data, error } = await supabase.functions.invoke("read-table", {
    body: { table_name: tableName, page, per_page: perPage },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as TableData;
}
