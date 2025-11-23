
import { db } from '../firebase';
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
  where
} from 'firebase/firestore';
import { Task, TaskStatus, Offer, Review, TaskQuestion, Notification } from '../types';

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

// Utility to recursively clean undefined values which Firestore rejects
const cleanUndefined = (obj: any): any => {
    if (obj instanceof Date) {
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map(v => cleanUndefined(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const value = cleanUndefined(obj[key]);
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as any);
    }
    return obj;
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
    aiEstimatedPrice: '120 - 180 лв.',
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
    aiEstimatedPrice: '60 - 100 лв.',
    offers: [
        {
            id: 'offer-1',
            taskId: 'mock-2',
            providerId: 'prov-1',
            providerName: 'Транспорт Експрес',
            providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TransportExpress',
            providerIsCompany: true,
            price: 80,
            currency: 'BGN',
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
    escrowAmount: 120,
    createdAt: Date.now() - 200000000,
    requesterId: 'mock-user-3',
    requesterName: 'Георги Димов',
    requesterAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Georgi',
    requesterIsCompany: false,
    requesterRating: 4.2,
    requesterReviewCount: 5,
    aiEstimatedPrice: '80 - 140 лв.',
    offers: [
        {
            id: 'offer-pax',
            taskId: 'mock-3',
            providerId: 'prov-pax',
            providerName: 'Майстор Миро',
            providerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Miro',
            providerIsCompany: false,
            price: 120,
            currency: 'BGN',
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

// Helpers to update UI in mock mode
const broadcastMockTasks = () => {
    taskListeners.forEach(cb => cb([...mockTasks]));
};

const broadcastMockNotifications = () => {
    notificationListeners.forEach(cb => cb([...mockNotifications]));
};

// --- TASKS ---

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  const q = query(collection(db, TASKS_COLLECTION), orderBy('createdAt', 'desc'));
  
  // IMPORTANT: We always try to connect to Firestore first.
  // Even if `isMockMode` is true (maybe due to a previous error), we attempt connection.
  // This prevents getting stuck in mock mode if network recovers.

  const unsubscribe = onSnapshot(q, 
    (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      callback(tasks);
      
      // If we successfully connected, ensure mock mode is off
      if (isMockMode) {
         isMockMode = false;
         notifyMockStatus();
      }
    },
    (error) => {
      console.warn("Tasks subscription failed (showing mock data)", error);
      // IMPORTANT: We do NOT set isMockMode = true globally here.
      // A read error should not block write attempts.
      
      // Fallback to mock data for THIS listener
      taskListeners.add(callback);
      callback([...mockTasks]);
    }
  );

  return () => {
    unsubscribe();
    taskListeners.delete(callback);
  };
};

export const createTask = async (taskData: Omit<Task, 'id'>) => {
  // Always try to save to real DB first.
  try {
    const cleanData = cleanUndefined(taskData);
    await addDoc(collection(db, TASKS_COLLECTION), cleanData);
    // If write succeeded, we are definitely connected
    if (isMockMode) {
        isMockMode = false;
        notifyMockStatus();
    }
  } catch (e) {
    console.warn("Create Task failed (falling back to local)", e);
    // Only fallback for the user experience, but this might indicate a real error
    const newTask = { id: `mock-${Date.now()}`, ...taskData };
    mockTasks.unshift(newTask as Task);
    broadcastMockTasks();
    
    // We set mock mode to true only on Write failure, as that confirms we can't persist data
    isMockMode = true;
    notifyMockStatus();
  }
};

export const deleteTask = async (taskId: string) => {
    // Handle mock tasks locally
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
        console.warn("Delete failed", e);
        // Optimistic update for mock view
        const idx = mockTasks.findIndex(t => t.id === taskId);
        if (idx !== -1) {
           mockTasks.splice(idx, 1);
           broadcastMockTasks();
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
      const cleanExtra = cleanUndefined(extraData || {});
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      await updateDoc(taskRef, { status, ...cleanExtra });
  } catch(e) {
      console.warn("Update status failed", e);
  }
};

// --- OFFERS ---

export const addOfferToTask = async (taskId: string, offer: Offer) => {
  // Handle local/mock task update
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
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      await updateDoc(taskRef, {
        offers: arrayUnion(cleanOffer)
      });
  } catch(e) {
      console.warn("Add offer failed", e);
      // Fallback: try to update it in mock array if it happens to be there (e.g. optimistic UI)
      const task = mockTasks.find(t => t.id === taskId);
      if (task) {
          task.offers.push(offer);
          broadcastMockTasks();
      }
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
      const taskRef = doc(db, TASKS_COLLECTION, taskId);
      const updates: any = {
          reviews: arrayUnion(cleanReview)
      };
      
      if (completionImageUrl) {
          updates.completionImageUrl = completionImageUrl;
      }

      await updateDoc(taskRef, updates);
  } catch (e) {
      console.warn("Add review failed", e);
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
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
        questions: arrayUnion(cleanQuestion)
    });
  } catch(e) {
    console.warn("Add question failed", e);
  }
};

export const answerQuestionInTask = async (taskId: string, questionId: string, answerText: string) => {
    const updateLocal = () => {
        const task = mockTasks.find(t => t.id === taskId);
        if (task && task.questions) {
            const q = task.questions.find(q => q.id === questionId);
            if (q) {
                q.answer = answerText;
                q.answeredAt = Date.now();
                broadcastMockTasks();
            }
        }
    };

    if (taskId.startsWith('mock-')) {
        updateLocal();
        return;
    }

    try {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        const taskSnap = await getDoc(taskRef);
        
        if (taskSnap.exists()) {
            const task = taskSnap.data() as Task;
            const updatedQuestions = (task.questions || []).map(q => {
                if (q.id === questionId) {
                    return { ...q, answer: answerText, answeredAt: Date.now() };
                }
                return q;
            });
            
            await updateDoc(taskRef, { questions: updatedQuestions });
        } else {
            updateLocal();
        }
    } catch (e) {
        updateLocal();
    }
};

// --- NOTIFICATIONS ---

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
    const q = query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId));
    
    const unsubscribe = onSnapshot(q, 
        (snapshot) => {
            const userNotifs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Notification))
                .sort((a, b) => b.createdAt - a.createdAt);
            callback(userNotifs);
        },
        (error) => {
            console.warn("Notifications subscription failed (using local simulation)", error);
            // Do NOT set global isMockMode = true.
            // Just handle notifications locally.
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
    try {
        const q = query(collection(db, NOTIFICATIONS_COLLECTION), where("userId", "==", userId), where("isRead", "==", false));
        const snapshot = await getDocs(q);
        // Batch update would be better, but for now simpler loop
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
