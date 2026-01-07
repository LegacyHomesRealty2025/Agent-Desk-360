
export enum UserRole {
  BROKER = 'BROKER',
  AGENT = 'AGENT'
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  ACTIVE = 'ACTIVE',
  IN_ESCROW = 'IN_ESCROW',
  CLOSED = 'CLOSED'
}

export enum LeadTemperature {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD',
  NORMAL = 'NORMAL'
}

export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export interface Brokerage {
  id: string;
  name: string;
  subscriptionPlan: 'BASIC' | 'PRO' | 'ENTERPRISE';
}

export interface User {
  id: string;
  brokerageId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  licenseNumber?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Lead {
  id: string;
  brokerageId: string;
  assignedAgentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  source: string;
  tags: string[];
  propertyType: 'PRIMARY' | 'SECONDARY' | 'INVESTMENT';
  propertyAddress?: string;
  budget: number;
  notes: LeadNote[];
  createdAt: string;
  updatedAt: string;
  estimatedDealValue: number;
  dob?: string;
  weddingAnniversary?: string;
  homeAnniversary?: string;
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseEmail?: string;
  spousePhone?: string;
  spouseDob?: string;
  secondaryContactRelationship?: 'Spouse' | 'Sister' | 'Brother' | 'Friend' | 'Partner' | 'Other';
  familyNotes?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  openHouseId?: string;
  checkInTime?: string;
  // API Integration Meta
  externalId?: string;
  integrationSource?: string;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  icon: string;
  status: 'ACTIVE' | 'INACTIVE';
  webhookUrl: string;
  apiKey?: string;
  lastIngestionAt?: string;
}

export interface Task {
  id: string;
  brokerageId: string;
  assignedUserId: string;
  leadId?: string;
  title: string;
  description: string;
  dueDate: string;
  endDate?: string;
  isCompleted: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DealNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  brokerageId: string;
  assignedUserId: string;
  leadId?: string;
  leadName: string;
  clientPhone?: string;
  clientEmail?: string;
  status: 'ACTIVE' | 'PENDING' | 'CLOSED';
  side: 'BUYER' | 'SELLER' | 'BOTH';
  address: string;
  salePrice: number;
  commissionPercentage: number;
  commissionAmount: number;
  date: string;
  source?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  // Transaction Management Fields
  escrowCompany?: string;
  escrowAddress?: string;
  escrowOfficer?: string;
  escrowPhone?: string;
  escrowEmail?: string;
  escrowFileNumber?: string;
  lenderCompany?: string;
  lenderPhone?: string; // office
  lenderCellPhone?: string;
  lenderEmail?: string;
  lenderLoanOfficer?: string;
  titleCompany?: string;
  titleOfficer?: string;
  titlePhone?: string;
  titleEmail?: string;
  tcName?: string;
  tcPhone?: string;
  tcEmail?: string;
  inspectionDueDate?: string;
  appraisalDueDate?: string;
  loanDueDate?: string;
  dealNotes?: DealNote[];
}

export interface OpenHouse {
  id: string;
  brokerageId: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  date2?: string;
  startTime2?: string;
  endTime2?: string;
  assignedAgentId: string;
  assignedAgentName: string;
  status: 'UPCOMING' | 'LIVE' | 'PAST';
  visitorCount: number;
  manualAgentPhone?: string;
  manualAgentLicense?: string;
  isManualAgent?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
}

export type EmailFolder = 'INBOX' | 'SENT' | 'DRAFTS' | 'TRASH' | 'ARCHIVE';

export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred?: boolean;
  folder: EmailFolder;
  attachments?: string[];
}

/** Documents / Learning Library Types **/

export type SharedDocumentType = 'PDF' | 'IMAGE' | 'VIDEO' | 'LINK' | 'DOC';

export interface SharedDocument {
  id: string;
  folderId: string;
  name: string;
  type: SharedDocumentType;
  url: string;
  createdAt: string;
  uploadedBy: string;
  uploadedById: string;
  size?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  sharedWithAgentId?: string; // Empty means everyone
}

export interface SharedFolder {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  sharedWithAgentId?: string; // Empty means everyone
}

/** Marketing Hub Types **/

export type MarketingAssetType = 'IMAGE' | 'VIDEO' | 'PDF' | 'LINK';

export interface MarketingAsset {
  id: string;
  name: string;
  type: MarketingAssetType;
  url: string;
  thumbnail?: string;
  folderId?: string;
  assignedTo?: string[]; // Empty means all
  isBrokerageStandard?: boolean;
  createdAt: string;
}

export interface MarketingFolder {
  id: string;
  name: string;
  icon: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  type: 'LISTING' | 'AGENT_BRAND' | 'EMAIL_BLAST';
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'ARCHIVED';
  content: any;
  createdAt: string;
}

/**
 * Interface for metadata items tracked in the trash bin
 */
export interface TrashedMetadata {
  name: string;
  deletedAt: string;
}

// Fix: Added missing YearlyGoal interface exported from types.ts
export interface YearlyGoal {
  userId: string;
  year: number;
  volumeTarget: number;
  unitTarget: number;
  gciTarget: number;
}

export interface AppState {
  currentUser: User | null;
  brokerage: Brokerage | null;
  leads: Lead[];
}
