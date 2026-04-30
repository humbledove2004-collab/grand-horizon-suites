// Validation Utilities - Enhanced Server-Side Validation
class ValidationService {
  constructor() {
    this.rules = {
      email: {
        // RFC 5322 compliant email regex with additional restrictions
        pattern:
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        message: "Please enter a valid email address (e.g., name@example.com)",
      },
      phone: {
        pattern: /^\+?[1-9]\d{1,14}$/,
        message: "Please enter a valid phone number with country code",
      },
      name: {
        minLength: 2,
        maxLength: 100,
        message: "Name must be between 2-100 characters",
      },
      message: {
        maxLength: 1000,
        message: "Message cannot exceed 1000 characters",
      },
      guests: {
        pattern: /^[1-9][0-9]*\+?$/,
        message: "Please select a valid number of guests",
      },
    };
  }

  // Validate email format
  validateEmail(email) {
    if (!email || typeof email !== "string") {
      return { valid: false, message: "Email address is required" };
    }

    const trimmed = email.trim().toLowerCase();

    // Check for empty email after trimming
    if (!trimmed) {
      return { valid: false, message: "Email address cannot be empty" };
    }

    // Check length constraints (RFC 5321)
    if (trimmed.length > 254) {
      return {
        valid: false,
        message: "Email address is too long (maximum 254 characters)",
      };
    }

    // Check basic format
    if (!this.rules.email.pattern.test(trimmed)) {
      return { valid: false, message: this.rules.email.message };
    }

    // Additional validation checks
    const [localPart, domainPart] = trimmed.split("@");

    // Local part checks
    if (localPart.length > 64) {
      return {
        valid: false,
        message: "Email username is too long (maximum 64 characters)",
      };
    }

    if (localPart.startsWith(".") || localPart.endsWith(".")) {
      return {
        valid: false,
        message: "Email username cannot start or end with a dot",
      };
    }

    if (localPart.includes("..")) {
      return {
        valid: false,
        message: "Email username cannot contain consecutive dots",
      };
    }

    // Domain part checks
    if (!domainPart || domainPart.length < 1) {
      return { valid: false, message: "Email domain is required" };
    }

    if (domainPart.startsWith(".") || domainPart.endsWith(".")) {
      return {
        valid: false,
        message: "Email domain cannot start or end with a dot",
      };
    }

    if (domainPart.includes("..")) {
      return {
        valid: false,
        message: "Email domain cannot contain consecutive dots",
      };
    }

    // Check for valid TLD (at least 2 characters)
    const tld = domainPart.split(".").pop();
    if (!tld || tld.length < 2) {
      return {
        valid: false,
        message: "Email domain must have a valid top-level domain",
      };
    }

    // Check for common disposable email domains (optional but recommended)
    const disposableDomains = [
      "10minutemail.com",
      "guerrillamail.com",
      "mailinator.com",
      "temp-mail.org",
      "throwaway.email",
      "yopmail.com",
    ];

    if (disposableDomains.some((domain) => domainPart.includes(domain))) {
      return {
        valid: false,
        message:
          "Temporary email addresses are not allowed. Please use a permanent email address.",
      };
    }

    return { valid: true };
  }

  // Validate phone number
  validatePhone(phone) {
    if (!phone || typeof phone !== "string") {
      return { valid: false, message: "Phone number is required" };
    }

    const trimmed = phone.trim();
    if (!this.rules.phone.pattern.test(trimmed.replace(/\s+/g, ""))) {
      return { valid: false, message: this.rules.phone.message };
    }

    return { valid: true };
  }

  // Validate name
  validateName(name) {
    if (!name || typeof name !== "string") {
      return { valid: false, message: "Name is required" };
    }

    const trimmed = name.trim();
    if (trimmed.length < this.rules.name.minLength) {
      return { valid: false, message: this.rules.name.message };
    }

    if (trimmed.length > this.rules.name.maxLength) {
      return { valid: false, message: this.rules.name.message };
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
      return { valid: false, message: "Name contains invalid characters" };
    }

    return { valid: true };
  }

  // Validate message
  validateMessage(message) {
    if (!message || typeof message !== "string") {
      return { valid: true }; // Message is optional
    }

    if (message.length > this.rules.message.maxLength) {
      return { valid: false, message: this.rules.message.message };
    }

    return { valid: true };
  }

  // Validate guests
  validateGuests(guests) {
    if (!guests) {
      return { valid: true }; // Optional field
    }

    if (!this.rules.guests.pattern.test(guests.toString())) {
      return { valid: false, message: this.rules.guests.message };
    }

    return { valid: true };
  }

  // Validate dates
  validateDates(checkin, checkout) {
    if (!checkin && !checkout) {
      return { valid: true }; // Both optional
    }

    if (!checkin || !checkout) {
      return {
        valid: false,
        message: "Both check-in and check-out dates are required",
      };
    }

    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkinDate < today) {
      return { valid: false, message: "Check-in date cannot be in the past" };
    }

    if (checkoutDate <= checkinDate) {
      return {
        valid: false,
        message: "Check-out date must be after check-in date",
      };
    }

    // Check for reasonable booking duration (max 365 days)
    const diffTime = Math.abs(checkoutDate - checkinDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365) {
      return {
        valid: false,
        message: "Booking duration cannot exceed 365 days",
      };
    }

    return { valid: true };
  }

  // Validate entire booking form
  validateBookingForm(formData) {
    const errors = [];

    // Required fields
    const nameValidation = this.validateName(formData.name);
    if (!nameValidation.valid) errors.push(nameValidation.message);

    const emailValidation = this.validateEmail(formData.email);
    if (!emailValidation.valid) errors.push(emailValidation.message);

    // Optional but validated if provided
    if (formData.phone) {
      const phoneValidation = this.validatePhone(formData.phone);
      if (!phoneValidation.valid) errors.push(phoneValidation.message);
    }

    if (formData.message) {
      const messageValidation = this.validateMessage(formData.message);
      if (!messageValidation.valid) errors.push(messageValidation.message);
    }

    if (formData.guests) {
      const guestsValidation = this.validateGuests(formData.guests);
      if (!guestsValidation.valid) errors.push(guestsValidation.message);
    }

    if (formData.checkin || formData.checkout) {
      const datesValidation = this.validateDates(
        formData.checkin,
        formData.checkout,
      );
      if (!datesValidation.valid) errors.push(datesValidation.message);
    }

    // Payment method validation
    if (
      formData.payment_method &&
      !["request", "stripe"].includes(formData.payment_method)
    ) {
      errors.push("Invalid payment method selected");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  // Validate newsletter subscription
  validateNewsletter(email) {
    const emailValidation = this.validateEmail(email);
    if (!emailValidation.valid) {
      return { valid: false, message: emailValidation.message };
    }

    return { valid: true };
  }

  // Sanitize input data
  sanitizeInput(input) {
    if (typeof input !== "string") return input;

    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .substring(0, 10000); // Prevent extremely long inputs
  }

  // Rate limiting check (basic client-side)
  checkRateLimit(identifier, action = "submit") {
    const key = `${action}_${identifier}`;
    const now = Date.now();
    const lastAttempt = localStorage.getItem(key);

    if (lastAttempt && now - parseInt(lastAttempt) < 30000) {
      // 30 seconds
      return {
        allowed: false,
        message: "Please wait 30 seconds before submitting again",
      };
    }

    localStorage.setItem(key, now.toString());
    return { allowed: true };
  }
}

// Create global instance
const validationService = new ValidationService();

// Make it globally available
window.GH = window.GH || {};
window.GH.validation = validationService;
