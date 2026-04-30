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

### 2. Database Schema & Auth (Supabase)

#### Authentication
1.  Go to **Authentication** > **Providers** in your Supabase Dashboard.
2.  Enable the **Email** provider.
3.  (Optional for testing) Disable **Confirm email** to allow instant login after registration.

#### Database Tables
Run the following SQL in your Supabase SQL Editor:

```sql
-- The 'contacts' table should already exist. 
-- Ensure it has RLS enabled so guests can only see their own history if they are logged in.
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to see only their own bookings based on email
CREATE POLICY "Users can view their own booking history" ON contacts
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- STAFF POLICIES (Run these to enable the Admin Dashboard)
-- Replace 'staff@grandhorizon.com' with your actual staff email
CREATE POLICY "Staff can view all bookings" ON contacts
  FOR SELECT USING (auth.jwt() ->> 'email' = 'humbledove2004@gmail.com');

CREATE POLICY "Staff can update bookings" ON contacts
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'humbledove2004@gmail.com');

CREATE POLICY "Staff can delete bookings" ON contacts
  FOR DELETE USING (auth.jwt() ->> 'email' = 'humbledove2004@gmail.com');

-- NEWSLETTER TABLE
CREATE TABLE subscribers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for newsletter
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (Insert)
CREATE POLICY "Anyone can subscribe to newsletter" ON subscribers
  FOR INSERT WITH CHECK (true);

-- Allow staff to manage subscribers
CREATE POLICY "Staff can manage newsletter" ON subscribers
  FOR ALL USING (auth.jwt() ->> 'email' = 'humbledove2004@gmail.com');
```

### ⚡ Troubleshooting "Database Outdated" or Missing Column
If you created your database earlier and see a "payment_method missing" error, run this SQL:
```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'request';
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

#### Stripe (Payment System)
To collect payments securely:
1.  Create an account at [Stripe.com](https://stripe.com/).
2.  In the Dashboard, go to **Payment Links** and create a new link for your suites (e.g., $499 for Aegean View Suite).
3.  Copy the **Payment Link URL**.
4.  Open `javascript/booking.js`.
5.  Replace `STRIPE_PAYMENT_LINK` with your link.
6.  (Optional) For full automation, set up a **Stripe Webhook** to your backend (requires a server or Supabase Edge Function).

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
