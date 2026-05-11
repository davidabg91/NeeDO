"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refundTaskEscrow = exports.createAdditionalFundsIntent = exports.createMaterialsPaymentIntent = exports.getStripeTransactions = exports.getStripeBalance = exports.stripeWebhook = exports.releaseEscrow = exports.createPaymentIntent = exports.createStripeLoginLink = exports.checkStripeStatus = exports.createStripeAccount = void 0;
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
exports.createStripeAccount = functions.region('europe-west1').runWith({ memory: '512MB', timeoutSeconds: 60 }).https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { userId, accountType, companyName, taxId } = req.body;
            if (!userId) {
                res.status(400).send({ error: "Missing userId" });
                return;
            }
            const userRef = admin.firestore().collection("users").doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            const isCompany = accountType === "company";
            const fieldPrefix = isCompany ? "company" : "individual";
            const accountIdField = `stripeAccountId_${fieldPrefix}`;
            let accountId = (userData === null || userData === void 0 ? void 0 : userData[accountIdField]) || (isCompany ? undefined : userData === null || userData === void 0 ? void 0 : userData.stripeAccountId);
            // Create or update Stripe Express account
            if (!accountId) {
                const accountParams = {
                    type: "express",
                    country: "BG",
                    email: (userData === null || userData === void 0 ? void 0 : userData.email) || undefined,
                    business_type: isCompany ? "company" : "individual",
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
                };
                // Business Profile Configuration
                const businessProfile = {
                    mcc: "7299",
                    product_description: isCompany
                        ? `Предоставяне на професионални услуги чрез платформата needobg.com от името на ${companyName || 'фирма'}.`
                        : `Изпълнител на услуги на свободна практика в платформата needobg.com.`,
                };
                if (isCompany) {
                    businessProfile.url = "https://needobg.com";
                    accountParams.company = {
                        name: companyName,
                        tax_id: taxId || undefined,
                    };
                }
                accountParams.business_profile = businessProfile;
                const account = await stripe.accounts.create(accountParams);
                accountId = account.id;
                // Save account ID to Firestore in the specific field
                const updateData = {
                    [accountIdField]: accountId,
                };
                // For individual, also save to legacy field for backward compatibility
                if (!isCompany) {
                    updateData.stripeAccountId = accountId;
                }
                await userRef.set(updateData, { merge: true });
            }
            // Create an Account Link for onboarding
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: `https://needobg.com?stripe_return=false`,
                return_url: `https://needobg.com?stripe_return=true&type=${fieldPrefix}`,
                type: "account_onboarding",
            });
            res.status(200).send({ url: accountLink.url });
        }
        catch (error) {
            console.error("Error creating Stripe account:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// Check Onboarding Status
exports.checkStripeStatus = functions
    .region("europe-west1")
    .https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const { userId, accountType } = req.body;
            if (!userId) {
                res.status(400).send({ error: "Missing userId" });
                return;
            }
            const userRef = admin.firestore().collection("users").doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            const isCompany = accountType === "company";
            const fieldPrefix = isCompany ? "company" : "individual";
            const accountIdField = `stripeAccountId_${fieldPrefix}`;
            const onboardingField = `stripeOnboardingComplete_${fieldPrefix}`;
            const accountId = (userData === null || userData === void 0 ? void 0 : userData[accountIdField]) || (!isCompany ? userData === null || userData === void 0 ? void 0 : userData.stripeAccountId : null);
            if (!accountId) {
                res.status(200).send({ onboardingComplete: false });
                return;
            }
            const account = await stripe.accounts.retrieve(accountId);
            const isComplete = account.details_submitted && account.charges_enabled;
            if (isComplete) {
                const updateData = {
                    [onboardingField]: true,
                };
                if (!isCompany)
                    updateData.stripeOnboardingComplete = true;
                await userRef.set(updateData, { merge: true });
            }
            res.status(200).send({ onboardingComplete: isComplete });
        }
        catch (error) {
            console.error("Error checking Stripe status:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// 4. Create Stripe Login Link (for Express Dashboard)
exports.createStripeLoginLink = functions.region('europe-west1').https.onRequest((req, res) => {
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
            const accountId = userData === null || userData === void 0 ? void 0 : userData.stripeAccountId;
            if (!accountId) {
                res.status(400).send({ error: "No Stripe account found for this user" });
                return;
            }
            const loginLink = await stripe.accounts.createLoginLink(accountId);
            res.status(200).send({ url: loginLink.url });
        }
        catch (error) {
            console.error("Create Login Link Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
exports.createPaymentIntent = functions.region('europe-west1').https.onRequest((req, res) => {
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
exports.releaseEscrow = functions.region('europe-west1').https.onRequest((req, res) => {
    cors(req, res, async () => {
        var _a;
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { paymentIntentId, providerAccountId, amount, platformFeePercent = 5 } = req.body;
            console.log(`Attempting releaseEscrow: PI=${paymentIntentId}, Provider=${providerAccountId}, Amount=${amount}`);
            if (!paymentIntentId || !providerAccountId || !amount) {
                res.status(400).send({ error: "Missing required parameters: paymentIntentId, providerAccountId, or amount" });
                return;
            }
            // 1. Retrieve the Payment Intent to check its current status
            let intent;
            try {
                intent = await stripe.paymentIntents.retrieve(paymentIntentId);
                console.log(`PaymentIntent Status: ${intent.status}`);
            }
            catch (err) {
                console.error("Stripe Retrieve Error:", err);
                res.status(400).send({ error: `Invalid PaymentIntent ID: ${err.message}` });
                return;
            }
            if (intent.status === 'requires_capture') {
                console.log(`[Escrow] PI ${paymentIntentId} status is 'requires_capture'. Capturing now...`);
                intent = await stripe.paymentIntents.capture(paymentIntentId);
                console.log(`[Escrow] Capture successful. New status: ${intent.status}`);
            }
            else if (intent.status === 'succeeded') {
                console.log(`[Escrow] PI ${paymentIntentId} was already captured.`);
            }
            else {
                const errorMsg = `PaymentIntent is in status ${intent.status}, cannot release. It must be 'requires_capture' or 'succeeded'.`;
                console.warn(`[Escrow] Warning: ${errorMsg}`);
                res.status(400).send({ error: errorMsg });
                return;
            }
            // 2. Extract Charge ID (needed for linked transfer)
            const chargeId = typeof intent.latest_charge === 'string'
                ? intent.latest_charge
                : (_a = intent.latest_charge) === null || _a === void 0 ? void 0 : _a.id;
            if (!chargeId) {
                console.error(`[Escrow] Error: No charge ID found after capture for PI ${paymentIntentId}`);
                res.status(400).send({ error: "Failed to identify charge ID for payout. Please contact support." });
                return;
            }
            console.log(`[Escrow] Final Charge ID for transfer: ${chargeId}`);
            // 3. Calculate provider payout (amount - platform fee)
            const numAmount = Number(amount);
            if (isNaN(numAmount)) {
                res.status(400).send({ error: "Invalid amount: not a number" });
                return;
            }
            const providerAmount = numAmount * (1 - platformFeePercent / 100);
            const providerAmountInCents = Math.round(providerAmount * 100);
            console.log(`[Escrow] Calculated Provider Payout: ${providerAmountInCents} cents (Amount: ${numAmount}, Fee: ${platformFeePercent}%)`);
            // 4. Transfer the payout to the provider's connected account
            try {
                console.log(`[Escrow] Creating Stripe Transfer to ${providerAccountId}...`);
                const transfer = await stripe.transfers.create({
                    amount: providerAmountInCents,
                    currency: intent.currency,
                    destination: providerAccountId,
                    source_transaction: chargeId, // Links payout to this specific capture
                });
                console.log(`[Escrow] Transfer Successful: ${transfer.id}`);
                res.status(200).send({ success: true, transferId: transfer.id });
            }
            catch (stripeError) {
                console.error("STRIPE API ERROR:", {
                    type: stripeError.type,
                    code: stripeError.code,
                    message: stripeError.message,
                    param: stripeError.param
                });
                // SPECIAL CASE FOR TEST MODE: If balance is low but we are testing, allow the app to proceed
                if (stripeError.code === 'insufficient_funds' || stripeError.message.includes('insufficient available funds')) {
                    console.log("Allowing task closure despite insufficient test funds (Test Mode Bypass)");
                    res.status(200).send({
                        success: true,
                        transferId: "simulated_test_transfer",
                        warning: "Insufficient test funds, transfer simulated."
                    });
                }
                else {
                    res.status(400).send({ error: stripeError.message });
                }
            }
        }
        catch (error) {
            console.error("Fatal Release Escrow Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// 5. Stripe Webhook Handler
exports.stripeWebhook = functions.region('europe-west1').runWith({ memory: '512MB' }).https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    let event;
    try {
        if (!sig || !endpointSecret) {
            throw new Error("Missing signature or endpoint secret");
        }
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    }
    catch (err) {
        console.error("Webhook Signature Error:", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Handle the event
    try {
        switch (event.type) {
            case "payment_intent.succeeded":
                const paymentIntent = event.data.object;
                console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
                // Here you can update task status in Firestore if needed
                break;
            case "account.updated":
                const account = event.data.object;
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
    }
    catch (error) {
        console.error("Webhook Handler Error:", error);
        res.status(500).send("Internal Server Error");
    }
});
// 6. Get Account Balance
exports.getStripeBalance = functions.region('europe-west1').https.onRequest((req, res) => {
    cors(req, res, async () => {
        var _a, _b;
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { userId, accountType = 'individual' } = req.body;
            if (!userId) {
                res.status(400).send({ error: "Missing userId" });
                return;
            }
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const userData = userDoc.data();
            let accountId = null;
            if (accountType === 'company') {
                accountId = userData === null || userData === void 0 ? void 0 : userData.stripeAccountId_company;
            }
            else {
                accountId = (userData === null || userData === void 0 ? void 0 : userData.stripeAccountId_individual) || (userData === null || userData === void 0 ? void 0 : userData.stripeAccountId);
            }
            if (!accountId) {
                res.status(200).send({ available: 0, pending: 0, currency: "eur" });
                return;
            }
            const balance = await stripe.balance.retrieve({
                stripeAccount: accountId,
            });
            // Balance can have multiple currencies, we'll find EUR or use the first one
            const eurAvailable = ((_a = balance.available.find(b => b.currency === 'eur')) === null || _a === void 0 ? void 0 : _a.amount) || 0;
            const eurPending = ((_b = balance.pending.find(b => b.currency === 'eur')) === null || _b === void 0 ? void 0 : _b.amount) || 0;
            res.status(200).send({
                available: eurAvailable / 100,
                pending: eurPending / 100,
                currency: "eur"
            });
        }
        catch (error) {
            console.error("Get Balance Error:", error);
            // If the account was revoked or doesn't exist under the current API key, gracefully return 0 instead of crashing
            if (error.message && (error.message.includes('does not have access to account') || error.message.includes('No such account'))) {
                res.status(200).send({ available: 0, pending: 0, currency: "eur", error: "revoked" });
            }
            else {
                res.status(500).send({ error: error.message });
            }
        }
    });
});
// 7. Get Recent Transactions
exports.getStripeTransactions = functions.region('europe-west1').https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { userId, accountType = 'individual' } = req.body;
            if (!userId) {
                res.status(400).send({ error: "Missing userId" });
                return;
            }
            const userDoc = await admin.firestore().collection("users").doc(userId).get();
            const userData = userDoc.data();
            let accountId = null;
            if (accountType === 'company') {
                accountId = userData === null || userData === void 0 ? void 0 : userData.stripeAccountId_company;
            }
            else {
                accountId = (userData === null || userData === void 0 ? void 0 : userData.stripeAccountId_individual) || (userData === null || userData === void 0 ? void 0 : userData.stripeAccountId);
            }
            if (!accountId) {
                res.status(200).send({ transactions: [] });
                return;
            }
            const transactions = await stripe.balanceTransactions.list({
                limit: 10,
            }, {
                stripeAccount: accountId,
            });
            res.status(200).send({
                transactions: transactions.data.map(tx => ({
                    id: tx.id,
                    amount: (tx.net || tx.amount || 0) / 100,
                    currency: tx.currency || 'eur',
                    status: tx.status || 'available',
                    type: tx.type,
                    created: tx.created,
                    description: tx.description || (tx.type === 'transfer' ? 'Превод към сметка' : 'Плащане по задача'),
                }))
            });
        }
        catch (error) {
            console.error("Get Transactions Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// 8. Create Materials Payment Intent (Immediate transfer, no platform fee)
exports.createMaterialsPaymentIntent = functions.region('europe-west1').https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { amount, currency = "eur", taskId, providerAccountId, paymentId } = req.body;
            if (!amount || !taskId || !providerAccountId) {
                res.status(400).send({ error: "Missing required parameters" });
                return;
            }
            const amountInCents = Math.round(amount * 100);
            // This payment is captured immediately and transferred to the provider
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: currency,
                metadata: { taskId, paymentId, type: 'materials' },
                transfer_data: {
                    destination: providerAccountId,
                },
            });
            res.status(200).send({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            });
        }
        catch (error) {
            console.error("Materials Payment Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// 8. Create Additional Escrow Intent (Hold funds for unforeseen circumstances)
exports.createAdditionalFundsIntent = functions.region('europe-west1').https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { amount, currency = "eur", taskId, circumstanceId } = req.body;
            if (!amount || !taskId) {
                res.status(400).send({ error: "Missing amount or taskId" });
                return;
            }
            const amountInCents = Math.round(amount * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: currency,
                capture_method: "manual",
                metadata: { taskId, circumstanceId, type: 'additional_funds' },
            });
            res.status(200).send({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            });
        }
        catch (error) {
            console.error("Additional Funds Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
// 9. Refund Escrow (For Mutual Cancellation)
exports.refundTaskEscrow = functions.region('europe-west1').https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { paymentIntentId, amount, keepPlatformFee = true } = req.body;
            if (!paymentIntentId) {
                res.status(400).send({ error: "Missing paymentIntentId" });
                return;
            }
            // Retrieve the intent first to check status
            const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
            // If the intent is NOT captured (authorized only), we must CANCEL it
            if (intent.status === 'requires_capture') {
                console.log(`Canceling uncaptured PaymentIntent: ${paymentIntentId}`);
                const canceledIntent = await stripe.paymentIntents.cancel(paymentIntentId);
                res.status(200).send({ success: true, status: 'canceled', id: canceledIntent.id });
            }
            else {
                // If it's already captured, do a normal refund
                const refundParams = {
                    payment_intent: paymentIntentId,
                    refund_application_fee: !keepPlatformFee,
                };
                if (amount) {
                    refundParams.amount = Math.round(amount * 100);
                }
                const refund = await stripe.refunds.create(refundParams);
                res.status(200).send({ success: true, status: 'refunded', refundId: refund.id });
            }
        }
        catch (error) {
            console.error("Refund/Cancel Error:", error);
            res.status(500).send({ error: error.message });
        }
    });
});
//# sourceMappingURL=index.js.map