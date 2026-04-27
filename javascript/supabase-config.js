// Supabase Configuration
// IMPORTANT: In a production environment, use environment variables or a secure backend
// to manage your Supabase keys. Never commit real secret keys to public repositories.
const SUPABASE_URL = "https://zfjyqvdwsbzarobyfzsz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmanlxdmR3c2J6YXJvYnlmenN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTEwMjMsImV4cCI6MjA4NTg4NzAyM30.Ot1DcL9vRc19KS6C7Egd2NEUkBOOF0AH26rKYpYDoH8";

// Stripe Configuration (Optional for Payment Links, Required for SDK)
const STRIPE_PUBLISHABLE_KEY = "pk_test_51T4JdDEubKPeyhMdMwCMwPmcnUmr1XDxbLzuooFhAAcxlWP8hsLuVyCCntzK7F7yWXPanYhHGY00iDpB7UWAjUTC00rUK2XcFi";
const stripe = typeof Stripe !== 'undefined' ? Stripe(STRIPE_PUBLISHABLE_KEY) : null;

// Initialize official Supabase client from CDN global safely.
const supabaseBrowserClient =
  typeof window !== "undefined" &&
  window.supabase &&
  typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Expose the initialized client explicitly for all app scripts.
window.GH = window.GH || {};
window.GH.supabase = supabaseBrowserClient;

// Initialize custom Supabase client (Backward compatibility)
const supabaseClient = (() => {
  const CONFIG_OK =
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.includes(".supabase.co") &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY.length > 10 &&
    SUPABASE_ANON_KEY.startsWith("ey");

  if (!CONFIG_OK) {
    console.error("Supabase configuration is invalid. Please check your URL and ANON KEY.");
  }

  return {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,

    async request(method, endpoint, data = null) {
      if (!CONFIG_OK) {
        throw new Error("Supabase configuration is missing or invalid. Check supabase-config.js.");
      }

      const url = `${this.url}/rest/v1${endpoint}`;
      const options = {
        method,
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          Prefer: "return=representation",
        },
      };

      if (data) options.body = JSON.stringify(data);

      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }
        return await response.json();
      } catch (e) {
        console.error(`[Supabase] Request Error (${method} ${endpoint}):`, e);
        // If it's already an Error with a message, keep it. Otherwise, assume a network failure.
        if (e.message && !e.message.includes('Unexpected token')) {
           throw e;
        }
        throw new Error("Network error: Failed to reach Supabase. Check your URL or internet.");
      }
    },

    // --- Newsletter Logic ---
    async insertSubscriber(emailData) {
      return this.request("POST", "/subscribers", emailData);
    },

    // --- Contact Form Logic ---
    async insertContact(contactData) {
      return this.request("POST", "/contacts", contactData);
    },

    async getContacts() {
      return this.request("GET", "/contacts?order=created_at.desc");
    },

    async getContact(id) {
      return this.request("GET", `/contacts?id=eq.${id}`);
    },

    async updateContact(id, updates) {
      return this.request("PATCH", `/contacts?id=eq.${id}`, updates);
    },

    // Polling-based subscription (used because full Supabase library is not included)
    subscribeToContacts(callback) {
      if (!CONFIG_OK) return () => {};
      
      const interval = setInterval(async () => {
        try {
          const contacts = await this.getContacts();
          callback(contacts);
        } catch (error) {
          // Silent fail on polling to avoid console spam
        }
      }, 5000); // Increased polling interval to 5s to reduce load

      return () => clearInterval(interval);
    },
  };
})();

// --- Front-end Event Listener ---
document.addEventListener("DOMContentLoaded", () => {
  const isConfigValid =
    typeof SUPABASE_URL === "string" &&
    SUPABASE_URL.includes(".supabase.co") &&
    typeof SUPABASE_ANON_KEY === "string" &&
    SUPABASE_ANON_KEY.startsWith("ey");

  if (!isConfigValid) {
    const banner = document.createElement('div');
    banner.style.cssText = "position:fixed; top:0; left:0; width:100%; background:#ff4d4d; color:white; padding:10px; text-align:center; z-index:9999; font-weight:bold;";
    banner.innerHTML = "Setup Required: Update Supabase URL and Key in javascript/supabase-config.js";
    document.body.prepend(banner);
  }
  // Select the elements from your footer
  const newsletterBtn = document.getElementById("newsletter-submit");
  const newsletterInput = document.getElementById("newsletter-email");

  // Safety check to ensure the HTML elements exist
  if (newsletterBtn && newsletterInput) {
    console.log("Newsletter system: Ready");

    newsletterBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const email = newsletterInput.value.trim();

      // Basic email validation
      if (!email || !email.includes("@")) {
        window.GH.toast("Please enter a valid email address.", "error", "Invalid Email");
        return;
      }

      try {
        // 1. Show Loading State (Spinner)
        const originalIcon = newsletterBtn.innerHTML;
        newsletterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        newsletterBtn.disabled = true;

        // 2. Database Call
        await supabaseClient.insertSubscriber({ email: email });

        // 3. Success State
        window.GH.toast("Success! You've been added to our list.", "success", "Welcome");
        newsletterInput.value = ""; // Clear the box
        newsletterBtn.innerHTML = originalIcon; // Reset icon
      } catch (err) {
        console.error("Supabase Error:", err);

        // Detailed error message for the user
        const msg = err.message.toLowerCase();
        if (msg.includes("unique")) {
          window.GH.toast("This email is already on our list!", "error", "Already Subscribed");
        } else if (msg.includes("row-level security") || msg.includes("policy")) {
          window.GH.toast("Database access restricted. Please check your Supabase RLS policies.", "error", "Access Denied");
        } else if (msg.includes("relation") && msg.includes("does not exist")) {
          window.GH.toast("Database table 'subscribers' missing. Please run the setup SQL from README.md.", "error", "Setup Required");
        } else {
          // Show the actual error message instead of a generic connection error
          window.GH.toast(err.message || "Something went wrong. Please check your connection.", "error", "Submission Error");
        }

        // Reset icon on error
        newsletterBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
      } finally {
        newsletterBtn.disabled = false;
      }
    });
  } else {
    console.error(
      "Newsletter Fix: Could not find HTML elements. Check your IDs.",
    );
  }
});
