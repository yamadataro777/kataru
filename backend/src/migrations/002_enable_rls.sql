-- Enable Row Level Security on all public tables
-- Backend uses service_role key which bypasses RLS.
-- No anon policies needed since frontend never queries tables directly.

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
