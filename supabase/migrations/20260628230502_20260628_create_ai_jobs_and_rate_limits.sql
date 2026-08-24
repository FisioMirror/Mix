/*
# Create AI Jobs and Rate Limits tables

1. New Tables
- `ai_jobs`: queue for async AI processing jobs (image analysis, text generation)
  - id (uuid, primary key)
  - type (text: 'image_analysis' | 'text_generation')
  - input_data (jsonb: stores imageBase64, prompt, userPrompt)
  - status (text: 'pending' | 'processing' | 'completed' | 'failed')
  - result (text: AI generated response)
  - error (text: error message if failed)
  - created_at, updated_at (timestamps)
- `rate_limits`: simple rate limiting by IP address
  - ip (text, primary key)
  - count (integer: request count in current window)
  - last_request (timestamptz)

2. Security
- RLS enabled on both tables.
- Policies allow anon + authenticated CRUD since the edge functions use service role key
  and the frontend needs to create jobs and poll for results.
*/

CREATE TABLE IF NOT EXISTS ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('image_analysis', 'text_generation')),
  input_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result text,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ai_jobs" ON ai_jobs;
CREATE POLICY "select_ai_jobs" ON ai_jobs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_ai_jobs" ON ai_jobs;
CREATE POLICY "insert_ai_jobs" ON ai_jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_ai_jobs" ON ai_jobs;
CREATE POLICY "update_ai_jobs" ON ai_jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_ai_jobs" ON ai_jobs;
CREATE POLICY "delete_ai_jobs" ON ai_jobs FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS rate_limits (
  ip text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  last_request timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_rate_limits" ON rate_limits;
CREATE POLICY "select_rate_limits" ON rate_limits FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_rate_limits" ON rate_limits;
CREATE POLICY "insert_rate_limits" ON rate_limits FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_rate_limits" ON rate_limits;
CREATE POLICY "update_rate_limits" ON rate_limits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_rate_limits" ON rate_limits;
CREATE POLICY "delete_rate_limits" ON rate_limits FOR DELETE
  TO anon, authenticated USING (true);
