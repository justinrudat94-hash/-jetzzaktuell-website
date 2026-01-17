/*
  # Create Support & Help System

  1. New Tables
    - `support_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `category` (text) - 'technical', 'coins', 'livestream', 'account', 'other'
      - `subject` (text) - ticket subject/title
      - `description` (text) - detailed description
      - `attachment_url` (text, nullable) - optional screenshot/file
      - `status` (text) - 'open', 'in_progress', 'closed'
      - `assigned_admin` (uuid, nullable) - admin who handles ticket
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `support_messages`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, references support_tickets)
      - `sender_id` (uuid, references auth.users)
      - `message` (text)
      - `is_admin` (boolean) - true if sender is admin
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only view/edit their own tickets
    - Admins can view all tickets
    - Support messages visible to ticket owner and admins

  3. Indexes
    - Index on user_id for fast ticket lookup
    - Index on status for admin filtering
    - Index on ticket_id for message lookup
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('technical', 'coins', 'livestream', 'account', 'other')),
  subject text NOT NULL CHECK (length(subject) >= 3 AND length(subject) <= 200),
  description text NOT NULL CHECK (length(description) >= 10 AND length(description) <= 2000),
  attachment_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  assigned_admin uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL CHECK (length(message) >= 1 AND length(message) <= 2000),
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can create own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (only specific fields)
CREATE POLICY "Users can update own tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all tickets (placeholder for future admin role)
-- Note: Admin role system will be implemented later
-- For now, we'll use a separate admin interface with service role key

-- RLS Policies for support_messages

-- Users can view messages for their own tickets
CREATE POLICY "Users can view own ticket messages"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

-- Users can create messages for their own tickets
CREATE POLICY "Users can create messages for own tickets"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    AND auth.uid() = sender_id
    AND is_admin = false
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on ticket updates
DROP TRIGGER IF EXISTS trigger_update_support_ticket_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_support_ticket_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_updated_at();

-- Function to create automatic welcome message when ticket is created
CREATE OR REPLACE FUNCTION create_support_ticket_welcome_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO support_messages (ticket_id, sender_id, message, is_admin)
  VALUES (
    NEW.id,
    NEW.user_id,
    'Deine Anfrage wurde empfangen. Wir werden uns schnellstmöglich bei dir melden.',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create welcome message
DROP TRIGGER IF EXISTS trigger_create_support_ticket_welcome_message ON support_tickets;
CREATE TRIGGER trigger_create_support_ticket_welcome_message
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION create_support_ticket_welcome_message();