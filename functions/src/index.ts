import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import * as corsLib from "cors";

admin.initializeApp();

// Initialize Stripe with your Secret Key.
// In production, use functions.config().stripe.secret or Google Cloud Secret Manager.
// For now, we will use a hardcoded testing key or env variable if provided.
const stripeSecret = process.env.STRIPE_SECRET_KEY || "sk_test_PLACEHOLDER";
const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-04-10",
});

const cors = corsLib({ origin: true });

// 1. Create a Stripe Connect Express Account
export const createStripeAccount = functions.region('europe-west1').runWith({ memory: '512MB', timeoutSeconds: 60 }).https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { userId, accountType = "individual" } = req.body;
      if (!userId) {
        res.status(400).send({ error: "Missing userId" });
        return;
      }

      // Check if user already has an account
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      let accountId = userData?.stripeAccountId;

      // Create or update Stripe Express account
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "BG",
          email: userData?.email || undefined,
          business_type: accountType === "company" ? "company" : "individual",
          business_profile: {
            mcc: "7299", // General Services
            url: "https://needo-3cfbd.web.app",
            product_description: "Service provider on Needo platform",
          },
          capabilities: {
            transfers: { requested: true },
          },
          settings: {
            payouts: {
              schedule: {
                interval: "manual",
              },
            },
          },
        });
        accountId = account.id;

        // Save account ID to Firestore
        await admin.firestore().collection("users").doc(userId).update({
          stripeAccountId: accountId,
        });
      }

      // Create an Account Link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${req.headers.origin}/profile`,
        return_url: `${req.headers.origin}/profile?stripe_return=true`,
        type: "account_onboarding",
      });

      res.status(200).send({ url: accountLink.url });
    } catch (error: any) {
      console.error("Stripe Account Error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

// 3. Check Stripe Account Status (to see if onboarding is complete)
export const checkStripeStatus = functions.region('europe-west1').https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).send({ error: "Missing userId" });
        return;
      }

      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      const accountId = userData?.stripeAccountId;

      if (!accountId) {
        res.status(200).send({ onboardingComplete: false });
        return;
      }

      const account = await stripe.accounts.retrieve(accountId);
      
      // Check if they can receive payouts and charges
      const onboardingComplete = account.details_submitted && account.charges_enabled;

      if (onboardingComplete && !userData?.stripeOnboardingComplete) {
        await admin.firestore().collection("users").doc(userId).update({
          stripeOnboardingComplete: true
        });
      }

      res.status(200).send({ 
        onboardingComplete,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled
      });
    } catch (error: any) {
      console.error("Check Stripe Status Error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

// 4. Create Stripe Login Link (for Express Dashboard)
export const createStripeLoginLink = functions.region('europe-west1').https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).send({ error: "Missing userId" });
        return;
      }

      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      const accountId = userData?.stripeAccountId;

      if (!accountId) {
        res.status(400).send({ error: "No Stripe account found for this user" });
        return;
      }

      const loginLink = await stripe.accounts.createLoginLink(accountId);
      res.status(200).send({ url: loginLink.url });
    } catch (error: any) {
      console.error("Create Login Link Error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});
export const createPaymentIntent = functions.region('europe-west1').https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { amount, currency = "eur", taskId } = req.body;
      if (!amount || !taskId) {
        res.status(400).send({ error: "Missing amount or taskId" });
        return;
      }

      // Amount should be in smallest unit (e.g., cents)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency,
        // Manual capture holds the funds until we explicitly capture them
        capture_method: "manual",
        metadata: { taskId },
      });

      res.status(200).send({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Payment Intent Error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

// 3. Release Escrow (Capture Payment Intent and Transfer to Provider)
export const releaseEscrow = functions.region('europe-west1').https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { paymentIntentId, providerAccountId, amount, platformFeePercent = 5 } = req.body;
      
      if (!paymentIntentId || !providerAccountId || !amount) {
        res.status(400).send({ error: "Missing required parameters" });
        return;
      }

      // 1. Retrieve the Payment Intent to check its current status
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (intent.status === 'requires_capture') {
        // Capture the original Payment Intent (takes the money from client)
        await stripe.paymentIntents.capture(paymentIntentId);
      } else if (intent.status === 'succeeded') {
        // Already captured, proceed to transfer
        console.log(`PaymentIntent ${paymentIntentId} was already captured.`);
      } else {
        res.status(400).send({ error: `PaymentIntent is in status ${intent.status}, cannot release.` });
        return;
      }

      // 2. Calculate provider payout (amount - platform fee)
      const providerAmount = amount * (1 - platformFeePercent / 100);
      const providerAmountInCents = Math.round(providerAmount * 100);

      // 3. Transfer the payout to the provider's connected account
      // Note: We use the paymentIntentId as the transfer_group to link them
      const transfer = await stripe.transfers.create({
        amount: providerAmountInCents,
        currency: intent.currency,
        destination: providerAccountId,
        transfer_group: paymentIntentId,
      });

      res.status(200).send({ success: true, transferId: transfer.id });
    } catch (error: any) {
      console.error("Release Escrow Error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

// 5. Stripe Webhook Handler
export const stripeWebhook = functions.region('europe-west1').runWith({ memory: '512MB' }).https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  let event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error("Missing signature or endpoint secret");
    }
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook Signature Error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
        // Here you can update task status in Firestore if needed
        break;
      
      case "account.updated":
        const account = event.data.object as Stripe.Account;
        if (account.details_submitted && account.charges_enabled) {
           // Find user by stripeAccountId and update their status
           const usersSnapshot = await admin.firestore().collection("users")
             .where("stripeAccountId", "==", account.id)
             .limit(1)
             .get();
           
           if (!usersSnapshot.empty) {
             const userDoc = usersSnapshot.docs[0];
             await userDoc.ref.update({ stripeOnboardingComplete: true });
             console.log(`User ${userDoc.id} verified via webhook.`);
           }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook Handler Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 6. Get Account Balance
export const getStripeBalance = functions.region('europe-west1').https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).send({ error: "Missing userId" });
        return;
      }

      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      const accountId = userData?.stripeAccountId;

      if (!accountId) {
        res.status(200).send({ available: 0, pending: 0, currency: "eur" });
        return;
      }

      const balance = await stripe.balance.retrieve({
        stripeAccount: accountId,
      });

      // Balance can have multiple currencies, we'll find EUR or use the first one
      const eurAvailable = balance.available.find(b => b.currency === 'eur')?.amount || 0;
      const eurPending = balance.pending.find(b => b.currency === 'eur')?.amount || 0;

      res.status(200).send({
        available: eurAvailable / 100,
        pending: eurPending / 100,
        currency: "eur"
      });
    } catch (error: any) {
      console.error("Get Balance Error:", error);
      
      // If the account was revoked or doesn't exist under the current API key, gracefully return 0 instead of crashing
      if (error.message && (error.message.includes('does not have access to account') || error.message.includes('No such account'))) {
        res.status(200).send({ available: 0, pending: 0, currency: "eur", error: "revoked" });
      } else {
        res.status(500).send({ error: error.message });
      }
    }
  });
});


