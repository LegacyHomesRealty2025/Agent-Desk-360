import { User, UserRole, Lead, LeadStatus, LeadTemperature, Brokerage, Task, Deal, OpenHouse } from './types';

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
    licenseNumber: 'DRE# 02154882'
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
    licenseNumber: 'DRE# 01984223'
  }
];

export const MOCK_BROKER: User = {
  id: 'broker_1',
  brokerageId: 'brk_7721',
  firstName: 'Alexander',
  lastName: 'Pierce',
  email: 'alex@empire.com',
  phone: '(555) 444-5555',
  role: UserRole.BROKER,
  avatar: 'https://picsum.photos/seed/broker1/200',
  licenseNumber: 'DRE# 00871234'
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

const firstNames = ['Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Elijah', 'Charlotte', 'William', 'Sophia', 'James', 'Amelia', 'Benjamin', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Evelyn', 'Theodore', 'Harper', 'Alexander', 'Gianna', 'Jackson', 'Abigail', 'Sebastian', 'Luna', 'Mateo', 'Ella', 'Julian', 'Elizabeth', 'Levi', 'Sofia', 'Daniel', 'Camila', 'Jack', 'Aria', 'Owen', 'Scarlett', 'Asher', 'Victoria', 'Wyatt', 'Madison', 'Leo', 'Eleanor', 'Jose', 'Grace', 'David', 'Chloe', 'Leo', 'Penelope'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
const streetNames = ['Oak St', 'Maple Ave', 'Cedar Blvd', 'Pine Rd', 'Willow Ln', 'Main St', 'Broadway', 'Park Ave', 'Linden St', 'Washington Blvd', 'Harrison Rd', 'Chestnut St', 'Walnut Ave', 'Sunset Dr', 'Highland Ter', 'Magnolia Way', 'Devonshire Ln', 'Cambridge Rd', 'Lafayette Dr', 'Ventura Blvd'];
const cities = ['Scranton', 'Philadelphia', 'Allentown', 'Bethlehem', 'Reading', 'Harrisburg', 'Lancaster', 'Pittsburgh', 'Erie', 'York'];
const sources = ['Zillow', 'Realtor.com', 'Facebook', 'Google', 'Open House', 'Referral', 'TikTok', 'Instagram', 'Past Client', 'Friend'];

// Generate 100 unique name combinations
const generateUniqueNames = (count: number) => {
  const pairs: Set<string> = new Set();
  const result: { first: string, last: string }[] = [];
  while (result.length < count) {
    const f = firstNames[Math.floor(Math.random() * firstNames.length)];
    const l = lastNames[Math.floor(Math.random() * lastNames.length)];
    const pair = `${f} ${l}`;
    if (!pairs.has(pair)) {
      pairs.add(pair);
      result.push({ first: f, last: l });
    }
  }
  return result;
};

const uniqueNames = generateUniqueNames(100);

export const MOCK_LEADS: Lead[] = uniqueNames.map((name, i) => {
  const agentId = i % 2 === 0 ? 'agent_1' : 'agent_2';
  const budget = 300000 + Math.floor(Math.random() * 1200000);
  const statusValues = Object.values(LeadStatus);
  const tempValues = Object.values(LeadTemperature);
  
  // Ensure a few leads have milestones specifically in December 2025 for calendar visibility
  let dob = getRandomDate(new Date(1960, 0, 1), new Date(2000, 11, 31));
  let weddingAnniversary = i % 4 === 0 ? getRandomDate(new Date(1990, 0, 1), new Date(2023, 0, 1)) : undefined;
  let homeAnniversary = i % 3 === 0 ? getRandomDate(new Date(2010, 0, 1), new Date(2023, 0, 1)) : undefined;

  // Hack for demo: Force some into December 2025
  if (i < 10) {
    dob = `2025-12-${(i % 28) + 1}T12:00:00.000Z`;
  } else if (i < 20) {
    weddingAnniversary = `2025-12-${(i % 28) + 1}T12:00:00.000Z`;
  } else if (i < 30) {
    homeAnniversary = `2025-12-${(i % 28) + 1}T12:00:00.000Z`;
  }
  
  return {
    id: `lead_${i + 1}`,
    brokerageId: 'brk_7721',
    assignedAgentId: agentId,
    firstName: name.first,
    lastName: name.last,
    email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}${i}@example.com`,
    phone: `555-${1000 + i}`,
    status: statusValues[Math.floor(Math.random() * statusValues.length)],
    temperature: tempValues[Math.floor(Math.random() * tempValues.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    tags: ['Buyer', i % 5 === 0 ? 'Investor' : 'Primary'],
    propertyType: i % 10 === 0 ? 'INVESTMENT' : (i % 3 === 0 ? 'SECONDARY' : 'PRIMARY'),
    propertyAddress: `${Math.floor(Math.random() * 9999)} ${streetNames[Math.floor(Math.random() * streetNames.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}, PA`,
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
  const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
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
      : getRelDate(30 + Math.floor(Math.random() * 60)),
    source: lead.source
  };
});

// Initial Tasks
const INITIAL_TASKS: Task[] = [
  {
    id: 'task_1',
    brokerageId: 'brk_7721',
    assignedUserId: 'agent_1',
    leadId: 'lead_1',
    title: 'Call Michael Scott',
    description: 'Follow up on the suburban listing interest.',
    dueDate: getRelDate(1),
    isCompleted: false,
    priority: 'HIGH'
  }
];

// Generate 50 targeted tasks for December 2025
const DEC_2025_TASKS: Task[] = Array.from({ length: 50 }).map((_, i) => {
  const day = (i % 31) + 1;
  const taskTypes = [
    { title: 'Follow-up Call', desc: 'Check in on property search status.' },
    { title: 'Birthday Call', desc: 'Wish them a happy birthday and catch up.' },
    { title: 'Anniversary Gift Drop-off', desc: 'Deliver a small token of appreciation.' },
    { title: 'Home Anniversary Card', desc: 'Send a "Happy 1 Year" card.' },
    { title: 'Property Alert Setup', desc: 'Configure new MLS search for their criteria.' },
    { title: 'Review Closing Docs', desc: 'Verify all paperwork is ready for escrow.' },
    { title: 'Final Walkthrough', desc: 'Meet at the property for final inspection.' },
    { title: 'Lead Re-engagement', desc: 'Haven\'t heard from them in a while, ping them.' }
  ];
  const type = taskTypes[Math.floor(Math.random() * taskTypes.length)];
  const lead = MOCK_LEADS[Math.floor(Math.random() * MOCK_LEADS.length)];
  const priorities: ('LOW' | 'MEDIUM' | 'HIGH')[] = ['LOW', 'MEDIUM', 'HIGH'];

  return {
    id: `dec_task_${i}`,
    brokerageId: 'brk_7721',
    assignedUserId: i % 2 === 0 ? 'agent_1' : 'agent_2',
    leadId: lead.id,
    title: `${type.title}: ${lead.firstName}`,
    description: type.desc,
    dueDate: `2025-12-${day.toString().padStart(2, '0')}T10:00:00.000Z`,
    isCompleted: i % 7 === 0,
    priority: priorities[Math.floor(Math.random() * priorities.length)]
  };
});

export const MOCK_TASKS: Task[] = [...INITIAL_TASKS, ...DEC_2025_TASKS];

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
    visitorCount: 20 
  },
  {
    id: 'oh_2',
    brokerageId: 'brk_7721',
    address: '42 Wallaby Way, Scranton, PA',
    date: getRelDate(2).split('T')[0],
    startTime: '13:00',
    endTime: '16:00',
    assignedAgentId: 'agent_2',
    assignedAgentName: 'John Wick',
    status: 'UPCOMING',
    visitorCount: 0
  }
];
