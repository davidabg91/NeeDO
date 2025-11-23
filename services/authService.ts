
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
import { User } from '../types';

// Default Site Logo Avatar (Blue background, White 'N')
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=N&background=2563eb&color=fff&size=128&bold=true&length=1";

// Safe helper to map Firebase User to our User type with fallback
export const syncUserProfile = async (fbUser: FirebaseUser): Promise<User> => {
  try {
    const userDoc = await getDoc(doc(db, "users", fbUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      // CRITICAL FIX: Ensure legacy users with 5.0 rating but 0 reviews are treated as 0 rating
      if (userData.reviewCount === 0 && userData.rating > 0) {
        userData.rating = 0;
      }
      return userData;
    }
  } catch (error: any) {
    // If permission denied (DB locked), allow app to function with basic auth data
    if (error.code !== 'permission-denied') {
        console.warn("AuthService: Firestore connection failed, using auth profile fallback.", error);
    }
  }
  
  // Return a fallback user profile derived from Auth data if Firestore is unreachable or empty
  return {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Потребител',
    email: fbUser.email || '',
    phoneNumber: '',
    joinedAt: Date.now(),
    rating: 0, 
    reviewCount: 0,
    avatarUrl: fbUser.photoURL || DEFAULT_AVATAR,
    status: 'ACTIVE',
    bio: 'Офлайн режим'
  };
};

export const loginUser = async (email: string, password?: string): Promise<User | null> => {
  if (!password) throw new Error("Password is required");
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Use the robust sync function
    return await syncUserProfile(userCredential.user);
  } catch (error: any) {
    console.error("Login error", error);
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Грешен имейл или парола.');
    }
    throw error;
  }
};

export const loginWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;

    // Check if user exists in Firestore
    let userProfile: User | undefined;
    try {
        const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        if (userDoc.exists()) {
            userProfile = userDoc.data() as User;
            // Fix legacy rating
            if (userProfile.reviewCount === 0 && userProfile.rating > 0) {
              userProfile.rating = 0;
            }
        }
    } catch (e) {
        // Silent catch for permissions
    }

    // If user doesn't exist or DB read failed, assume new/update needed and construct profile
    if (!userProfile) {
        const newUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
            email: fbUser.email || '',
            phoneNumber: '', // Google doesn't always provide phone
            joinedAt: Date.now(),
            rating: 0, // Changed from 5.0 to 0
            reviewCount: 0,
            // Use Google photo or Fallback to Logo
            avatarUrl: fbUser.photoURL || DEFAULT_AVATAR,
            status: 'ACTIVE',
            isAdmin: fbUser.email === 'davida1991@gmail.com'
        };

        // Save to Firestore
        try {
            await setDoc(doc(db, "users", fbUser.uid), newUser, { merge: true });
        } catch (e: any) {
            if (e.code !== 'permission-denied') {
                console.warn("Could not create Google user in Firestore", e);
            }
        }
        return newUser;
    }

    return userProfile;
  } catch (error: any) {
    console.error("Google Login Error", error);
    if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Входът беше отказан.");
    }
    throw new Error("Неуспешен вход с Google.");
  }
};

export const registerUser = async (name: string, email: string, phoneNumber: string): Promise<User> => {
    // Fallback if invoked without password (legacy support)
    throw new Error("Registration requires a password.");
};

export const registerUserWithPassword = async (name: string, email: string, phoneNumber: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    await updateProfile(fbUser, { displayName: name });

    const newUser: User = {
      id: fbUser.uid,
      name,
      email,
      phoneNumber,
      joinedAt: Date.now(),
      rating: 0, // Changed from 5.0 to 0
      reviewCount: 0,
      // Use Site Logo as default
      avatarUrl: DEFAULT_AVATAR,
      isAdmin: email === 'davida1991@gmail.com',
      status: 'ACTIVE'
    };

    // Try to save to Firestore, but don't fail registration if it fails (just log)
    try {
        await setDoc(doc(db, "users", fbUser.uid), newUser);
    } catch (e: any) {
        if (e.code !== 'permission-denied') {
            console.warn("Could not create user profile in Firestore (Offline/Permission issue)", e);
        }
    }

    return newUser;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Имейлът вече е регистриран.');
    }
    throw error;
  }
};

export const logoutUser = async () => {
  await firebaseSignOut(auth);
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  try {
    const userDoc = await getDoc(doc(db, "users", id));
    if (userDoc.exists()) {
        const u = userDoc.data() as User;
        // Fix legacy rating for other users too
        if (u.reviewCount === 0 && u.rating > 0) {
           u.rating = 0;
        }
        // Fix legacy avatar on read if possible (client-side logic handles display mostly)
        return u;
    }
    return undefined;
  } catch (error) {
    // Silent fail
    return undefined;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
        const u = doc.data() as User;
        if (u.reviewCount === 0 && u.rating > 0) u.rating = 0;
        users.push(u);
    });
    return users;
  } catch (error) {
    console.warn("getAllUsers failed", error);
    return [];
  }
};

export const updateUserStatus = async (userId: string, status: 'ACTIVE' | 'BANNED') => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { status });
    } catch (error) {
        console.warn("updateUserStatus failed", error);
    }
};

export const updateUserProfile = async (userId: string, data: Partial<User>) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, data);
    } catch (error) {
        console.warn("updateUserProfile failed", error);
        throw new Error("Неуспешно обновяване на профила.");
    }
};

export const getProvidersByCategory = async (category: string): Promise<User[]> => {
    try {
        const q = query(collection(db, "users"), where("businessCategories", "array-contains", category));
        const querySnapshot = await getDocs(q);
        const users: User[] = [];
        querySnapshot.forEach((doc) => {
            users.push(doc.data() as User);
        });
        return users;
    } catch (error) {
        console.warn("getProvidersByCategory failed", error);
        return [];
    }
};
