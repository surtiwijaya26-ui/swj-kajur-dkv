/*
# Create PKL DKV Database Schema

This migration creates the core tables for the PKL (Praktek Kerja Lapangan / Internship) 
management system for SMK Negeri 14 Kabupaten Tangerang - Desain Komunikasi Visual (DKV) program.

## 1. New Tables

### `companies`
- id (uuid, primary key) - Unique identifier for each company/partner
- name (text, not null) - Company name (e.g., PT Creative Digital Indonesia)
- industry (text) - Industry type (e.g., Creative Agency, Production House, Software Technology)
- address (text) - Physical address of the company
- contact_person (text) - HRD or contact person name
- contact_email (text) - Contact email address
- contact_phone (text) - Contact phone number
- slots (integer, default 2) - Maximum PKL student quota/internship slots available
- description (text) - Brief description of the company
- website (text) - Company website URL
- created_at (timestamptz) - Record creation timestamp

### `students`
- id (uuid, primary key) - Unique identifier for each student
- name (text, not null) - Student full name
- class_name (text, not null) - Class identifier (e.g., XII DKV 1, XII DKV 2)
- nisn (text, unique) - National Student ID Number
- email (text) - Student email address
- phone (text) - Student phone number
- skills (text[]) - Array of DKV skills (e.g., Adobe Photoshop, Video Editing, UI/UX Design)
- portfolio_highlight (text) - Brief description of notable portfolio work
- portfolio_link (text) - URL to portfolio (Behance, Google Drive, etc.)
- status (text, default 'Unassigned') - PKL status: Unassigned, Pending, Ongoing, Completed
- company_id (uuid, foreign key) - Reference to assigned company (null if unassigned)
- start_date (date) - PKL start date
- end_date (date) - PKL end date
- notes (text) - Additional notes about the student
- created_at (timestamptz) - Record creation timestamp

### `logbooks`
- id (uuid, primary key) - Unique identifier for each logbook entry
- student_id (uuid, foreign key) - Reference to the student
- date (date, not null) - Date of the activity
- activity (text, not null) - Description of daily PKL activity
- tools_used (text[]) - Array of software/tools used (e.g., Adobe Illustrator, Figma)
- obstacle (text) - Challenges or obstacles encountered
- solution (text) - Solutions applied to overcome obstacles
- project_link (text) - URL to the work/result if available
- approved_by_dudi (boolean, default false) - Approval status from industry supervisor (DUDI)
- approved_by_teacher (boolean, default false) - Approval status from school teacher
- dudi_feedback (text) - Feedback from industry supervisor
- teacher_feedback (text) - Feedback from school teacher
- created_at (timestamptz) - Record creation timestamp
- updated_at (timestamptz) - Last update timestamp

## 2. Security

- Enable Row Level Security (RLS) on all tables.
- This is a single-tenant application for school staff to manage PKL data.
- Allow anon + authenticated access for all CRUD operations (shared/public data).
- Policies use `USING (true)` because data is intentionally shared among school staff.

## 3. Indexes

- Index on students.company_id for quick lookup of students by company
- Index on students.status for filtering by PKL status
- Index on logbooks.student_id for quick lookup of logbook entries by student
- Index on logbooks.date for chronological ordering
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  address text,
  contact_person text,
  contact_email text,
  contact_phone text,
  slots integer NOT NULL DEFAULT 2,
  description text,
  website text,
  created_at timestamptz DEFAULT now()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_name text NOT NULL,
  nisn text UNIQUE,
  email text,
  phone text,
  skills text[] DEFAULT '{}',
  portfolio_highlight text,
  portfolio_link text,
  status text NOT NULL DEFAULT 'Unassigned' CHECK (status IN ('Unassigned', 'Pending', 'Ongoing', 'Completed')),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create logbooks table
CREATE TABLE IF NOT EXISTS logbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  activity text NOT NULL,
  tools_used text[] DEFAULT '{}',
  obstacle text,
  solution text,
  project_link text,
  approved_by_dudi boolean DEFAULT false,
  approved_by_teacher boolean DEFAULT false,
  dudi_feedback text,
  teacher_feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_students_company_id ON students(company_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_logbooks_student_id ON logbooks(student_id);
CREATE INDEX IF NOT EXISTS idx_logbooks_date ON logbooks(date);

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbooks ENABLE ROW LEVEL SECURITY;

-- Companies policies (single-tenant, shared data)
DROP POLICY IF EXISTS "anon_access_companies" ON companies;
CREATE POLICY "anon_access_companies" ON companies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_companies" ON companies;
CREATE POLICY "anon_insert_companies" ON companies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_companies" ON companies;
CREATE POLICY "anon_update_companies" ON companies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_companies" ON companies;
CREATE POLICY "anon_delete_companies" ON companies FOR DELETE
  TO anon, authenticated USING (true);

-- Students policies (single-tenant, shared data)
DROP POLICY IF EXISTS "anon_access_students" ON students;
CREATE POLICY "anon_access_students" ON students FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE
  TO anon, authenticated USING (true);

-- Logbooks policies (single-tenant, shared data)
DROP POLICY IF EXISTS "anon_access_logbooks" ON logbooks;
CREATE POLICY "anon_access_logbooks" ON logbooks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_logbooks" ON logbooks;
CREATE POLICY "anon_insert_logbooks" ON logbooks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_logbooks" ON logbooks;
CREATE POLICY "anon_update_logbooks" ON logbooks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_logbooks" ON logbooks;
CREATE POLICY "anon_delete_logbooks" ON logbooks FOR DELETE
  TO anon, authenticated USING (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logbooks updated_at
DROP TRIGGER IF EXISTS update_logbooks_updated_at ON logbooks;
CREATE TRIGGER update_logbooks_updated_at
  BEFORE UPDATE ON logbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();