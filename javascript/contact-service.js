// Contact Service - Handles all contact/email operations
class ContactService {
  constructor() {
    this.contacts = [];
    this.isLoading = false;
    this.unsubscribe = null;
  }

  // Initialize the service and start listening for updates
  async init() {
    try {
      // Initialize EmailJS with your Public Key
      if (typeof emailjs !== 'undefined') {
        emailjs.init("y9d96UEHknNtrLrDe");
      }

      await this.loadContacts();
      this.startRealtimeListener();
      console.log("Contact Service initialized");
    } catch (error) {
      console.error("Failed to initialize Contact Service:", error);
    }
  }

  // Load all contacts from Supabase
  async loadContacts() {
    this.isLoading = true;
    try {
      this.contacts = await supabaseClient.getContacts();
      this.triggerUpdate();
      return this.contacts;
    } catch (error) {
      console.error("Error loading contacts:", error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Submit a new contact/booking form
  async submitContact(formData) {
    try {
      const contactData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        check_in: formData.checkin || null,
        check_out: formData.checkout || null,
        guests: formData.guests,
        message: formData.message,
        status: "pending",
        created_at: new Date().toISOString(),
        replied: false,
      };

      const result = await supabaseClient.insertContact(contactData);

      // Send email via EmailJS
      await this.sendEmail(contactData);

      // Reload contacts to get the new entry
      await this.loadContacts();

      return result;
    } catch (error) {
      console.error("Error submitting contact:", error);
      throw error;
    }
  }

  // Send email via EmailJS (Client-side)
  async sendEmail(contactData) {
    try {
      // EmailJS Configuration - Replace these with your actual IDs from EmailJS dashboard
      const EMAILJS_CONFIG = {
        serviceID: "service_sa1ub8k",
        templateID: "template_f7bfksd",
        publicKey: "y9d96UEHknNtrLrDe" // Already initialized in init() but kept for reference
      };

      // Prepare template parameters to match your EmailJS template
      const templateParams = {
        to_name: contactData.name,
        to_email: contactData.email,
        from_name: "Grand Horizon Suites",
        message: contactData.message || "No message provided.",
        phone: contactData.phone || "N/A",
        check_in: contactData.check_in || "N/A",
        check_out: contactData.check_out || "N/A",
        guests: contactData.guests || "1",
        reply_to: contactData.email
      };

      const response = await emailjs.send(
        EMAILJS_CONFIG.serviceID,
        EMAILJS_CONFIG.templateID,
        templateParams
      );

      console.log("[ContactService] Email sent successfully:", response.status, response.text);
      return response;
    } catch (error) {
      console.error("[ContactService] Error sending email via EmailJS:", error);
    }
  }

  // Start real-time listener for contacts
  startRealtimeListener() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = supabaseClient.subscribeToContacts((contacts) => {
      this.contacts = contacts;
      this.triggerUpdate();
      // Notify admin dashboard if visible
      this.notifyAdminDashboard();
    });
  }

  // Stop real-time listener
  stopRealtimeListener() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // Trigger update callbacks
  triggerUpdate() {
    const event = new CustomEvent("contactsUpdated", {
      detail: { contacts: this.contacts },
    });
    window.dispatchEvent(event);
  }

  // Notify admin dashboard of new contact
  notifyAdminDashboard() {
    const event = new CustomEvent("adminNotification", {
      detail: {
        message: "New contact submission",
        contactCount: this.contacts.length,
      },
    });
    window.dispatchEvent(event);
  }

  // Get contacts by status
  getContactsByStatus(status) {
    return this.contacts.filter((c) => c.status === status);
  }

  // Update contact status (mark as replied, etc)
  async updateContactStatus(contactId, status) {
    try {
      await supabaseClient.updateContact(contactId, { status, replied: true });
      await this.loadContacts();
      return true;
    } catch (error) {
      console.error("Error updating contact status:", error);
      throw error;
    }
  }

  // Get contact statistics
  getStats() {
    return {
      total: this.contacts.length,
      pending: this.contacts.filter((c) => c.status === "pending").length,
      replied: this.contacts.filter((c) => c.replied).length,
      unreplied: this.contacts.filter((c) => !c.replied).length,
    };
  }
}

// Create global instance
const contactService = new ContactService();

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => contactService.init());
} else {
  contactService.init();
}
