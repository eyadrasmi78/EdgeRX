
import { User, Product, Order, FeedItem, OrderStatus, UserRole, RegistrationStatus, ProductCategory, FeedType, PartnershipRequest, TeamMember, ForeignBusinessType, ChatRoom, ChatMessage } from '../types';

const STORAGE_KEYS = {
  USERS: 'edgerx_users',
  PRODUCTS: 'edgerx_products',
  ORDERS: 'edgerx_orders',
  FEED: 'edgerx_feed',
  REQUESTS: 'edgerx_partnership_requests',
  CHATS: 'edgerx_chats'
};

// Initial Mock Data
const initialUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin',
    password: 'admin',
    role: UserRole.ADMIN,
    status: RegistrationStatus.APPROVED,
    companyDetails: { address: 'HQ', website: 'admin.edgerx.com' }
  },
  {
    id: '2',
    name: 'MediGlobal Suppliers',
    email: 'supplier@mediglobal.com',
    password: 'password',
    role: UserRole.SUPPLIER,
    status: RegistrationStatus.APPROVED,
    companyDetails: { 
        address: '123 Supply St, Dubai', 
        website: 'mediglobal.com',
        tradeLicenseNumber: 'TL-882192',
        tradeLicenseExpiry: '2025-12-31',
        authorizedSignatory: 'John Doe',
        authorizedSignatoryExpiry: '2026-05-20'
    }
  },
  {
    id: '5',
    name: 'Gulf Health Agents',
    email: 'info@gulfhealth.ae',
    password: 'password',
    role: UserRole.SUPPLIER,
    status: RegistrationStatus.APPROVED,
    companyDetails: { 
        address: 'Business Bay, Dubai', 
        website: 'gulfhealth.ae',
        tradeLicenseNumber: 'TL-990022',
        tradeLicenseExpiry: '2026-01-10',
        authorizedSignatory: 'Ahmad Rashid',
        authorizedSignatoryExpiry: '2025-09-12'
    }
  },
  {
    id: '3',
    name: 'City General Hospital',
    email: 'hospital@citygeneral.com',
    password: 'password',
    role: UserRole.CUSTOMER,
    status: RegistrationStatus.APPROVED,
    companyDetails: { 
        address: '456 Health Ave, Abu Dhabi', 
        website: 'citygeneral.ae',
        tradeLicenseNumber: 'TL-551029',
        tradeLicenseExpiry: '2024-11-15',
        authorizedSignatory: 'Jane Smith',
        authorizedSignatoryExpiry: '2025-01-10'
    }
  },
  {
    id: '4',
    name: 'BioTech Germany',
    email: 'global@biotech-germany.com',
    password: 'password',
    role: UserRole.FOREIGN_SUPPLIER,
    status: RegistrationStatus.APPROVED,
    companyDetails: {
        address: 'Berlin, Germany',
        website: 'biotech.de',
        country: 'Germany',
        businessType: ForeignBusinessType.MANUFACTURER,
        isoCertificateExpiry: '2026-08-01',
        isoCertificateFileName: 'ISO-9001.pdf'
    }
  }
];

const initialProducts: Product[] = [
  // --- MEDICINES ---
  {
    id: 'p1',
    name: 'Amoxicillin 500mg Capsules',
    genericName: 'Amoxicillin Trihydrate',
    brandName: 'Amoxil',
    description: 'A penicillin antibiotic used to treat various bacterial infections including chest infections and dental abscesses.',
    price: 18.50,
    unitOfMeasurement: 'Box',
    stockLevel: 1200,
    category: ProductCategory.MEDICINE,
    categoryLevel1: 'Medicine',
    categoryLevel2: 'Anti-Infective',
    categoryLevel3: 'Antibiotics',
    supplierName: 'MediGlobal Suppliers',
    manufacturer: 'PharmaCorp',
    countryOfOrigin: 'USA',
    dosageForm: 'Capsule',
    strength: '500mg',
    packSize: '30 Caps',
    registrationNumber: 'MOH-10023',
    therapeuticClass: 'Antibiotic',
    indication: 'Bacterial Infections',
    sku: 'AMX-500-US',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=500&q=80'
    ],
    bonusThreshold: 50,
    bonusType: 'percentage',
    bonusValue: 5
  },
  {
    id: 'p4',
    name: 'Lantus Insulin Solostar Pen',
    genericName: 'Insulin Glargine',
    brandName: 'Lantus',
    description: 'Long-acting insulin used to treat type 1 and type 2 diabetes. Provided in a pre-filled pen.',
    price: 145.00,
    unitOfMeasurement: 'Pack',
    stockLevel: 450,
    category: ProductCategory.MEDICINE,
    categoryLevel1: 'Medicine',
    categoryLevel2: 'Endocrine',
    categoryLevel3: 'Diabetes',
    supplierName: 'MediGlobal Suppliers',
    manufacturer: 'Sanofi',
    countryOfOrigin: 'France',
    dosageForm: 'Injectable Pen',
    strength: '100 units/mL',
    packSize: '5 Pens/Pack',
    registrationNumber: 'MOH-33129',
    sku: 'INS-LAN-5P',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
    ],
    bonusThreshold: 10,
    bonusType: 'fixed',
    bonusValue: 1
  },
  {
    id: 'p11',
    name: 'Glucophage 500mg Tablets',
    genericName: 'Metformin Hydrochloride',
    description: 'Oral antihyperglycemic agent used for the management of type 2 diabetes.',
    price: 5.40,
    unitOfMeasurement: 'Box',
    stockLevel: 5000,
    category: ProductCategory.MEDICINE,
    categoryLevel1: 'Medicine',
    categoryLevel2: 'Endocrine',
    categoryLevel3: 'Antidiabetics',
    supplierName: 'Gulf Health Agents',
    manufacturer: 'Merck',
    countryOfOrigin: 'Germany',
    packSize: '30 Tabs',
    registrationNumber: 'MOH-99120',
    sku: 'MED-MET-500',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p12',
    name: 'Lipitor 20mg Tablets',
    genericName: 'Atorvastatin Calcium',
    description: 'Statin medication used to prevent cardiovascular disease in those at high risk and treat abnormal lipid levels.',
    price: 42.00,
    unitOfMeasurement: 'Box',
    stockLevel: 800,
    category: ProductCategory.MEDICINE,
    categoryLevel1: 'Medicine',
    categoryLevel2: 'Cardiovascular',
    categoryLevel3: 'Statins',
    supplierName: 'Gulf Health Agents',
    manufacturer: 'Pfizer',
    countryOfOrigin: 'Ireland',
    packSize: '28 Tablets',
    registrationNumber: 'MOH-77123',
    sku: 'MED-LIP-20',
    image: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p13',
    name: 'Ventolin Evohaler 100mcg',
    genericName: 'Salbutamol Sulfate',
    description: 'Fast-acting bronchodilator for the relief of asthma symptoms.',
    price: 15.50,
    unitOfMeasurement: 'Unit',
    stockLevel: 1500,
    category: ProductCategory.MEDICINE,
    categoryLevel1: 'Medicine',
    categoryLevel2: 'Respiratory',
    categoryLevel3: 'Bronchodilators',
    supplierName: 'MediGlobal Suppliers',
    manufacturer: 'GSK',
    countryOfOrigin: 'UK',
    packSize: '200 Doses',
    registrationNumber: 'MOH-RES-101',
    sku: 'RES-VEN-100',
    image: 'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80'
    ]
  },

  // --- DEVICES ---
  {
    id: 'p5',
    name: 'Omron M2 Blood Pressure Monitor',
    description: 'Automatic blood pressure monitor with Intellisense technology. Clinical validation for accuracy.',
    price: 68.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 120,
    category: ProductCategory.DEVICE,
    categoryLevel1: 'Device',
    categoryLevel2: 'Diagnostic',
    categoryLevel3: 'Cardiology',
    supplierName: 'Gulf Health Agents',
    manufacturer: 'Omron Healthcare',
    countryOfOrigin: 'Japan',
    packSize: '1 Unit/Box',
    registrationNumber: 'MOH-DEVICE-99',
    sku: 'DIA-OMR-M2',
    image: 'https://images.unsplash.com/photo-1628863012213-397a61d15be1?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1628863012213-397a61d15be1?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p9',
    name: 'Nebulizer Compressor Kit',
    description: 'High-efficiency compressor nebulizer for respiratory treatment. Complete with adult and child masks.',
    price: 45.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 200,
    category: ProductCategory.DEVICE,
    categoryLevel1: 'Device',
    categoryLevel2: 'Respiratory',
    categoryLevel3: 'Nebulizers',
    supplierName: 'Gulf Health Agents',
    manufacturer: 'Philips Healthcare',
    countryOfOrigin: 'USA',
    sku: 'RES-NEB-PH',
    image: 'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p8',
    name: 'Orthopedic Titanium Screw Set',
    description: 'Self-tapping medical grade titanium screws for orthopedic fixation. Pack contains mixed sizes.',
    price: 850.00,
    unitOfMeasurement: 'Kit',
    stockLevel: 45,
    category: ProductCategory.DEVICE,
    categoryLevel1: 'Device',
    categoryLevel2: 'Surgical',
    categoryLevel3: 'Orthopedics',
    supplierName: 'MediGlobal Suppliers',
    manufacturer: 'Stryker',
    countryOfOrigin: 'Switzerland',
    registrationNumber: 'MOH-ORTHO-11',
    sku: 'SUR-TIT-SCR',
    image: 'https://images.unsplash.com/photo-1579154235602-3c37ef66882e?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1579154235602-3c37ef66882e?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1583912267670-6575ad3ce16a?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p14',
    name: 'Fingertip Pulse Oximeter Pro',
    description: 'Medical grade SpO2 and pulse rate monitor with OLED display.',
    price: 25.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 300,
    category: ProductCategory.DEVICE,
    categoryLevel1: 'Device',
    categoryLevel2: 'Diagnostic',
    categoryLevel3: 'Monitoring',
    supplierName: 'Gulf Health Agents',
    manufacturer: 'HealthTech',
    countryOfOrigin: 'China',
    sku: 'DIA-OXI-P01',
    image: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1632053001859-999339e075c3?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p3',
    name: 'VitalSignz Cardio Monitor',
    description: 'High-resolution cardiac patient monitor with ECG, SpO2, and NIBP monitoring capabilities. Touchscreen interface.',
    price: 1450.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 15,
    category: ProductCategory.DEVICE,
    categoryLevel1: 'Device',
    categoryLevel2: 'Monitoring',
    categoryLevel3: 'Patient Monitors',
    supplierName: 'BioTech Germany',
    manufacturer: 'MedTech Solutions',
    countryOfOrigin: 'Germany',
    registrationNumber: 'FDA-K19283',
    sku: 'DEV-CM-2024',
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=500&q=80'
    ],
    video: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4'
  },

  // --- EQUIPMENT ---
  {
    id: 'p2',
    name: 'N95 Medical Respirator',
    description: 'NIOSH-approved N95 particulate respirator mask for healthcare settings. Fluid resistant and disposable.',
    price: 22.00,
    unitOfMeasurement: 'Box',
    stockLevel: 5000,
    category: ProductCategory.EQUIPMENT,
    categoryLevel1: 'Equipment',
    categoryLevel2: 'PPE',
    categoryLevel3: 'Masks',
    supplierName: 'MediGlobal Suppliers',
    manufacturer: 'SafeWear Industries',
    countryOfOrigin: 'China',
    packSize: '20 Pcs/Box',
    sku: 'PPE-N95-20',
    image: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1585842378081-5c020224aa71?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p10',
    name: 'Sterile Surgical Gloves (Powder-free)',
    description: 'High-sensitivity latex-free surgical gloves. Enhanced grip and comfort for long procedures.',
    price: 1.20,
    unitOfMeasurement: 'Pair',
    stockLevel: 10000,
    category: ProductCategory.EQUIPMENT,
    categoryLevel1: 'Equipment',
    categoryLevel2: 'PPE',
    categoryLevel3: 'Gloves',
    supplierName: 'MediGlobal Suppliers',
    manufacturer: 'Ansell',
    countryOfOrigin: 'Malaysia',
    packSize: '50 Pairs/Box',
    sku: 'GLV-SUR-LFX',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1588611910609-b6840742b746?auto=format&fit=crop&w=500&q=80'
    ],
    bonusThreshold: 500,
    bonusType: 'percentage',
    bonusValue: 2
  },
  {
    id: 'p15',
    name: 'Movable Surgical Operation Table',
    description: 'Electric hydraulic operating table with multiple positioning options and radiographic compatibility.',
    price: 8500.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 5,
    category: ProductCategory.EQUIPMENT,
    categoryLevel1: 'Equipment',
    categoryLevel2: 'Hospital Furniture',
    categoryLevel3: 'Operating Room',
    supplierName: 'MediGlobal Suppliers',
    manufacturer: 'EuroMed',
    countryOfOrigin: 'Germany',
    sku: 'EQ-SUR-TAB',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1579684453423-f84349ca60df?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p16',
    name: 'Stainless Steel IV Stand',
    description: 'Sturdy four-leg IV pole with adjustable height and smooth-rolling casters.',
    price: 85.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 45,
    category: ProductCategory.EQUIPMENT,
    categoryLevel1: 'Equipment',
    categoryLevel2: 'Hospital Furniture',
    categoryLevel3: 'General Ward',
    supplierName: 'Gulf Health Agents',
    manufacturer: 'SteelMed',
    countryOfOrigin: 'UAE',
    sku: 'EQ-IVS-SS',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=500&q=80'
    ]
  },

  // --- SUPPLEMENTS & HERBS ---
  {
    id: 'p6',
    name: 'Vitamin C 1000mg Effervescent',
    description: 'Orange flavored effervescent tablets for immune support. High absorption formula.',
    price: 12.50,
    unitOfMeasurement: 'Tube',
    stockLevel: 3000,
    category: ProductCategory.SUPPLEMENT,
    categoryLevel1: 'Supplement',
    categoryLevel2: 'Vitamins',
    categoryLevel3: 'Immunity',
    supplierName: 'Gulf Health Agents',
    manufacturer: 'BioNutrition',
    countryOfOrigin: 'UK',
    packSize: '20 Tabs/Tube',
    sku: 'SUP-VIC-1000',
    image: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=500&q=80'
    ],
    bonusThreshold: 100,
    bonusType: 'percentage',
    bonusValue: 10
  },
  {
    id: 'p17',
    name: 'Omega-3 Fish Oil 1000mg',
    description: 'Pure Norwegian fish oil rich in EPA and DHA for heart and brain health.',
    price: 19.00,
    unitOfMeasurement: 'Bottle',
    stockLevel: 600,
    category: ProductCategory.SUPPLEMENT,
    categoryLevel1: 'Supplement',
    categoryLevel2: 'Nutrients',
    categoryLevel3: 'Heart Health',
    supplierName: 'Gulf Health Agents',
    manufacturer: 'Nordic Pharma',
    countryOfOrigin: 'Norway',
    packSize: '60 Softgels',
    sku: 'SUP-OMG-03',
    image: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?auto=format&fit=crop&w=500&q=80'
    ]
  },
  {
    id: 'p18',
    name: 'Chamomile Tea Extract Capsules',
    description: 'Organic chamomile extract for relaxation and digestive support.',
    price: 14.50,
    unitOfMeasurement: 'Bottle',
    stockLevel: 250,
    category: ProductCategory.HERB,
    categoryLevel1: 'Herb',
    categoryLevel2: 'Extracts',
    categoryLevel3: 'Sleep Support',
    supplierName: 'MediGlobal Suppliers',
    manufacturer: 'NaturePath',
    countryOfOrigin: 'USA',
    packSize: '90 Caps',
    sku: 'HRB-CHA-EXT',
    image: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1564593739703-e5e5d3298c77?auto=format&fit=crop&w=500&q=80'
    ]
  },

  // --- NEW FOREIGN SUPPLIER PRODUCTS (BioTech Germany) ---
  {
    id: 'p19',
    name: 'Magnetom Vida 3T MRI Scanner',
    description: 'State-of-the-art 3 Tesla MRI scanner with BioMatrix technology. Delivers consistent, high-quality personalized exams with faster workflow.',
    price: 1200000.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 2,
    category: ProductCategory.EQUIPMENT,
    categoryLevel1: 'Equipment',
    categoryLevel2: 'Diagnostic Imaging',
    categoryLevel3: 'MRI',
    supplierName: 'BioTech Germany',
    manufacturer: 'Siemens Healthineers',
    countryOfOrigin: 'Germany',
    registrationNumber: 'FDA-K18321',
    sku: 'EQ-MRI-3T-V',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=500&q=80'
    ],
    video: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4'
  },
  {
    id: 'p20',
    name: 'DaVinci Xi Surgical System',
    description: 'Advanced robotic surgical system designed for minimally invasive surgery. Features 3D HD vision system and wristed instruments.',
    price: 1850000.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 1,
    category: ProductCategory.EQUIPMENT,
    categoryLevel1: 'Equipment',
    categoryLevel2: 'Robotics',
    categoryLevel3: 'Surgical Systems',
    supplierName: 'BioTech Germany',
    manufacturer: 'Intuitive Surgical',
    countryOfOrigin: 'Germany',
    registrationNumber: 'FDA-K13123',
    sku: 'EQ-ROB-DVX',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80'
    ],
    video: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4'
  },
  {
    id: 'p21',
    name: 'Drager Apollo Anesthesia Workstation',
    description: 'Integrated anesthesia workstation for adults, pediatrics, and neonates. Includes advanced ventilation modes and monitoring.',
    price: 45000.00,
    unitOfMeasurement: 'Unit',
    stockLevel: 8,
    category: ProductCategory.DEVICE,
    categoryLevel1: 'Device',
    categoryLevel2: 'Anesthesia',
    categoryLevel3: 'Workstations',
    supplierName: 'BioTech Germany',
    manufacturer: 'Drager',
    countryOfOrigin: 'Germany',
    registrationNumber: 'FDA-K08213',
    sku: 'DEV-ANS-APL',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
    images: [
        'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1579684453423-f84349ca60df?auto=format&fit=crop&w=500&q=80'
    ]
  }
];

const initialOrders: Order[] = [
  {
    id: 'o1',
    orderNumber: 'ORD-2023-MOCK001',
    productId: 'p1',
    productName: 'Amoxicillin 500mg',
    customerId: '3',
    customerName: 'City General Hospital',
    supplierName: 'MediGlobal Suppliers',
    quantity: 50,
    unitOfMeasurement: 'Box',
    status: OrderStatus.COMPLETED,
    date: '2023-10-15T10:00:00Z',
    statusHistory: [
        { status: OrderStatus.RECEIVED, timestamp: '2023-10-15T10:00:00Z' },
        { status: OrderStatus.IN_PROGRESS, timestamp: '2023-10-16T09:00:00Z' },
        { status: OrderStatus.COMPLETED, timestamp: '2023-10-18T14:00:00Z' }
    ]
  }
];

const initialFeed: FeedItem[] = [
    {
        id: 'f1',
        type: FeedType.NEWS,
        title: 'MOH Quality Control Seminar',
        description: 'Invitation to all local agents for the upcoming seminar on medical product safety and traceability.',
        timestamp: new Date().toISOString(),
        authorId: '1',
        authorName: 'Admin',
        authorRole: UserRole.ADMIN,
        metadata: {
            newsUrl: 'https://health.gov/seminar'
        }
    },
    {
        id: 'f8',
        type: FeedType.NEWS,
        title: 'New Regulatory Guidelines for Biologics',
        description: 'Please find the attached document containing the latest MOH guidelines for the import and storage of biological medicines.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        authorId: '1',
        authorName: 'Admin',
        authorRole: UserRole.ADMIN,
        metadata: {
            mediaType: 'pdf',
            attachmentName: 'MOH_Biologics_Guidelines_2024.pdf',
            mediaUrl: 'data:application/pdf;base64,JVBERi0xLjcK...' 
        }
    },
    {
        id: 'f2',
        type: FeedType.CUSTOMER_REQUEST,
        title: 'Urgent Request: Orthopedic Implants',
        description: 'City General Hospital is looking for suppliers of high-grade titanium orthopedic screws and plates. Urgent requirement for next week.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        authorId: '3',
        authorName: 'City General Hospital',
        authorRole: UserRole.CUSTOMER
    },
    {
        id: 'f3',
        type: FeedType.ADVERTISEMENT,
        title: 'Promotion: N95 Respirator Masks',
        description: 'Get an extra 5% discount on bulk orders of NIOSH-approved N95 masks. Stock is ready for immediate dispatch.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        authorId: '2',
        authorName: 'MediGlobal Suppliers',
        authorRole: UserRole.SUPPLIER,
        isPinned: true,
        expiryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        metadata: {
            productId: 'p2',
            productImage: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=500&q=80',
            price: 20.90
        }
    },
    {
        id: 'f9',
        type: FeedType.ADVERTISEMENT,
        title: 'Premium Cardiology Monitors Available',
        description: 'Upgrade your ICU with the latest VitalSignz technology. Limited local stock available through MediGlobal.',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        authorId: '2',
        authorName: 'MediGlobal Suppliers',
        authorRole: UserRole.SUPPLIER,
        metadata: {
            productId: 'p3',
            productImage: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80',
            price: 1450.00
        }
    },
    {
        id: 'f4',
        type: FeedType.STOCK_UPDATE,
        title: 'Back in Stock: VitalSignz Cardio Monitor',
        description: 'Our highly requested cardiac monitors are back in stock and ready for global distribution.',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        authorId: '4',
        authorName: 'BioTech Germany',
        authorRole: UserRole.FOREIGN_SUPPLIER,
        metadata: {
            productId: 'p3',
            stockStatus: 'IN_STOCK'
        }
    },
    {
        id: 'f10',
        type: FeedType.STOCK_UPDATE,
        title: 'Restock Alert: Amoxicillin 500mg',
        description: 'Fresh batch of Amoxicillin arrived today. All pending backorders will be processed within 24 hours.',
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        authorId: '2',
        authorName: 'MediGlobal Suppliers',
        authorRole: UserRole.SUPPLIER,
        metadata: {
            productId: 'p1',
            stockStatus: 'IN_STOCK'
        }
    },
    {
        id: 'f5',
        type: FeedType.NEW_PRODUCT,
        title: 'New Diagnostic Range: Omron Devices',
        description: 'Gulf Health Agents is proud to announce the addition of Omron Diagnostic devices to our local portfolio.',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        authorId: '5',
        authorName: 'Gulf Health Agents',
        authorRole: UserRole.SUPPLIER,
        metadata: {
            productId: 'p5',
            productImage: 'https://images.unsplash.com/photo-1628863012213-397a61d15be1?auto=format&fit=crop&w=500&q=80'
        }
    },
    {
        id: 'f6',
        type: FeedType.CUSTOMER_REQUEST,
        title: 'Seeking: Pediatric Nebulizers',
        description: 'We are expanding our pediatric ward and require 50 units of high-quality nebulizers with child-sized masks.',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        authorId: '3',
        authorName: 'City General Hospital',
        authorRole: UserRole.CUSTOMER
    },
    {
        id: 'f11',
        type: FeedType.NEW_PRODUCT,
        title: 'Omicron-X Surgical Table Launch',
        description: 'Introducing the state-of-the-art EuroMed surgical table. Now available for demonstration at our Dubai showroom.',
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        authorId: '2',
        authorName: 'MediGlobal Suppliers',
        authorRole: UserRole.SUPPLIER,
        metadata: {
            productId: 'p15',
            productImage: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80'
        }
    }
];

// Data Access Layer
export const DataService = {
  // --- USERS ---
  getUsers: (): User[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(stored);
  },

  loginUser: (email: string, pass: string) => {
    const users = DataService.getUsers();
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
        if (user.status !== RegistrationStatus.APPROVED && user.role !== UserRole.ADMIN) {
            return { success: false, message: 'Account is pending approval.' };
        }
        return { success: true, user };
    }
    for (const u of users) {
        if (u.teamMembers) {
            const member = u.teamMembers.find(m => m.email === email && m.password === pass);
            if (member) {
                return { success: true, user: u, isTeamMember: true, memberDetails: member };
            }
        }
    }
    return { success: false, message: 'Invalid credentials.' };
  },

  registerUser: (newUser: User) => {
    const users = DataService.getUsers();
    if (users.find(u => u.email === newUser.email)) {
      return { success: false, message: 'Email already exists.' };
    }
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return { success: true, message: 'Registration successful. Pending approval.' };
  },

  updateUserStatus: (userId: string, status: RegistrationStatus) => {
    const users = DataService.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, status } : u);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
  },

  updateUser: (updatedUser: User) => {
      const users = DataService.getUsers();
      const index = users.findIndex(u => u.id === updatedUser.id);
      if (index !== -1) {
          users[index] = updatedUser;
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
          return { success: true };
      }
      return { success: false, message: 'User not found' };
  },

  addTeamMember: (parentId: string, member: TeamMember) => {
      const users = DataService.getUsers();
      const user = users.find(u => u.id === parentId);
      if (user) {
          if (!user.teamMembers) user.teamMembers = [];
          user.teamMembers.push(member);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
          return { success: true };
      }
      return { success: false, message: 'Parent user not found' };
  },

  updateTeamMember: (parentId: string, updatedMember: TeamMember) => {
      const users = DataService.getUsers();
      const user = users.find(u => u.id === parentId);
      if (user && user.teamMembers) {
          user.teamMembers = user.teamMembers.map(m => m.id === updatedMember.id ? updatedMember : m);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
          return { success: true };
      }
      return { success: false, message: 'User or Member not found' };
  },

  // --- PRODUCTS ---
  getProducts: (): Product[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
      return initialProducts;
    }
    return JSON.parse(stored);
  },

  addProduct: (product: Product) => {
    const products = DataService.getProducts();
    products.push(product);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  updateProduct: (updatedProduct: Product) => {
    const products = DataService.getProducts();
    const index = products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
        products[index] = updatedProduct;
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
  },

  // --- ORDERS ---
  getOrders: (): Order[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(initialOrders));
      return initialOrders;
    }
    return JSON.parse(stored);
  },

  createOrder: (order: Order) => {
    const orders = DataService.getOrders();
    orders.push(order);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },

  updateOrder: (orderId: string, updates: Partial<Order>, note?: string) => {
      const orders = DataService.getOrders();
      const updatedOrders = orders.map(o => {
          if (o.id === orderId) {
              const newHistory = [
                  ...(o.statusHistory || []),
                  { status: updates.status || o.status, timestamp: new Date().toISOString(), note }
              ];
              const mergedUpdates: Partial<Order> = { ...updates, statusHistory: newHistory };
              if (updates.status === OrderStatus.DECLINED && note) {
                  mergedUpdates.declineReason = note;
              }
              return { ...o, ...mergedUpdates };
          }
          return o;
      });
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
  },

  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string): void => {
    DataService.updateOrder(orderId, { status }, note);
  },

  // --- CHATS ---
  getChatRooms: (): ChatRoom[] => {
      const stored = localStorage.getItem(STORAGE_KEYS.CHATS);
      return stored ? JSON.parse(stored) : [];
  },

  getMessages: (orderId: string): ChatMessage[] => {
      const rooms = DataService.getChatRooms();
      const room = rooms.find(r => r.orderId === orderId);
      return room ? room.messages : [];
  },

  sendMessage: (orderId: string, message: ChatMessage) => {
      const rooms = DataService.getChatRooms();
      const roomIndex = rooms.findIndex(r => r.orderId === orderId);
      if (roomIndex > -1) {
          rooms[roomIndex].messages.push(message);
      } else {
          rooms.push({ orderId, messages: [message] });
      }
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(rooms));
  },

  // --- FEED ---
  getFeedItems: (): FeedItem[] => {
      const stored = localStorage.getItem(STORAGE_KEYS.FEED);
      if (!stored) {
          localStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(initialFeed));
          return initialFeed;
      }
      return JSON.parse(stored);
  },

  addFeedItem: (item: FeedItem) => {
      const feed = DataService.getFeedItems();
      feed.unshift(item);
      localStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(feed));
  },

  createCustomerRequest: (user: User, text: string) => {
      DataService.addFeedItem({
          id: Math.random().toString(36).substr(2, 9),
          type: FeedType.CUSTOMER_REQUEST,
          title: `Request from ${user.name}`,
          description: text,
          timestamp: new Date().toISOString(),
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role
      });
  },

  createAdvertisement: (user: User, product: Product, days: number) => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      DataService.addFeedItem({
          id: Math.random().toString(36).substr(2, 9),
          type: FeedType.ADVERTISEMENT,
          title: `Featured: ${product.name}`,
          description: product.description,
          timestamp: new Date().toISOString(),
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role,
          isPinned: true,
          expiryDate: expiry.toISOString(),
          metadata: {
              productId: product.id,
              productImage: product.image,
              price: product.price
          }
      });
  },

  createAdminNews: (user: User, title: string, content: string, mediaType?: 'image' | 'video' | 'pdf', mediaUrl?: string, link?: string, attachmentName?: string) => {
      DataService.addFeedItem({
          id: Math.random().toString(36).substr(2, 9),
          type: FeedType.NEWS,
          title,
          description: content,
          timestamp: new Date().toISOString(),
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role,
          metadata: {
              newsUrl: link,
              mediaUrl,
              mediaType,
              attachmentName
          }
      });
  },

  // --- PARTNERSHIPS ---
  getPartnershipRequests: (): PartnershipRequest[] => {
      const stored = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      return stored ? JSON.parse(stored) : [];
  },

  sendPartnershipRequest: (fromAgent: User, foreignSupplierId: string, productDetails?: { id: string, name: string }) => {
      const requests = DataService.getPartnershipRequests();
      
      // Check duplicate ONLY for general connection requests, or identical product request
      const existing = requests.find(r => 
          r.fromAgentId === fromAgent.id && 
          r.toForeignSupplierId === foreignSupplierId &&
          (productDetails ? r.productId === productDetails.id : !r.productId)
      );

      if (existing) {
          return { success: false, message: 'Request already sent.' };
      }

      const newReq: PartnershipRequest = {
          id: Math.random().toString(36).substr(2, 9),
          fromAgentId: fromAgent.id,
          fromAgentName: fromAgent.name,
          toForeignSupplierId: foreignSupplierId,
          status: 'PENDING',
          date: new Date().toISOString(),
          requestType: productDetails ? 'PRODUCT_INTEREST' : 'GENERAL_CONNECTION',
          message: productDetails 
            ? `Interest in product: ${productDetails.name}. Distribution rights inquiry.`
            : `Local distribution partnership request from ${fromAgent.name}.`,
          productId: productDetails?.id,
          productName: productDetails?.name
      };
      
      requests.push(newReq);
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
      return { success: true, message: 'Request sent successfully.' };
  },

  updatePartnershipRequest: (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
      const requests = DataService.getPartnershipRequests();
      const index = requests.findIndex(r => r.id === requestId);
      if (index !== -1) {
          requests[index].status = status;
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
          return { success: true };
      }
      return { success: false, message: 'Request not found' };
  }
};
