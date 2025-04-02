import { Hono } from "hono";
import { jwtDecode } from "jwt-decode";
import { auth } from "../auth";
import { db } from "../db";

interface TimeEntry {
  id: string;
  activity: string;
  elapsed: number;
  description: string | null;
  tags: string[];
  timestamp: string;
  last_modified: string;
}

interface JwtPayload {
  id: string;
  email: string;
}

interface SyncContext {
  userId: string;
}

const syncRouter = new Hono<{ Variables: SyncContext }>();

// Auth middleware using better-auth
syncRouter.use("/*", async (c, next) => {
  const response = await auth.handler(c.req.raw);
  if (!response.ok) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = c.req.raw.headers.get("Authorization")?.split(" ")[1];
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);
    c.set("userId", payload.id);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Sync endpoint
syncRouter.post("/sync", async (c) => {
  const userId = c.get("userId") as string;
  const clientEntries = (await c.req.json()) as TimeEntry[];

  try {
    // Process client entries
    const syncResult = await syncClientEntries(clientEntries, userId);

    // Get entries that have changed on server
    const serverChanges = await getChangedEntriesForUser(userId);

    return c.json({
      synced_ids: syncResult.syncedIds,
      entries: serverChanges,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return c.json({ error: "Failed to sync data" }, 500);
  }
});

// Database functions
async function syncClientEntries(entries: TimeEntry[], userId: string) {
  const syncedIds: string[] = [];

  for (const entry of entries) {
    // Check if entry exists
    const existingEntry = await db.query(
      "SELECT * FROM time_entries WHERE id = $1 AND user_id = $2",
      [entry.id, userId]
    );

    if (existingEntry.rowCount && existingEntry.rowCount > 0) {
      // Compare last_modified to resolve conflicts
      const serverEntry = existingEntry.rows[0];
      const clientModified = new Date(entry.last_modified);
      const serverModified = new Date(serverEntry.last_modified);

      if (clientModified > serverModified) {
        // Update server entry
        await db.query(
          `UPDATE time_entries SET 
           activity = $1, elapsed = $2, description = $3, tags = $4, 
           timestamp = $5, last_modified = $6
           WHERE id = $7 AND user_id = $8`,
          [
            entry.activity,
            entry.elapsed,
            entry.description,
            JSON.stringify(entry.tags),
            entry.timestamp,
            entry.last_modified,
            entry.id,
            userId,
          ]
        );
      }
    } else {
      // Insert new entry
      await db.query(
        `INSERT INTO time_entries
         (id, user_id, activity, elapsed, description, tags, timestamp, last_modified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          entry.id,
          userId,
          entry.activity,
          entry.elapsed,
          entry.description,
          JSON.stringify(entry.tags),
          entry.timestamp,
          entry.last_modified,
        ]
      );
    }

    syncedIds.push(entry.id);
  }

  return { syncedIds };
}

async function getChangedEntriesForUser(userId: string): Promise<TimeEntry[]> {
  // Get entries changed on the server
  const result = await db.query(
    "SELECT * FROM time_entries WHERE user_id = $1 ORDER BY last_modified DESC",
    [userId]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    activity: row.activity,
    elapsed: row.elapsed,
    description: row.description,
    tags: JSON.parse(row.tags),
    timestamp: row.timestamp,
    last_modified: row.last_modified,
  }));
}

export default syncRouter;
