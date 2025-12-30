import { User, UserRole, Lead, LeadStatus, LeadTemperature, Brokerage, Task, Deal, OpenHouse, EmailMessage } from './types';

export const MOCK_BROKERAGE: Brokerage = {
  id: 'brk_7721',
  name: 'Legacy Homes Realty',
  subscriptionPlan: 'PRO'
};

export const MOCK_AGENTS: User[] = [
  {
    id: 'agent_1',
    brokerageId: 'brk_7721',
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah@empire.com',
    phone: '(555) 123-4567',
    role: UserRole.AGENT,
    avatar: 'https://picsum.photos/seed/agent1/200',
    licenseNumber: 'DRE Lic# 02154882'
  },
  {
    id: 'agent_2',
    brokerageId: 'brk_7721',
    firstName: 'John',
    lastName: 'Wick',
    email: 'john@empire.com',
    phone: '(555) 987-6543',
    role: UserRole.AGENT,
    avatar: 'https://picsum.photos/seed/agent2/200',
    licenseNumber: 'DRE Lic# 01984223'
  }
];

export const MOCK_BROKER: User = {
  id: 'broker_1',
  brokerageId: 'brk_7721',
  firstName: 'Josephine',
  lastName: 'Sharma',
  email: 'JSharmREO@yahoo.com',
  phone: '(555) 444-5555',
  role: UserRole.BROKER,
  avatar: 'https://picsum.photos/seed/broker1/200',
  licenseNumber: 'DRE Lic #01507253'
};

const getRandomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

const getRelDate = (days: number, monthOffset: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMonth(d.getMonth() + monthOffset);
  return d.toISOString();
};

const firstNames = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
const streetNames = ['Oak St', 'Maple Ave', 'Cedar Blvd', 'Pine Rd', 'Willow Ln'];
const cities = ['Scranton', 'Philadelphia', 'Allentown', 'Bethlehem', 'Reading'];
const sources = ['Zillow', 'Realtor.com', 'Facebook', 'Google', 'Referral'];

export const MOCK_LEADS: Lead[] = firstNames.map((fname, i) => {
  const agentId = i % 2 === 0 ? 'agent_1' : 'agent_2';
  const budget = 300000 + Math.floor(Math.random() * 1200000);
  const statusValues = Object.values(LeadStatus);
  const tempValues = Object.values(LeadTemperature);
  
  // Distribute milestones across December 2025 for calendar visibility
  const day = (i * 5) + 1;
  let dob = `2025-12-${day.toString().padStart(2, '0')}T12:00:00.000Z`;
  let weddingAnniversary = i % 2 === 0 ? `2025-12-${(day + 1).toString().padStart(2, '0')}T12:00:00.000Z` : undefined;
  let homeAnniversary = i % 3 === 0 ? `2025-12-${(day + 2).toString().padStart(2, '0')}T12:00:00.000Z` : undefined;
  
  return {
    id: `lead_${i + 1}`,
    brokerageId: 'brk_7721',
    assignedAgentId: agentId,
    firstName: fname,
    lastName: lastNames[i],
    email: `${fname.toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
    phone: `555-${1000 + i}`,
    status: statusValues[i % statusValues.length],
    temperature: tempValues[i % tempValues.length],
    source: sources[i % sources.length],
    tags: ['Buyer', i % 2 === 0 ? 'Investor' : 'Primary'],
    propertyType: i % 2 === 0 ? 'INVESTMENT' : 'PRIMARY',
    propertyAddress: `${Math.floor(Math.random() * 9999)} ${streetNames[i]}, ${cities[i]}, PA`,
    budget: budget,
    notes: [],
    createdAt: getRandomDate(new Date(2024, 0, 1), new Date()),
    updatedAt: new Date().toISOString(),
    estimatedDealValue: budget * 0.03,
    dob,
    weddingAnniversary,
    homeAnniversary
  };
});

export const MOCK_DEALS: Deal[] = MOCK_LEADS.map((lead, i) => {
  const statusOptions: ('ACTIVE' | 'PENDING' | 'CLOSED')[] = ['ACTIVE', 'PENDING', 'CLOSED'];
  const status = statusOptions[i % statusOptions.length];
  const side: 'BUYER' | 'SELLER' = i % 2 === 0 ? 'BUYER' : 'SELLER';
  const commissionPercentage = 2.5 + (Math.random() * 1);
  const salePrice = lead.budget;
  const commissionAmount = (salePrice * commissionPercentage) / 100;

  return {
    id: `deal_${i + 1}`,
    brokerageId: 'brk_7721',
    assignedUserId: lead.assignedAgentId,
    leadId: lead.id,
    leadName: `${lead.firstName} ${lead.lastName}`,
    status: status,
    side: side,
    address: lead.propertyAddress || 'TBD',
    salePrice: salePrice,
    commissionPercentage: parseFloat(commissionPercentage.toFixed(2)),
    commissionAmount: parseFloat(commissionAmount.toFixed(2)),
    date: status === 'CLOSED' 
      ? getRandomDate(new Date(2024, 0, 1), new Date()) 
      : `2025-12-${(i + 15).toString().padStart(2, '0')}T12:00:00.000Z`,
    source: lead.source
  };
});

export const MOCK_TASKS: Task[] = MOCK_LEADS.map((lead, i) => {
  const day = (i * 6) + 1;
  return {
    id: `task_${i + 1}`,
    brokerageId: 'brk_7721',
    assignedUserId: lead.assignedAgentId,
    leadId: lead.id,
    title: `Follow-up with ${lead.firstName}`,
    description: `Discuss property criteria and next steps.`,
    dueDate: `2025-12-${day.toString().padStart(2, '0')}T10:00:00.000Z`,
    isCompleted: false,
    priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM'
  };
});

export const MOCK_EMAILS: EmailMessage[] = [
  {
    id: 'em_1',
    sender: 'Liam Smith',
    senderEmail: 'liam.smith@example.com',
    recipientEmail: 'alex@empire.com',
    subject: 'Question about the Oak St property',
    body: 'Hi Alexander,\n\nI was looking at the 123 Oak St listing and was wondering if the kitchen appliances are included in the sale?\n\nBest,\nLiam',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    isStarred: true,
    folder: 'INBOX'
  },
  {
    id: 'em_2',
    sender: 'Escrow Officer',
    senderEmail: 'officer@titletrust.com',
    recipientEmail: 'alex@empire.com',
    subject: 'Closing docs for Williams',
    body: 'Alexander,\n\nThe signing for the Williams transaction has been scheduled for Friday at 2 PM. Please ensure the clients are aware.\n\nThanks,\nEscrow Dept.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isRead: true,
    folder: 'INBOX'
  }
];

export const MOCK_OPEN_HOUSES: OpenHouse[] = [
  {
    id: 'oh_1',
    brokerageId: 'brk_7721',
    address: '1725 Slough Avenue, Scranton, PA',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '14:00',
    assignedAgentId: 'agent_1',
    assignedAgentName: 'Sarah Connor',
    status: 'LIVE',
    visitorCount: 5 
  }
];