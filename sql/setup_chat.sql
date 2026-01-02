-- 1. Create the chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, -- References your app's existing users table
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'system', 'now_playing', 'request_approved', 'milestone')) DEFAULT 'text',
    reply_to_id BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    delete_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Realtime for this table
-- This allows the frontend to receive new messages instantly
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 3. Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Public view access"
ON chat_messages FOR SELECT
USING (true);

-- Allow authenticated users (or anyone for now, if auth isn't independent) to insert
-- Adjust this policy based on your needs. 
-- If you handle auth in your backend API, you might insert messages via the service_role key, bypassing RLS.
-- If you insert from frontend directly, you need a policy.
CREATE POLICY "Insert access"
ON chat_messages FOR INSERT
WITH CHECK (true);
