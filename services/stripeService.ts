const CLOUD_FUNCTIONS_BASE_URL = "https://europe-west1-needo-3cfbd.cloudfunctions.net";

export const stripeService = {
  /**
   * Calls the backend to create a Stripe Express account and returns the onboarding URL.
   */
  async createStripeAccount(userId: string, accountType: 'individual' | 'company' = 'individual', companyName?: string, taxId?: string): Promise<string> {
    if (!userId) throw new Error("Missing userId");
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/createStripeAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountType, companyName, taxId }),
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
  async checkStripeStatus(userId: string, accountType: 'individual' | 'company' = 'individual'): Promise<{ onboardingComplete: boolean }> {
    if (!userId) throw new Error("Missing userId");
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/checkStripeStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountType }),
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
    if (!userId) throw new Error("Missing userId");
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
  async getStripeBalance(userId: string, accountType: 'individual' | 'company' = 'individual'): Promise<{ available: number; pending: number; currency: string }> {
    if (!userId) throw new Error("Missing userId");
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/getStripeBalance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountType }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch balance");
    }

    return await res.json();
  },

  /**
   * Creates a Payment Intent for materials (direct transfer to provider).
   */
  async createMaterialsPaymentIntent(amountEuro: number, providerAccountId: string, taskId: string, paymentId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/createMaterialsPaymentIntent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountEuro, providerAccountId, taskId, paymentId, currency: "eur" }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create materials payment intent");
    }

    return await res.json();
  },

  /**
   * Creates a Payment Intent for additional escrow funds.
   */
  async createAdditionalFundsIntent(amountEuro: number, taskId: string, circumstanceId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/createAdditionalFundsIntent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountEuro, taskId, circumstanceId, currency: "eur" }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create additional funds intent");
    }

    return await res.json();
  },

  /**
   * Refunds the escrow amount to the client (for mutual cancellation).
   */
  async refundTaskEscrow(paymentIntentId: string, amountEuro?: number, taskId?: string): Promise<boolean> {
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/refundTaskEscrow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId, amount: amountEuro, taskId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to refund escrow");
    }

    return true;
  },

  /**
   * Fetches the recent balance transactions for the user's Stripe account.
   */
  async getStripeTransactions(userId: string, accountType: 'individual' | 'company' = 'individual'): Promise<any[]> {
    if (!userId) throw new Error("Missing userId");
    const res = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/getStripeTransactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountType }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to fetch transactions");
    }

    const data = await res.json();
    return data.transactions;
  }
};

