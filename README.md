# Grand Horizon Suites

Grand Horizon Suites is a premium luxury hotel digital experience located in Accra, Ghana. This project combines modern web technologies with a sophisticated UI to provide a seamless guest experience.

## 🚀 Features

-   **Modular Architecture**: JavaScript logic is split into feature-specific modules for scalability.
-   **Supabase Integration**: Powering the newsletter and contact/booking forms with real-time updates.
-   **Leaflet.js Map**: Integrated real-time GPS tracking for guests in the Accra coastal district.
-   **Context-Aware Booking**: Prefills booking requests based on the guest's current activity (Dining, Spa, or Offers).
-   **Responsive & SEO Optimized**: Mobile-first design with JSON-LD structured data for search engine visibility.

## 🛠️ Setup Instructions

### 1. Prerequisites
-   A [Supabase](https://supabase.com/) account.
-   A web server (e.g., Live Server in VS Code).

### 2. Database Schema (Supabase)
Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  check_in DATE,
  check_out DATE,
  guests TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  replied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow anyone to insert, only admins to read)
CREATE POLICY "Enable insert for everyone" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for everyone" ON subscribers FOR INSERT WITH CHECK (true);
```

### 3. Configuration

#### Supabase
1.  Open `javascript/supabase-config.js`.
2.  Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your project's credentials.

#### EmailJS (Mailing System)
To receive real-time emails without a backend:
1.  Create a free account at [EmailJS.com](https://www.emailjs.com/).
2.  Add an **Email Service** (e.g., Gmail).
3.  Create an **Email Template** with these variable names: `{{to_name}}`, `{{to_email}}`, `{{message}}`, `{{phone}}`, `{{check_in}}`, `{{check_out}}`, `{{guests}}`.
4.  Open `javascript/contact-service.js`.
5.  Update `init()` with your `PUBLIC_KEY`.
6.  Update `sendEmail()` with your `SERVICE_ID` and `TEMPLATE_ID`.

## 📂 Project Structure

-   `/html`: Main page templates (index, dining, spa, offers).
-   `/javascript`: Modular logic scripts.
-   `/stylesheet`: Global CSS styles.
-   `/images`: High-quality assets for the luxury experience.

## 🌐 Future Phases
-   **Phase 2**: AI Concierge (NLP Chatbot).
-   **Phase 3**: Virtual 360° Tours for suites.
-   **Phase 4**: Multi-Language Support.
-   **Phase 5**: Guest Loyalty Portal.

---
© 2026 Grand Horizon Suites. All rights reserved.
