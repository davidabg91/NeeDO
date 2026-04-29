"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseEscrow = exports.createPaymentIntent = exports.createStripeAccount = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe_1 = require("stripe");
const corsLib = require("cors");
admin.initializeApp();
// Initialize Stripe with your Secret Key.
// In production, use functions.config().stripe.secret or Google Cloud Secret Manager.
// For now, we will use a hardcoded testing key or env variable if provided.
const stripeSecret = process.env.STRIPE_SECRET_KEY || "sk_test_PLACEHOLDER";
const stripe = new stripe_1.default(stripeSecret, {
    apiVersion: "2024-04-10",
});
const cors = corsLib({ origin: true });
// 1. Create a Stripe Connect Express Account
exports.createStripeAccount = functions.https.onRequest((req, res) => {
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
            // Check if user already has an account
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const userData = userDoc.data();
            let accountId = userData === null || userData === void 0 ? void 0 : userData.stripeAccountId;
            // Create new Stripe Express account if none exists
            if (!accountId) {
                const account = await stripe.accounts.create({
                    type: "express",
                    country: "BG",
                    email: (userData === null || userData === void 0 ? void 0 : userData.email) || undefined,
                    capabilities: {
                        transfers: { requested: true },
                    },
                    business_type: (userData === null || userData === void 0 ? void 0 : userData.isCompany) ? "company" : "individual",
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
        }
        catch (error) {
            console.error("Stripe Account Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// 2. Create Payment Intent (Escrow)
exports.createPaymentIntent = functions.https.onRequest((req, res) => {
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
        }
        catch (error) {
            console.error("Payment Intent Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// 3. Release Escrow (Capture Payment Intent and Transfer to Provider)
exports.releaseEscrow = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { paymentIntentId, providerAccountId, amount, platformFeePercent = 10 } = req.body;
            if (!paymentIntentId || !providerAccountId || !amount) {
                res.status(400).send({ error: "Missing required parameters" });
                return;
            }
            // 1. Capture the original Payment Intent (takes the money from client)
            const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId);
            // 2. Calculate provider payout (amount - platform fee)
            const providerAmount = amount * (1 - platformFeePercent / 100);
            const providerAmountInCents = Math.round(providerAmount * 100);
            // 3. Transfer the payout to the provider's connected account
            const transfer = await stripe.transfers.create({
                amount: providerAmountInCents,
                currency: capturedIntent.currency,
                destination: providerAccountId,
                transfer_group: paymentIntentId, // Links the transfer to the payment intent
            });
            res.status(200).send({ success: true, transferId: transfer.id });
        }
        catch (error) {
            console.error("Release Escrow Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
//# sourceMappingURL=index.js.map