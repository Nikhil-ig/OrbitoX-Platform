export interface BranchOpeningHours {
  openTime: string;
  closeTime: string;
  daysOpen: string;
  isOpenNow?: boolean;
}

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  timezone: string;
  currency: string;
  status: 'OPERATIONAL' | 'SETUP' | 'OFFLINE';
  serviceAreasCount: number;
  activeTablesCount: number;
  openingHours?: BranchOpeningHours;
  phone?: string;
  email?: string;
}

export const DEFAULT_BRANCHES: BranchRecord[] = [
  {
    id: 'branch_ldh',
    name: 'Ludhiana Main',
    code: 'LDH-HQ',
    address: '54 Model Town, Mall Road',
    city: 'Ludhiana',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    status: 'OPERATIONAL',
    serviceAreasCount: 4,
    activeTablesCount: 28,
    openingHours: {
      openTime: '12:00 PM',
      closeTime: '11:30 PM',
      daysOpen: 'Mon - Sun',
      isOpenNow: true,
    },
    phone: '+91 161 450 8890',
    email: 'ludhiana@orbitoxbistro.com',
  },
  {
    id: 'branch_chd',
    name: 'Chandigarh Sector 17',
    code: 'CHD-S17',
    address: 'SCO 88-89, Sector 17-C',
    city: 'Chandigarh',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    status: 'OPERATIONAL',
    serviceAreasCount: 3,
    activeTablesCount: 22,
    openingHours: {
      openTime: '11:30 AM',
      closeTime: '11:00 PM',
      daysOpen: 'Mon - Sun',
      isOpenNow: true,
    },
    phone: '+91 172 270 4421',
    email: 'chandigarh@orbitoxbistro.com',
  },
  {
    id: 'branch_del',
    name: 'Delhi Connaught Place',
    code: 'DEL-CP',
    address: 'Radial Road 4, Inner Circle',
    city: 'New Delhi',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    status: 'OPERATIONAL',
    serviceAreasCount: 3,
    activeTablesCount: 34,
    openingHours: {
      openTime: '12:00 PM',
      closeTime: '01:00 AM',
      daysOpen: 'Mon - Sun',
      isOpenNow: true,
    },
    phone: '+91 11 4150 9982',
    email: 'delhi@orbitoxbistro.com',
  },
];
