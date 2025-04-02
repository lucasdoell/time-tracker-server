// server/types.ts
export interface TimeEntry {
  id: string;
  activity: string;
  elapsed: number;
  description: string | null;
  tags: string[];
  timestamp: string;
  last_modified: string;
  synced: boolean;
  sync_id: string | null;
  user_id: string | null;
}
