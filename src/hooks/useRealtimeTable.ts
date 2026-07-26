import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Subscribes to INSERT/UPDATE/DELETE on `table` and calls `onChange` on any
 * event, optionally scoped by a filter string like "pharmacy_id=eq.<id>".
 */
export function useRealtimeTable(
  table: string,
  onChange: () => void,
  filter?: string
) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}:${filter ?? 'all'}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table, filter },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter]);
}