
export enum TaskStatus {
  OPEN = 'OPEN', // Task created, waiting for offers
  AWAITING_PAYMENT = 'AWAITING_PAYMENT', // Offer accepted, waiting for escrow deposit
  IN_PROGRESS = 'IN_PROGRESS', // Money in escrow, work started
  IN_REVIEW = 'IN_REVIEW', // Provider marked done, waiting for requester approval/24h timer
  DISPUTED = 'DISPUTED', // Requester reported issue
  CLOSED = 'CLOSED' // Money released
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string;
  joinedAt: number;
  rating: number;
  reviewCount: number;
  bio?: string;
  skills?: string[];
  isAdmin?: boolean;
  status?: 'ACTIVE' | 'BANNED';
  isCompany?: boolean;
  companyCategory?: string; // New field for business category
  companyFoundedDate?: string; // New field for founding date
  businessCategories?: string[];
  isOnline?: boolean; // New field for Online Status
  lastSeen?: number;

  // Stripe Connect Fields
  stripeAccountId?: string; // Legacy field (defaults to individual)
  stripeOnboardingComplete?: boolean;
  
  // Dual account support
  stripeAccountId_individual?: string;
  stripeOnboardingComplete_individual?: boolean;
  stripeAccountId_company?: string;
  stripeOnboardingComplete_company?: boolean;
}

export interface Offer {
  id: string;
  taskId: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  providerIsCompany?: boolean;
  billingType?: 'individual' | 'company'; // NEW: Identity used for this offer
  price: number;
  currency: string;
  duration: string;
  startDate?: string;
  comment: string;
  createdAt: number;
  providerStripeVerified?: boolean;
}

export interface Review {
  id: string;
  taskId?: string;
  fromUserId: string;
  fromUser: string;
  toUserId: string;
  toUser: string;
  rating: number;   // 1-5
  comment: string;
  createdAt: number;
}

export interface TaskQuestion {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: number;
  answer?: string;
  answeredAt?: number;
}

export interface Dispute {
  reason: string;
  description: string;
  evidenceImageUrl?: string;
  createdAt: number;
  status: 'OPEN' | 'RESOLVED_REFUND' | 'RESOLVED_PAY';
  initiatedBy?: string; // User ID of who started the dispute/cancellation
  initiatedByName?: string; // Name of who started it
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
  isAdmin?: boolean; // If an admin steps in
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category?: string;
  location: GeoLocation;
  address?: string;
  status: TaskStatus;
  requesterRating?: number;
  requesterReviewCount?: number;
  createdAt: number;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  requesterIsCompany?: boolean;
  offers: Offer[];
  acceptedOfferId?: string;
  acceptedProviderId?: string;
  acceptedProviderName?: string;
  acceptedProviderAvatar?: string;
  acceptedPrice?: number;
  acceptedAt?: number;
  acceptedProviderStripeAccountId?: string; // New: Preserved Stripe ID for payment release
  escrowAmount?: number;
  paymentIntentId?: string; // ID of the Stripe Payment Intent used for escrow
  reviews?: Review[];
  questions?: TaskQuestion[];
  imageUrl?: string;
  images?: string[];
  requesterPhone?: string; // New: Denormalized for quick contact
  acceptedProviderPhone?: string; // New: Denormalized for quick contact

  // New field for timing preference
  timing?: string;

  // Completion Flow Fields
  completionImageUrl?: string; // The "After" photo from Provider
  submittedAt?: number; // When Provider marked as done

  // Dispute Flow
  dispute?: Dispute;

  aiEstimatedPrice?: string;

  // Counters for scalability (denormalized)
  offersCount?: number;
  questionsCount?: number;
  reviewsCount?: number;

  // --- In-Progress Management Fields ---
  materialsPayments?: MaterialsPayment[];
  extensionRequests?: ExtensionRequest[];
  circumstances?: TaskCircumstance[];
  additionalEscrowAmount?: number; // Total extra funds held in escrow
  
  // Cancellation & Disputes
  requesterAgreedCancel?: boolean;
  providerAgreedCancel?: boolean;
  cancelReason?: string;
  cancelInitiatedBy?: string; // userId
  
  reportedByRequester?: boolean;
  reportReason?: string;
  reportCreatedAt?: number;
}

export interface MaterialsPayment {
  id: string;
  amount: number;
  description: string;
  status: 'PENDING' | 'PAID';
  createdAt: number;
  paymentIntentId?: string;
}

export interface ExtensionRequest {
  id: string;
  newDate: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: number;
}

export interface TaskCircumstance {
  id: string;
  description: string;
  requestedPrice?: number;
  requestedExtension?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: number;
  additionalPaymentIntentId?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface AIAnalysisResult {
  title: string;
  description: string;
  category?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'TASK_COMPLETED' | 'PAYMENT_RELEASED' | 'TASK_SUBMITTED' | 'DISPUTE_OPENED' | 'NEW_MESSAGE' | 'SYSTEM';
  title: string;
  message: string;
  taskId?: string;
  isRead: boolean;
  createdAt: number;
}
