import { supabase } from './supabase';

export interface IdempotentInsertResult<T> {
  data: T;
  isDuplicate: boolean;
}

/**
 * Perform an idempotent insert into a Supabase table using client_request_id.
 * If a unique violation (code 23505) occurs, it queries and returns the existing row.
 */
export async function idempotentInsert<T = any>(
  table: string,
  record: Record<string, any>,
  conflictLookup: {
    userColumn: string;
    userId: string;
    clientRequestId: string;
  }
): Promise<IdempotentInsertResult<T>> {
  const { data, error } = await supabase
    .from(table)
    .insert(record)
    .select()
    .single();

  if (!error) {
    return {
      data: (data || record) as T,
      isDuplicate: false
    };
  }

  // Check if error is PostgreSQL unique_violation (23505)
  const isUniqueViolation =
    error.code === '23505' ||
    error.message?.toLowerCase().includes('duplicate key') ||
    error.message?.toLowerCase().includes('unique constraint') ||
    error.details?.toLowerCase().includes('already exists');

  if (isUniqueViolation && conflictLookup.clientRequestId) {
    try {
      const { data: existingRow, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq(conflictLookup.userColumn, conflictLookup.userId)
        .eq('client_request_id', conflictLookup.clientRequestId)
        .maybeSingle();

      if (existingRow && !fetchError) {
        return {
          data: existingRow as T,
          isDuplicate: true
        };
      }
    } catch (fetchErr) {
      console.warn(`[idempotency] Failed resolving duplicate for ${table}:`, fetchErr);
    }
  }

  // If not a unique conflict or existing row couldn't be resolved, throw original error
  throw error;
}

/**
 * Generate a standard UUID v4 for client_request_id
 */
export function generateClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
