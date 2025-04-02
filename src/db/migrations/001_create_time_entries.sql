CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"("id"),
    activity TEXT NOT NULL,
    elapsed BIGINT NOT NULL,
    description TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]',
    last_modified TIMESTAMPTZ NOT NULL,
    deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES "user"("id")
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_last_modified ON time_entries(last_modified); 