import { User, UserRole, Lead, LeadStatus, LeadTemperature, Brokerage, Task, Deal, OpenHouse, EmailMessage, YearlyGoal } from './types.ts';

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

const firstNames = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
const streetNames = ['Oak St', 'Maple Ave', 'Cedar Blvd', 'Pine Rd', 'Willow Ln'];
const cities = ['Scranton', 'Philadelphia', 'Allentown', 'Bethlehem', 'Reading'];
const sources = ['Zillow', 'Realtor.com', 'Facebook', 'Google', 'Referral'];

// Base leads generated via mapping
const generatedLeads: Lead[] = firstNames.map((fname, i) => {
  const agentId = i % 2 === 0 ? 'agent_1' : 'agent_2';
  const budget = 300000 + Math.floor(Math.random() * 1200000);
  const statusValues = Object.values(LeadStatus);
  const tempValues = Object.values(LeadTemperature);
  
  const day = (i * 5) + 1;
  let dob = `2025-12-${day.toString().padStart(2, '0')}T12:00:00.000Z`;
  let weddingAnniversary = i % 2 === 0 ? `2025-12-${(day + 1).toString().padStart(2, '0')}T12:00:00.000Z` : undefined;
  
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
    weddingAnniversary
  };
});

// 5 New High-Fidelity Leads with Secondary Contacts
const NEW_HIGH_FIDELITY_LEADS: Lead[] = [
  {
    id: 'lead_hf_1',
    brokerageId: 'brk_7721',
    assignedAgentId: 'agent_1',
    firstName: 'Michael',
    lastName: 'Scott',
    email: 'mscott@dundermifflin.com',
    phone: '(555) 000-1111',
    status: LeadStatus.ACTIVE,
    temperature: LeadTemperature.HOT,
    source: 'Referral',
    tags: ['Buyer', 'Luxury', 'Corporate'],
    propertyType: 'PRIMARY',
    propertyAddress: '1725 Slough Ave, Scranton, PA',
    budget: 850000,
    notes: [],
    createdAt: new Date('2025-05-15').toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDealValue: 25500,
    dob: '1965-03-15T12:00:00.000Z',
    weddingAnniversary: '2025-02-14T12:00:00.000Z',
    spouseFirstName: 'Jan',
    spouseLastName: 'Levinson',
    spouseEmail: 'jan@whitepages.com',
    spousePhone: '(555) 999-8888',
    secondaryContactRelationship: 'Partner'
  },
  {
    id: 'lead_hf_2',
    brokerageId: 'brk_7721',
    assignedAgentId: 'agent_2',
    firstName: 'Jim',
    lastName: 'Halpert',
    email: 'jimh@bigtuna.com',
    phone: '(555) 111-2222',
    status: LeadStatus.IN_ESCROW,
    temperature: LeadTemperature.WARM,
    source: 'Zillow',
    tags: ['First Time Buyer', 'Tech'],
    propertyType: 'PRIMARY',
    propertyAddress: '42 Wallaby Way, Scranton, PA',
    budget: 450000,
    notes: [],
    createdAt: new Date('2025-08-10').toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDealValue: 13500,
    dob: '1979-10-01T12:00:00.000Z',
    weddingAnniversary: '2025-10-08T12:00:00.000Z',
    spouseFirstName: 'Pam',
    spouseLastName: 'Beesly',
    spouseEmail: 'pam.b@art.com',
    spousePhone: '(555) 222-3333',
    secondaryContactRelationship: 'Spouse'
  },
  {
    id: 'lead_hf_3',
    brokerageId: 'brk_7721',
    assignedAgentId: 'agent_1',
    firstName: 'Dwight',
    lastName: 'Schrute',
    email: 'dwight@schrute-farms.com',
    phone: '(555) 333-4444',
    status: LeadStatus.CLOSED,
    temperature: LeadTemperature.NORMAL,
    source: 'Past Client',
    tags: ['Investor', 'Cash', 'Land'],
    propertyType: 'INVESTMENT',
    propertyAddress: 'Beet Farm Road, Honesdale, PA',
    budget: 1200000,
    notes: [],
    createdAt: new Date('2024-11-20').toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDealValue: 36000,
    dob: '1970-01-20T12:00:00.000Z',
    weddingAnniversary: '2025-11-20T12:00:00.000Z',
    spouseFirstName: 'Angela',
    spouseLastName: 'Martin',
    spouseEmail: 'angela.m@cats.com',
    spousePhone: '(555) 444-5555',
    secondaryContactRelationship: 'Spouse'
  },
  {
    id: 'lead_hf_4',
    brokerageId: 'brk_7721',
    assignedAgentId: 'agent_2',
    firstName: 'Stanley',
    lastName: 'Hudson',
    email: 'stanley@pretzelday.com',
    phone: '(555) 555-6666',
    status: LeadStatus.IN_ESCROW,
    temperature: LeadTemperature.NORMAL,
    source: 'Facebook',
    tags: ['Seller', 'Relocating'],
    propertyType: 'PRIMARY',
    propertyAddress: '12 Florida Blvd, Scranton, PA',
    budget: 600000,
    notes: [],
    createdAt: new Date('2025-12-01').toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDealValue: 18000,
    dob: '1958-02-12T12:00:00.000Z',
    weddingAnniversary: '2025-06-12T12:00:00.000Z',
    spouseFirstName: 'Teri',
    spouseLastName: 'Hudson',
    spouseEmail: 'teri.h@example.com',
    spousePhone: '(555) 666-7777',
    secondaryContactRelationship: 'Spouse'
  },
  {
    id: 'lead_hf_5',
    brokerageId: 'brk_7721',
    assignedAgentId: 'agent_1',
    firstName: 'Phyllis',
    lastName: 'Vance',
    email: 'phyllis.v@vancerefrig.com',
    phone: '(555) 777-8888',
    status: LeadStatus.ACTIVE,
    temperature: LeadTemperature.WARM,
    source: 'Google',
    tags: ['Buyer', 'Upsizing'],
    propertyType: 'PRIMARY',
    propertyAddress: '99 Refrigeration Ln, Scranton, PA',
    budget: 950000,
    notes: [],
    createdAt: new Date('2025-09-22').toISOString(),
    updatedAt: new Date().toISOString(),
    estimatedDealValue: 28500,
    dob: '1961-07-10T12:00:00.000Z',
    weddingAnniversary: '2025-12-25T12:00:00.000Z',
    spouseFirstName: 'Bob',
    spouseLastName: 'Vance',
    spouseEmail: 'bobv@vancerefrig.com',
    spousePhone: '(555) 888-9999',
    secondaryContactRelationship: 'Partner'
  }
];

export const MOCK_LEADS: Lead[] = [...generatedLeads, ...NEW_HIGH_FIDELITY_LEADS];

// Base deals
const generatedDeals: Deal[] = generatedLeads.map((lead, i) => {
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

// 5 Detailed Transactions matching the high-fidelity leads
const DETAILED_MOCK_DEALS: Deal[] = [
  {
    id: 'deal_hf_1',
    brokerageId: 'brk_7721',
    assignedUserId: 'agent_1',
    leadId: 'lead_hf_1',
    leadName: 'Michael Scott',
    status: 'ACTIVE',
    side: 'BUYER',
    address: '1725 Slough Ave, Scranton, PA',
    salePrice: 850000,
    commissionPercentage: 3,
    commissionAmount: 25500,
    date: '2026-01-30T12:00:00.000Z',
    source: 'Referral',
    escrowCompany: 'Scranton Escrow Co.',
    escrowOfficer: 'Creed Bratton',
    escrowPhone: '(555) 123-9999',
    escrowEmail: 'creed@scrantonescrow.com',
    lenderCompany: 'Office Bank',
    lenderLoanOfficer: 'Oscar Martinez',
    lenderPhone: '(555) 444-1234',
    lenderEmail: 'oscar@officebank.com',
    titleCompany: 'Keystone Title',
    titleOfficer: 'Toby Flenderson',
    tcName: 'Kelly Kapoor',
    tcPhone: '(555) 777-1111',
    tcEmail: 'kelly.tc@example.com'
  },
  {
    id: 'deal_hf_2',
    brokerageId: 'brk_7721',
    assignedUserId: 'agent_2',
    leadId: 'lead_hf_2',
    leadName: 'Jim Halpert',
    status: 'PENDING',
    side: 'BUYER',
    address: '42 Wallaby Way, Scranton, PA',
    salePrice: 450000,
    commissionPercentage: 3,
    commissionAmount: 13500,
    date: '2026-01-05T12:00:00.000Z', // 8 days from Dec 28
    source: 'Zillow',
    escrowCompany: 'Lakeside Escrow',
    escrowOfficer: 'Phyllis Vance',
    escrowPhone: '(555) 444-2222',
    escrowEmail: 'phyllis@lakeside.com',
    lenderCompany: 'QuickLoans',
    lenderLoanOfficer: 'Ryan Howard',
    lenderPhone: '(555) 333-1111',
    lenderEmail: 'ryan@quickloans.com',
    titleCompany: 'Blue Ridge Title',
    titleOfficer: 'Meredith Palmer',
    tcName: 'Kelly Kapoor',
    tcPhone: '(555) 777-1111',
    tcEmail: 'kelly.tc@example.com'
  },
  {
    id: 'deal_hf_3',
    brokerageId: 'brk_7721',
    assignedUserId: 'agent_1',
    leadId: 'lead_hf_3',
    leadName: 'Dwight Schrute',
    status: 'CLOSED',
    side: 'BUYER',
    address: 'Beet Farm Road, Honesdale, PA',
    salePrice: 1200000,
    commissionPercentage: 3,
    commissionAmount: 36000,
    date: '2025-11-20T12:00:00.000Z',
    source: 'Past Client',
    escrowCompany: 'Farms First Escrow',
    escrowOfficer: 'Mose Schrute',
    escrowPhone: '(555) 000-0000',
    escrowEmail: 'mose@farmsfirst.com',
    lenderCompany: 'Farmer Credit',
    lenderLoanOfficer: 'Robert California',
    lenderPhone: '(555) 888-7777',
    lenderEmail: 'robert@farmercredit.com',
    titleCompany: 'Penn Title',
    titleOfficer: 'Gabe Lewis',
    tcName: 'Kelly Kapoor',
    tcPhone: '(555) 777-1111',
    tcEmail: 'kelly.tc@example.com'
  },
  {
    id: 'deal_hf_4',
    brokerageId: 'brk_7721',
    assignedUserId: 'agent_2',
    leadId: 'lead_hf_4',
    leadName: 'Stanley Hudson',
    status: 'PENDING',
    side: 'SELLER',
    address: '12 Florida Blvd, Scranton, PA',
    salePrice: 600000,
    commissionPercentage: 3,
    commissionAmount: 18000,
    date: '2025-12-30T12:00:00.000Z', // 2 days from Dec 28
    source: 'Facebook',
    escrowCompany: 'Sunset Escrow',
    escrowOfficer: 'Nellie Bertram',
    escrowPhone: '(555) 222-1111',
    escrowEmail: 'nellie@sunset.com',
    lenderCompany: 'Relo Funds',
    lenderLoanOfficer: 'Clark Green',
    lenderPhone: '(555) 999-5555',
    lenderEmail: 'clark@relofunds.com',
    titleCompany: 'Palm Title',
    titleOfficer: 'Pete Miller',
    tcName: 'Kelly Kapoor',
    tcPhone: '(555) 777-1111',
    tcEmail: 'kelly.tc@example.com'
  },
  {
    id: 'deal_hf_5',
    brokerageId: 'brk_7721',
    assignedUserId: 'agent_1',
    leadId: 'lead_hf_5',
    leadName: 'Phyllis Vance',
    status: 'ACTIVE',
    side: 'BUYER',
    address: '99 Refrigeration Ln, Scranton, PA',
    salePrice: 950000,
    commissionPercentage: 3,
    commissionAmount: 28500,
    date: '2026-03-15T12:00:00.000Z',
    source: 'Google',
    escrowCompany: 'Industrial Escrow',
    escrowOfficer: 'Hank the Guard',
    escrowPhone: '(555) 555-5555',
    escrowEmail: 'hank@industrial.com',
    lenderCompany: 'Appliance Loans',
    lenderLoanOfficer: 'David Wallace',
    lenderPhone: '(555) 121-1212',
    lenderEmail: 'david@applloans.com',
    titleCompany: 'Vance Title',
    titleOfficer: 'Bob Vance',
    tcName: 'Kelly Kapoor',
    tcPhone: '(555) 777-1111',
    tcEmail: 'kelly.tc@example.com'
  }
];

export const MOCK_DEALS: Deal[] = [...generatedDeals, ...DETAILED_MOCK_DEALS];

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

// Fix: Added missing MOCK_GOALS export
export const MOCK_GOALS: YearlyGoal[] = [
  {
    userId: 'agent_1',
    year: 2025,
    volumeTarget: 10000000,
    unitTarget: 24,
    gciTarget: 300000
  },
  {
    userId: 'agent_2',
    year: 2025,
    volumeTarget: 8000000,
    unitTarget: 20,
    gciTarget: 240000
  },
  {
    userId: 'broker_1',
    year: 2025,
    volumeTarget: 50000000,
    unitTarget: 100,
    gciTarget: 1500000
  }
];