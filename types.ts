
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

export interface User {
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
  businessCategories?: string[]; 
  // Bank Details for Payouts
  bankIban?: string;
  bankBic?: string;
  bankHolder?: string;
}

export interface Offer {
  id: string;
  taskId: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string; 
  providerIsCompany?: boolean; 
  price: number;
  currency: string;
  duration: string; 
  startDate?: string; 
  comment: string;
  createdAt: number;
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
  escrowAmount?: number;
  reviews?: Review[];
  questions?: TaskQuestion[]; 
  imageUrl?: string; 
  images?: string[]; 
  
  // Completion Flow Fields
  completionImageUrl?: string; // The "After" photo from Provider
  submittedAt?: number; // When Provider marked as done
  
  // Dispute Flow
  dispute?: Dispute;
  
  aiEstimatedPrice?: string; 
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
  type: 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'TASK_COMPLETED' | 'PAYMENT_RELEASED' | 'TASK_SUBMITTED' | 'DISPUTE_OPENED' | 'SYSTEM';
  title: string;
  message: string;
  taskId?: string;
  isRead: boolean;
  createdAt: number;
}
