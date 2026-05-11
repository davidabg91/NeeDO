import { db, storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    orderBy,
    deleteDoc,
    arrayUnion,
    where,
    limit,
    limitToLast,
    increment,
    collectionGroup
} from 'firebase/firestore';
import { Task, TaskStatus, Offer, Review, TaskQuestion, Notification, DirectMessage } from '../types';

const TASKS_COLLECTION = 'tasks';
const NOTIFICATIONS_COLLECTION = 'notifications';

// --- MOCK DATA STORE (Fallback for when Backend is not set up) ---
// We keep this false by default so we always try to hit the DB first.
let isMockMode = false;
const mockStatusListeners: Set<(isMock: boolean) => void> = new Set();

const notifyMockStatus = () => {
    mockStatusListeners.forEach(cb => cb(isMockMode));
};

export const subscribeToMockMode = (callback: (isMock: boolean) => void) => {
    mockStatusListeners.add(callback);
    callback(isMockMode);
    return () => mockStatusListeners.delete(callback);
};

export const resetMockMode = () => {
    isMockMode = false;
    notifyMockStatus();
};

// Utility to safely stringify error messages avoiding circular deps
const safeErrorMsg = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
        try {
            // Attempt shallow stringify or just pick known fields
            return (err as any).message || (err as any).code || 'Unknown object error';
        } catch {
            return 'Circular or unstringifiable error object';
        }
    }
    return String(err);
};

// Utility to recursively clean undefined values which Firestore rejects
// and handle circular references to prevent JSON serialization errors
const cleanUndefined = (obj: any, seen = new WeakSet()): any => {
    // Handle Primitives & Null
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Handle Circular References
    if (seen.has(obj)) {
        return undefined; // Or return null if preferred, but undefined removes the key
    }
    seen.add(obj);

    // Handle Date
    if (obj instanceof Date) {
        return obj;
    }

    // Handle Array
    if (Array.isArray(obj)) {
        return obj.map(v => cleanUndefined(v, seen)).filter(v => v !== undefined);
    }

    // Handle Object
    return Object.keys(obj).reduce((acc, key) => {
        const value = cleanUndefined(obj[key], seen);
        if (value !== undefined) {
            acc[key] = value;
        }
        return acc;
    }, {} as any);
};

// --- IMAGE UPLOAD HELPER ---
export const uploadImage = async (path: string, base64Data: string): Promise<string> => {
    // If not base64 (already a URL), return as is
    if (!base64Data.startsWith('data:')) return base64Data;

    try {
        const storageRef = ref(storage, path);
        // data_url format: data:image/jpeg;base64,xxxx
        const snapshot = await uploadString(storageRef, base64Data, 'data_url');
        return await getDownloadURL(snapshot.ref);
    } catch (e) {
        console.error("Upload failed", safeErrorMsg(e));
        return base64Data; // Fallback to base64 if upload fails (not ideal for scalability but prevents crash)
    }
};


const mockTasks: Task[] = [
    {
        id: 'mock-1',
        title: 'Почистване на апартамент след ремонт',
        description: 'Търся човек за основно почистване на 3-стаен апартамент (85 кв.м) след ремонт. Има прах, петна от латекс и нужда от измиване на прозорци.',
        category: 'Почистване',
        location: { lat: 42.6977, lng: 23.3219 },
        address: 'София, Център, ул. Витоша 15',
        status: TaskStatus.OPEN,
        createdAt: Date.now() - 86400000, // 1 day ago
        requesterId: 'mock-user-1',
        requesterName: 'Иван Петров',
        requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ivan',
        requesterIsCompany: false,
        requesterRating: 4.8,
        requesterReviewCount: 12, // User has reviews
        aiEstimatedPrice: '60 - 90 €',
        offers: [],
        questions: [
            { id: 'q1', text: 'Имате ли стълба?', userId: 'u2', userName: 'CleanPro', createdAt: Date.now() - 100000 }
        ],
        imageUrl: 'https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1581578731117-104f2a8d2305?w=800&q=80']
    },
    {
        id: 'mock-2',
        title: 'Пренос на диван и хладилник',
        description: 'Нуждая се от транспорт и помощ за пренасяне на ъглов диван и хладилник от Младост 4 до Лозенец. Има асансьори и на двете места.',
        category: 'Транспорт',
        location: { lat: 42.6500, lng: 23.3800 }, // Mladost approx
        address: 'София, Младост 4',
        status: TaskStatus.OPEN,
        createdAt: Date.now() - 172800000, // 2 days ago
        requesterId: 'mock-user-2',
        requesterName: 'Мария Георгиева',
        requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
        requesterIsCompany: false,
        requesterRating: 0, // Mock New User
        requesterReviewCount: 0,
        aiEstimatedPrice: '30 - 50 €',
        offers: [
            {
                id: 'offer-1',
                taskId: 'mock-2',
                providerId: 'prov-1',
                providerName: 'Транспорт Експрес',
                providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TransportExpress',
                providerIsCompany: true,
                price: 40,
                currency: 'EUR',
                duration: '2 часа',
                comment: 'Имаме голям бус и колан за носене.',
                startDate: new Date().toISOString(),
                createdAt: Date.now() - 100000
            }
        ],
        questions: [],
        imageUrl: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=80']
    },
    {
        id: 'mock-3',
        title: 'Сглобяване на гардероб IKEA',
        description: 'Модел PAX, 200x236. Изисква се опит и инструменти.',
        category: 'Домашен майстор',
        location: { lat: 42.6700, lng: 23.3000 },
        address: 'София, ж.к. Лагера',
        status: TaskStatus.IN_PROGRESS,
        acceptedOfferId: 'offer-pax',
        escrowAmount: 60,
        createdAt: Date.now() - 200000000,
        requesterId: 'mock-user-3',
        requesterName: 'Георги Димов',
        requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Georgi',
        requesterIsCompany: false,
        requesterRating: 4.2,
        requesterReviewCount: 5,
        aiEstimatedPrice: '40 - 70 €',
        offers: [
            {
                id: 'offer-pax',
                taskId: 'mock-3',
                providerId: 'prov-pax',
                providerName: 'Майстор Миро',
                providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Miro',
                providerIsCompany: false,
                price: 60,
                currency: 'EUR',
                duration: '4 часа',
                comment: 'Мога да дойда утре сутрин.',
                createdAt: Date.now() - 190000000
            }
        ],
        questions: [],
        imageUrl: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80',
        images: ['https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80']
    }
];

const mockNotifications: Notification[] = [];
const taskListeners: Set<(tasks: Task[]) => void> = new Set();
const notificationListeners: Set<(notifs: Notification[]) => void> = new Set();
const chatListeners: Map<string, (msgs: DirectMessage[]) => void> = new Map();

// Helpers to update UI in mock mode
const broadcastMockTasks = () => {
    taskListeners.forEach(cb => cb([...mockTasks]));
};

const broadcastMockNotifications = () => {
    notificationListeners.forEach(cb => cb([...mockNotifications]));
};

// --- TASKS ---

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
    // OPTIMIZATION: Limit to 100 recent tasks to prevent massive reads on startup
    // NOTE: In the new structure, offers/questions/reviews are in sub-collections
    const q = query(
        collection(db, TASKS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(100)
    );

    const unsubscribe = onSnapshot(q,
        (snapshot) => {
            const tasks = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Initialize empty arrays if not present (legacy or new structure)
                    offers: data.offers || [],
                    questions: data.questions || [],
                    reviews: data.reviews || [],
                    offersCount: data.offersCount || 0,
                    questionsCount: data.questionsCount || 0,
                    reviewsCount: data.reviewsCount || 0
                } as Task;
            });
            callback(tasks);

            if (isMockMode) {
                isMockMode = false;
                notifyMockStatus();
            }
        },
        (error) => {
            console.warn("Tasks subscription failed (showing mock data)", safeErrorMsg(error));
            taskListeners.add(callback);
            callback([...mockTasks]);
        }
    );

    return () => {
        unsubscribe();
        taskListeners.delete(callback);
    };
};

// --- NEW DETAIL SUBSCRIPTIONS ---

export const subscribeToTaskOffers = (taskId: string, callback: (offers: Offer[]) => void) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        callback(task?.offers || []);
        return () => { };
    }

    const offersRef = collection(db, TASKS_COLLECTION, taskId, 'offers');
    const q = query(offersRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
        callback(offers);
    }, (error) => {
        console.warn(`Offers subscription failed for ${taskId}`, safeErrorMsg(error));
        callback([]);
    });
};

export const subscribeToTaskQuestions = (taskId: string, callback: (questions: TaskQuestion[]) => void) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        callback(task?.questions || []);
        return () => { };
    }

    const questionsRef = collection(db, TASKS_COLLECTION, taskId, 'questions');
    const q = query(questionsRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskQuestion));
        callback(questions);
    }, (error) => {
        console.warn(`Questions subscription failed for ${taskId}`, safeErrorMsg(error));
        callback([]);
    });
};

export const subscribeToTaskReviews = (taskId: string, callback: (reviews: Review[]) => void) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        callback(task?.reviews || []);
        return () => { };
    }

    const reviewsRef = collection(db, TASKS_COLLECTION, taskId, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        callback(reviews);
    }, (error) => {
        console.warn(`Reviews subscription failed for ${taskId}`, safeErrorMsg(error));
        callback([]);
    });
};

export const subscribeToUserReviews = (userId: string, callback: (reviews: Review[]) => void) => {
    if (!userId) {
        callback([]);
        return () => {};
    }
    const q = query(
        collectionGroup(db, 'reviews'),
        where('toUserId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        callback(reviews);
    });
};

export const fetchTasksByUser = async (userId: string): Promise<Task[]> => {
    if (!userId) return [];
    try {
        const tasksRef = collection(db, TASKS_COLLECTION);
        
        // Query tasks where user is requester
        const q1 = query(tasksRef, where('requesterId', '==', userId));
        const snapshot1 = await getDocs(q1);
        const requesterTasks = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

        // Query tasks where user is the accepted provider
        const q2 = query(tasksRef, where('acceptedProviderId', '==', userId));
        const snapshot2 = await getDocs(q2);
        const providerTasks = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

        // Combine and remove duplicates, sort by newest
        const allUserTasks = [...requesterTasks, ...providerTasks];
        const uniqueTasks = Array.from(new Map(allUserTasks.map(item => [item.id, item])).values());
        
        return uniqueTasks.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
        console.warn("fetchTasksByUser failed", safeErrorMsg(e));
        return [];
    }
};


export const createTask = async (taskData: Omit<Task, 'id'>) => {
    try {
        // 1. Upload Images to Storage
        let uploadedImageUrl = taskData.imageUrl;
        let uploadedImages = taskData.images || [];

        if (taskData.imageUrl && taskData.imageUrl.startsWith('data:')) {
            uploadedImageUrl = await uploadImage(`tasks/${Date.now()}_main`, taskData.imageUrl);
        }

        if (taskData.images && taskData.images.length > 0) {
            uploadedImages = await Promise.all(
                taskData.images.map((img, idx) => uploadImage(`tasks/${Date.now()}_${idx}`, img))
            );
        }

        const taskToSave = {
            ...taskData,
            imageUrl: uploadedImageUrl,
            images: uploadedImages
        };

        const cleanData = cleanUndefined(taskToSave);
        const docRef = await addDoc(collection(db, TASKS_COLLECTION), cleanData);

        if (isMockMode) {
            isMockMode = false;
            notifyMockStatus();
        }
        return docRef.id;
    } catch (e) {
        console.warn("Create Task failed (falling back to local)", safeErrorMsg(e));
        const newTask = { id: `mock-${Date.now()}`, ...taskData };
        mockTasks.unshift(newTask as Task);
        broadcastMockTasks();
        isMockMode = true;
        notifyMockStatus();
        return newTask.id;
    }
};

export const deleteTask = async (taskId: string) => {
    if (taskId.startsWith('mock-')) {
        const idx = mockTasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            mockTasks.splice(idx, 1);
            broadcastMockTasks();
        }
        return;
    }

    try {
        await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
    } catch (e) {
        console.warn("Delete failed", safeErrorMsg(e));
        // Fallback to mock delete if it exists there, just in case
        const idx = mockTasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            mockTasks.splice(idx, 1);
            broadcastMockTasks();
        } else {
            // Rethrow so UI knows it failed
            throw e;
        }
    }
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus, extraData?: Partial<Task>) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        if (task) {
            Object.assign(task, { status, ...extraData });
            broadcastMockTasks();
        }
        return;
    }

    try {
        let finalExtra = { ...extraData };

        // If there's a completion image as base64, upload it
        if (extraData?.completionImageUrl && extraData.completionImageUrl.startsWith('data:')) {
            const uploadedUrl = await uploadImage(`tasks/${taskId}/completion`, extraData.completionImageUrl);
            finalExtra.completionImageUrl = uploadedUrl;
        }

        const cleanExtra = cleanUndefined(finalExtra || {});
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, { status, ...cleanExtra });
    } catch (e) {
        console.warn("Update status failed", safeErrorMsg(e));
    }
};

export const updateTaskFields = async (taskId: string, fields: any) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        if (task) {
            Object.assign(task, fields);
            broadcastMockTasks();
        }
        return;
    }

    try {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, fields);
    } catch (e) {
        console.error("updateTaskFields failed", safeErrorMsg(e));
        throw e;
    }
};

export { arrayUnion };

// --- OFFERS ---

export const addOfferToTask = async (taskId: string, offer: Offer) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        if (task) {
            task.offers.push(offer);
            broadcastMockTasks();
        }
        return;
    }

    try {
        const cleanOffer = cleanUndefined(offer);
        const offersRef = collection(db, TASKS_COLLECTION, taskId, 'offers');
        await addDoc(offersRef, cleanOffer);

        // OPTIMIZATION: Increment counter on main doc
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, {
            offersCount: increment(1)
        });
    } catch (e) {
        console.warn("Add offer failed", safeErrorMsg(e));
    }
};

// --- REVIEWS ---

export const addReviewToTask = async (taskId: string, review: Review, completionImageUrl?: string) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        if (task) {
            if (!task.reviews) task.reviews = [];
            task.reviews.push(review);
            if (completionImageUrl) task.completionImageUrl = completionImageUrl;
            broadcastMockTasks();
        }
        return;
    }

    try {
        const cleanReview = cleanUndefined(review);
        const reviewsRef = collection(db, TASKS_COLLECTION, taskId, 'reviews');
        await addDoc(reviewsRef, cleanReview);

        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        const updates: any = {
            reviewsCount: increment(1)
        };

        if (completionImageUrl) {
            updates.completionImageUrl = completionImageUrl;
        }

        await updateDoc(taskRef, updates);

        // --- NEW: Update User's Global Rating ---
        const userRef = doc(db, 'users', review.toUserId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const oldCount = userData.reviewCount || 0;
            const oldRating = userData.rating || 0;
            const newCount = oldCount + 1;
            const newAverage = ((oldRating * oldCount) + review.rating) / newCount;

            await updateDoc(userRef, {
                rating: newAverage,
                reviewCount: newCount
            });
        }
    } catch (e) {
        console.warn("Add review failed", safeErrorMsg(e));
    }
};

// --- Q&A ---

export const addQuestionToTask = async (taskId: string, question: TaskQuestion) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        if (task) {
            if (!task.questions) task.questions = [];
            task.questions.push(question);
            broadcastMockTasks();
        }
        return;
    }

    try {
        const cleanQuestion = cleanUndefined(question);
        const questionsRef = collection(db, TASKS_COLLECTION, taskId, 'questions');
        await addDoc(questionsRef, cleanQuestion);

        // OPTIMIZATION: Increment counter on main doc
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, {
            questionsCount: increment(1)
        });
    } catch (e) {
        console.warn("Add question failed", safeErrorMsg(e));
    }
};

export const answerQuestionInTask = async (taskId: string, questionId: string, answerText: string) => {
    if (taskId.startsWith('mock-')) {
        const task = mockTasks.find(t => t.id === taskId);
        if (task && task.questions) {
            const q = task.questions.find(q => q.id === questionId);
            if (q) {
                q.answer = answerText;
                q.answeredAt = Date.now();
                broadcastMockTasks();
            }
        }
        return;
    }

    try {
        const questionRef = doc(db, TASKS_COLLECTION, taskId, 'questions', questionId);
        await updateDoc(questionRef, {
            answer: answerText,
            answeredAt: Date.now()
        });
    } catch (e) {
        console.warn("answerQuestionInTask failed", safeErrorMsg(e));
    }
};

// --- CHAT MESSAGES (REAL-TIME) ---

export const subscribeToDirectMessages = (taskId: string, callback: (msgs: DirectMessage[]) => void) => {
    if (taskId.startsWith('mock-')) {
        const handler = (msgs: DirectMessage[]) => callback(msgs);
        chatListeners.set(taskId, handler);
        callback([]);
        return () => chatListeners.delete(taskId);
    }

    const messagesRef = collection(db, TASKS_COLLECTION, taskId, 'messages');

    // OPTIMIZATION: Only get the last 50 messages to prevent excessive reads on large chats
    const q = query(
        messagesRef,
        orderBy('createdAt', 'asc'),
        limitToLast(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectMessage));
        callback(msgs);
    }, (error) => {
        console.warn("Chat subscription failed", safeErrorMsg(error));
        callback([]);
    });

    return unsubscribe;
};

export const sendDirectMessage = async (taskId: string, message: Omit<DirectMessage, 'id'>, recipientId?: string) => {
    if (taskId.startsWith('mock-')) {
        const mockMsg: DirectMessage = { ...message, id: Date.now().toString() };
        const listener = chatListeners.get(taskId);
        if (listener) {
            listener([mockMsg]);
        }
        return;
    }

    try {
        const cleanMessage = cleanUndefined(message);
        const messagesRef = collection(db, TASKS_COLLECTION, taskId, 'messages');
        await addDoc(messagesRef, cleanMessage);

        if (recipientId) {
            await sendNotification({
                userId: recipientId,
                type: 'NEW_MESSAGE',
                title: `Ново съобщение от ${message.senderName}`,
                message: message.text,
                taskId: taskId,
                isRead: false,
                createdAt: Date.now()
            });
        }

    } catch (e) {
        console.warn("Failed to send message", safeErrorMsg(e));
    }
};

export const fetchOlderMessages = async (taskId: string, beforeTimestamp: number): Promise<DirectMessage[]> => {
    if (!taskId || !beforeTimestamp) return [];
    if (taskId.startsWith('mock-')) {
        return [];
    }

    try {
        const messagesRef = collection(db, TASKS_COLLECTION, taskId, 'messages');

        // Get messages older than the timestamp, ordered by newest first (descending), limit 20
        const q = query(
            messagesRef,
            where('createdAt', '<', beforeTimestamp),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const snapshot = await getDocs(q);
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectMessage));
        return msgs;
    } catch (e) {
        console.warn("fetchOlderMessages failed", safeErrorMsg(e));
        return [];
    }
};

// --- NOTIFICATIONS ---

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
    if (!userId) {
        callback([]);
        return () => {};
    }
    // OPTIMIZATION: Limit to recent notifications (last 50)
    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    const unsubscribe = onSnapshot(q,
        (snapshot) => {
            const userNotifs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            callback(userNotifs);
        },
        (error) => {
            console.warn("Notifications subscription failed (using local simulation)", safeErrorMsg(error));
            notificationListeners.add(callback);
            callback(mockNotifications.filter(n => n.userId === userId));
        }
    );
    return () => {
        unsubscribe();
        notificationListeners.delete(callback);
    };
};

export const sendNotification = async (notification: Omit<Notification, 'id'>) => {
    try {
        const cleanNotif = cleanUndefined({
            ...notification,
            createdAt: Date.now(),
            isRead: false
        });
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), cleanNotif);
    } catch (e) {
        const newNotif = { id: `notif-${Date.now()}`, ...notification };
        mockNotifications.unshift(newNotif as Notification);
        broadcastMockNotifications();
    }
};

export const markNotificationRead = async (notificationId: string) => {
    if (notificationId.startsWith('notif-')) {
        const n = mockNotifications.find(n => n.id === notificationId);
        if (n) n.isRead = true;
        broadcastMockNotifications();
        return;
    }

    try {
        const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(notifRef, { isRead: true });
    } catch (e) {
        // silent
    }
};

export const markAllNotificationsRead = async (userId: string) => {
    if (!userId) return;
    try {
        const q = query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId), where("isRead", "==", false));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (d) => {
            await updateDoc(d.ref, { isRead: true });
        });
    } catch (e) {
        mockNotifications.forEach(n => {
            if (n.userId === userId) n.isRead = true;
        });
        broadcastMockNotifications();
    }
};
