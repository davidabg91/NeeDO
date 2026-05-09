const CLOUD_FUNCTIONS_BASE_URL = "https://europe-west1-needo-3cfbd.cloudfunctions.net";

export const stripeService = {
  /**
   * Calls the backend to create a Stripe Express account and returns the onboarding URL.
   */
  async createStripeAccount(userId: string, accountType: 'individual' | 'company' = 'individual'): Promise<string> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/createStripeAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountType }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create Stripe account");
    }

    const data = await res.json();
    return data.url;
  },

  /**
   * Calls the backend to create a Payment Intent for Escrow.
   * Returns the clientSecret to be used with Stripe Elements.
   */
  async createPaymentIntent(taskId: string, amountEuro: number): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/createPaymentIntent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, amount: amountEuro, currency: "eur" }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create payment intent");
    }

    return await res.json();
  },

  /**
   * Calls the backend to capture the Payment Intent and transfer funds to the provider.
   */
  async releaseEscrow(paymentIntentId: string, providerAccountId: string, amountEuro: number): Promise<boolean> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/releaseEscrow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId,
        providerAccountId,
        amount: amountEuro, // This is the base Agreed Price
        platformFeePercent: 5 // Provider pays 5% of base price (Client already paid extra 5%)
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to release escrow");
    }

    return true;
  },

  /**
   * Checks if the user has completed Stripe onboarding.
   */
  async checkStripeStatus(userId: string): Promise<{ onboardingComplete: boolean }> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/checkStripeStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to check Stripe status");
    }

    return await res.json();
  },

  /**
   * Generates a login link for the Stripe Express Dashboard.
   */
  async createStripeLoginLink(userId: string): Promise<string> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/createStripeLoginLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create login link");
    }

    const data = await res.json();
    return data.url;
  },

  /**
   * Fetches the real-time balance from Stripe for the user.
   */
  async getStripeBalance(userId: string): Promise<{ available: number; pending: number; currency: string }> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/getStripeBalance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch balance");
    }

    return await res.json();
  }
};

