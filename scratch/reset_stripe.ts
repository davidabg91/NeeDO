import { db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteField } from 'firebase/firestore';

async function resetStripeAccount(email: string) {
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log("No user found with email:", email);
            return;
        }

        const userDoc = snapshot.docs[0];
        console.log("Found user:", userDoc.id);

        await updateDoc(doc(db, "users", userDoc.id), {
            stripeAccountId: deleteField(),
            stripeOnboardingComplete: deleteField()
        });

        console.log("Successfully cleared Stripe data for", email);
    } catch (e) {
        console.error("Error resetting stripe account:", e);
    }
}

resetStripeAccount('davida1991@gmail.com');
