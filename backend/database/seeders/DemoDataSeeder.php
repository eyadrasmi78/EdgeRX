<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\CompanyDetails;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderHistoryLog;
use App\Models\FeedItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Replicates frontend/services/mockData.ts byte-by-byte.
 * 5 users, 21 products, 11 feed items, 1 historic order, 4 bonus rules.
 *
 * Demo passwords (from prototype Login.tsx quick-fill):
 *   admin / admin                                       → ADMIN
 *   supplier@mediglobal.com / password                  → SUPPLIER (MediGlobal)
 *   info@gulfhealth.ae / password                       → SUPPLIER (Gulf Health)
 *   hospital@citygeneral.com / password                 → CUSTOMER
 *   global@biotech-germany.com / password               → FOREIGN_SUPPLIER (BioTech Germany)
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $this->seedUsers();
            $this->seedProducts();
            $this->seedPharmacyMaster();
            $this->seedOrders();
            $this->seedFeed();
            $this->seedBuyingGroups();
        });
    }

    /* ──────────────── BUYING GROUPS (Phase B demo) ──────────────── */
    private function seedBuyingGroups(): void
    {
        // City General Hospital (id=3) is the only seeded customer NOT under a master,
        // so for the demo we add a couple more independent customers to populate a buying group.
        $extraCustomers = [
            ['id' => 'bg_c1', 'name' => 'Al-Salam Pharmacy',         'email' => 'alsalam@pharma.kw'],
            ['id' => 'bg_c2', 'name' => 'Mishref Medical Center',    'email' => 'mishref@medical.kw'],
            ['id' => 'bg_c3', 'name' => 'Sabah Hospital Procurement','email' => 'sabah@hospital.kw'],
        ];
        foreach ($extraCustomers as $c) {
            \App\Models\User::updateOrCreate(['id' => $c['id']], [
                'id' => $c['id'],
                'name' => $c['name'],
                'email' => $c['email'],
                'password' => \Illuminate\Support\Facades\Hash::make('password', ['rounds' => 4]),
                'phone' => '+965-9000-' . substr($c['id'], -3),
                'role' => 'CUSTOMER',
                'status' => 'APPROVED',
            ]);
            \App\Models\CompanyDetails::updateOrCreate(
                ['user_id' => $c['id']],
                ['user_id' => $c['id'], 'address' => 'Kuwait', 'website' => 'demo.kw'],
            );
        }

        // Group 1: COLLECTING — admin invited 4 customers, 2 committed, 1 accepted
        $g1 = \App\Models\BuyingGroup::updateOrCreate(['id' => 'bg1'], [
            'id' => 'bg1',
            'name' => 'Q2 2026 Amoxicillin Bulk Buy',
            'product_id' => 'p1', // Amoxicillin (50 unit bonus threshold, 5%)
            'supplier_id' => '2', // MediGlobal
            'target_quantity' => 50,
            'window_ends_at' => now()->addDays(7),
            'status' => 'COLLECTING',
            'created_by_admin_id' => '1',
        ]);
        $g1->members()->delete();
        \App\Models\BuyingGroupMember::create([
            'buying_group_id' => 'bg1', 'customer_id' => '3',
            'committed_quantity' => 20, 'status' => 'ACCEPTED',
        ]);
        \App\Models\BuyingGroupMember::create([
            'buying_group_id' => 'bg1', 'customer_id' => 'bg_c1',
            'committed_quantity' => 15, 'status' => 'COMMITTED',
        ]);
        \App\Models\BuyingGroupMember::create([
            'buying_group_id' => 'bg1', 'customer_id' => 'bg_c2',
            'status' => 'INVITED',
        ]);
        \App\Models\BuyingGroupMember::create([
            'buying_group_id' => 'bg1', 'customer_id' => 'bg_c3',
            'status' => 'INVITED',
        ]);

        // Group 2: RELEASED — already converted into 3 orders
        $g2 = \App\Models\BuyingGroup::updateOrCreate(['id' => 'bg2'], [
            'id' => 'bg2',
            'name' => 'Vitamin C Bulk — March 2026',
            'product_id' => 'p6', // Vitamin C (100 unit threshold, 10%)
            'supplier_id' => '5', // Gulf Health Agents
            'target_quantity' => 100,
            'status' => 'RELEASED',
            'created_by_admin_id' => '1',
            'released_at' => now()->subDays(5),
        ]);
        $g2->members()->delete();
        // Pre-existing orders for the released group
        $releasedOrders = [
            ['id' => 'bg_ord1', 'order_number' => 'ORD-2026-BGV001', 'customer_id' => '3',
             'customer_name' => 'City General Hospital',
             'qty' => 50, 'bonus' => 5],
            ['id' => 'bg_ord2', 'order_number' => 'ORD-2026-BGV002', 'customer_id' => 'bg_c1',
             'customer_name' => 'Al-Salam Pharmacy',
             'qty' => 30, 'bonus' => 3],
            ['id' => 'bg_ord3', 'order_number' => 'ORD-2026-BGV003', 'customer_id' => 'bg_c3',
             'customer_name' => 'Sabah Hospital Procurement',
             'qty' => 20, 'bonus' => 2],
        ];
        foreach ($releasedOrders as $o) {
            \App\Models\Order::updateOrCreate(['id' => $o['id']], [
                'id' => $o['id'],
                'order_number' => $o['order_number'],
                'product_id' => 'p6', 'product_name' => 'Vitamin C 1000mg Effervescent',
                'customer_id' => $o['customer_id'], 'customer_name' => $o['customer_name'],
                'supplier_id' => '5', 'supplier_name' => 'Gulf Health Agents',
                'placed_by_user_id' => null,
                'buying_group_id' => 'bg2',
                'quantity' => $o['qty'], 'bonus_quantity' => $o['bonus'],
                'unit_of_measurement' => 'Tube',
                'status' => 'Completed',
                'date' => now()->subDays(5),
            ]);
            \App\Models\OrderHistoryLog::where('order_id', $o['id'])->delete();
            \App\Models\OrderHistoryLog::create([
                'order_id' => $o['id'], 'status' => 'Received',
                'timestamp' => now()->subDays(5),
                'note' => 'Released from buying group: Vitamin C Bulk — March 2026',
            ]);
            \App\Models\OrderHistoryLog::create([
                'order_id' => $o['id'], 'status' => 'Completed',
                'timestamp' => now()->subDays(2),
            ]);
            \App\Models\BuyingGroupMember::create([
                'buying_group_id' => 'bg2', 'customer_id' => $o['customer_id'],
                'committed_quantity' => $o['qty'], 'apportioned_bonus' => $o['bonus'],
                'status' => 'ACCEPTED', 'resulting_order_id' => $o['id'],
            ]);
        }
    }

    /* ──────────────── USERS ──────────────── */
    private function seedUsers(): void
    {
        $users = [
            [
                'id' => '1', 'name' => 'Admin User',
                'email' => 'admin', 'password' => 'admin',
                'role' => 'ADMIN', 'status' => 'APPROVED',
                'company' => ['address' => 'HQ', 'website' => 'admin.edgerx.com'],
            ],
            [
                'id' => '2', 'name' => 'MediGlobal Suppliers',
                'email' => 'supplier@mediglobal.com', 'password' => 'password',
                'role' => 'SUPPLIER', 'status' => 'APPROVED',
                'company' => [
                    'address' => '123 Supply St, Dubai',
                    'website' => 'mediglobal.com',
                    'trade_license_number' => 'TL-882192',
                    'trade_license_expiry' => '2025-12-31',
                    'authorized_signatory' => 'John Doe',
                    'authorized_signatory_expiry' => '2026-05-20',
                ],
            ],
            [
                'id' => '5', 'name' => 'Gulf Health Agents',
                'email' => 'info@gulfhealth.ae', 'password' => 'password',
                'role' => 'SUPPLIER', 'status' => 'APPROVED',
                'company' => [
                    'address' => 'Business Bay, Dubai',
                    'website' => 'gulfhealth.ae',
                    'trade_license_number' => 'TL-990022',
                    'trade_license_expiry' => '2026-01-10',
                    'authorized_signatory' => 'Ahmad Rashid',
                    'authorized_signatory_expiry' => '2025-09-12',
                ],
            ],
            [
                'id' => '3', 'name' => 'City General Hospital',
                'email' => 'hospital@citygeneral.com', 'password' => 'password',
                'role' => 'CUSTOMER', 'status' => 'APPROVED',
                'company' => [
                    'address' => '456 Health Ave, Abu Dhabi',
                    'website' => 'citygeneral.ae',
                    'trade_license_number' => 'TL-551029',
                    'trade_license_expiry' => '2024-11-15',
                    'authorized_signatory' => 'Jane Smith',
                    'authorized_signatory_expiry' => '2025-01-10',
                ],
            ],
            [
                'id' => '4', 'name' => 'BioTech Germany',
                'email' => 'global@biotech-germany.com', 'password' => 'password',
                'role' => 'FOREIGN_SUPPLIER', 'status' => 'APPROVED',
                'company' => [
                    'address' => 'Berlin, Germany',
                    'website' => 'biotech.de',
                    'country' => 'Germany',
                    'business_type' => 'Manufacturer',
                    'iso_certificate_expiry' => '2026-08-01',
                    'iso_certificate_file_name' => 'ISO-9001.pdf',
                ],
            ],
        ];

        foreach ($users as $u) {
            $company = $u['company'] ?? null;
            unset($u['company']);

            // Hash password manually since 'hashed' cast only triggers on attribute set.
            // Use bcrypt cost 4 here (lowest valid) — these are seed users, the cost only
            // matters at login time and bcrypt validation is constant-time anyway.
            // Live registrations still use the BCRYPT_ROUNDS=12 default.
            $u['password'] = Hash::make($u['password'], ['rounds' => 4]);

            User::updateOrCreate(['id' => $u['id']], $u);

            if ($company) {
                CompanyDetails::updateOrCreate(
                    ['user_id' => $u['id']],
                    array_merge(['user_id' => $u['id']], $company)
                );
            }
        }
    }

    /* ──────────────── PRODUCTS ──────────────── */
    private function seedProducts(): void
    {
        $products = [
            // ── MEDICINES ──
            [
                'id' => 'p1', 'supplier_id' => '2',
                'name' => 'Amoxicillin 500mg Capsules',
                'generic_name' => 'Amoxicillin Trihydrate', 'brand_name' => 'Amoxil',
                'description' => 'A penicillin antibiotic used to treat various bacterial infections including chest infections and dental abscesses.',
                'price' => 18.50, 'unit_of_measurement' => 'Box', 'stock_level' => 1200,
                'category' => 'Medicine',
                'category_level1' => 'Medicine', 'category_level2' => 'Anti-Infective', 'category_level3' => 'Antibiotics',
                'supplier_name' => 'MediGlobal Suppliers', 'manufacturer' => 'PharmaCorp',
                'country_of_origin' => 'USA', 'dosage_form' => 'Capsule', 'strength' => '500mg',
                'pack_size' => '30 Caps', 'registration_number' => 'MOH-10023',
                'therapeutic_class' => 'Antibiotic', 'indication' => 'Bacterial Infections',
                'sku' => 'AMX-500-US',
                'image' => 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=500&q=80',
                ],
                'bonus_threshold' => 50, 'bonus_type' => 'percentage', 'bonus_value' => 5,
            ],
            [
                'id' => 'p4', 'supplier_id' => '2',
                'name' => 'Lantus Insulin Solostar Pen',
                'generic_name' => 'Insulin Glargine', 'brand_name' => 'Lantus',
                'description' => 'Long-acting insulin used to treat type 1 and type 2 diabetes. Provided in a pre-filled pen.',
                'price' => 145.00, 'unit_of_measurement' => 'Pack', 'stock_level' => 450,
                'category' => 'Medicine',
                'category_level1' => 'Medicine', 'category_level2' => 'Endocrine', 'category_level3' => 'Diabetes',
                'supplier_name' => 'MediGlobal Suppliers', 'manufacturer' => 'Sanofi',
                'country_of_origin' => 'France', 'dosage_form' => 'Injectable Pen', 'strength' => '100 units/mL',
                'pack_size' => '5 Pens/Pack', 'registration_number' => 'MOH-33129', 'sku' => 'INS-LAN-5P',
                'image' => 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
                ],
                'bonus_threshold' => 10, 'bonus_type' => 'fixed', 'bonus_value' => 1,
            ],
            [
                'id' => 'p11', 'supplier_id' => '5',
                'name' => 'Glucophage 500mg Tablets',
                'generic_name' => 'Metformin Hydrochloride',
                'description' => 'Oral antihyperglycemic agent used for the management of type 2 diabetes.',
                'price' => 5.40, 'unit_of_measurement' => 'Box', 'stock_level' => 5000,
                'category' => 'Medicine',
                'category_level1' => 'Medicine', 'category_level2' => 'Endocrine', 'category_level3' => 'Antidiabetics',
                'supplier_name' => 'Gulf Health Agents', 'manufacturer' => 'Merck',
                'country_of_origin' => 'Germany', 'pack_size' => '30 Tabs',
                'registration_number' => 'MOH-99120', 'sku' => 'MED-MET-500',
                'image' => 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p12', 'supplier_id' => '5',
                'name' => 'Lipitor 20mg Tablets',
                'generic_name' => 'Atorvastatin Calcium',
                'description' => 'Statin medication used to prevent cardiovascular disease in those at high risk and treat abnormal lipid levels.',
                'price' => 42.00, 'unit_of_measurement' => 'Box', 'stock_level' => 800,
                'category' => 'Medicine',
                'category_level1' => 'Medicine', 'category_level2' => 'Cardiovascular', 'category_level3' => 'Statins',
                'supplier_name' => 'Gulf Health Agents', 'manufacturer' => 'Pfizer',
                'country_of_origin' => 'Ireland', 'pack_size' => '28 Tablets',
                'registration_number' => 'MOH-77123', 'sku' => 'MED-LIP-20',
                'image' => 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p13', 'supplier_id' => '2',
                'name' => 'Ventolin Evohaler 100mcg',
                'generic_name' => 'Salbutamol Sulfate',
                'description' => 'Fast-acting bronchodilator for the relief of asthma symptoms.',
                'price' => 15.50, 'unit_of_measurement' => 'Unit', 'stock_level' => 1500,
                'category' => 'Medicine',
                'category_level1' => 'Medicine', 'category_level2' => 'Respiratory', 'category_level3' => 'Bronchodilators',
                'supplier_name' => 'MediGlobal Suppliers', 'manufacturer' => 'GSK',
                'country_of_origin' => 'UK', 'pack_size' => '200 Doses',
                'registration_number' => 'MOH-RES-101', 'sku' => 'RES-VEN-100',
                'image' => 'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
                ],
            ],

            // ── DEVICES ──
            [
                'id' => 'p5', 'supplier_id' => '5',
                'name' => 'Omron M2 Blood Pressure Monitor',
                'description' => 'Automatic blood pressure monitor with Intellisense technology. Clinical validation for accuracy.',
                'price' => 68.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 120,
                'category' => 'Device',
                'category_level1' => 'Device', 'category_level2' => 'Diagnostic', 'category_level3' => 'Cardiology',
                'supplier_name' => 'Gulf Health Agents', 'manufacturer' => 'Omron Healthcare',
                'country_of_origin' => 'Japan', 'pack_size' => '1 Unit/Box',
                'registration_number' => 'MOH-DEVICE-99', 'sku' => 'DIA-OMR-M2',
                'image' => 'https://images.unsplash.com/photo-1628863012213-397a61d15be1?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1628863012213-397a61d15be1?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p9', 'supplier_id' => '5',
                'name' => 'Nebulizer Compressor Kit',
                'description' => 'High-efficiency compressor nebulizer for respiratory treatment. Complete with adult and child masks.',
                'price' => 45.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 200,
                'category' => 'Device',
                'category_level1' => 'Device', 'category_level2' => 'Respiratory', 'category_level3' => 'Nebulizers',
                'supplier_name' => 'Gulf Health Agents', 'manufacturer' => 'Philips Healthcare',
                'country_of_origin' => 'USA', 'sku' => 'RES-NEB-PH',
                'image' => 'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1631549916768-4119b295f926?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p8', 'supplier_id' => '2',
                'name' => 'Orthopedic Titanium Screw Set',
                'description' => 'Self-tapping medical grade titanium screws for orthopedic fixation. Pack contains mixed sizes.',
                'price' => 850.00, 'unit_of_measurement' => 'Kit', 'stock_level' => 45,
                'category' => 'Device',
                'category_level1' => 'Device', 'category_level2' => 'Surgical', 'category_level3' => 'Orthopedics',
                'supplier_name' => 'MediGlobal Suppliers', 'manufacturer' => 'Stryker',
                'country_of_origin' => 'Switzerland',
                'registration_number' => 'MOH-ORTHO-11', 'sku' => 'SUR-TIT-SCR',
                'image' => 'https://images.unsplash.com/photo-1579154235602-3c37ef66882e?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1579154235602-3c37ef66882e?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1583912267670-6575ad3ce16a?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p14', 'supplier_id' => '5',
                'name' => 'Fingertip Pulse Oximeter Pro',
                'description' => 'Medical grade SpO2 and pulse rate monitor with OLED display.',
                'price' => 25.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 300,
                'category' => 'Device',
                'category_level1' => 'Device', 'category_level2' => 'Diagnostic', 'category_level3' => 'Monitoring',
                'supplier_name' => 'Gulf Health Agents', 'manufacturer' => 'HealthTech',
                'country_of_origin' => 'China', 'sku' => 'DIA-OXI-P01',
                'image' => 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1632053001859-999339e075c3?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p3', 'supplier_id' => '4',
                'name' => 'VitalSignz Cardio Monitor',
                'description' => 'High-resolution cardiac patient monitor with ECG, SpO2, and NIBP monitoring capabilities. Touchscreen interface.',
                'price' => 1450.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 15,
                'category' => 'Device',
                'category_level1' => 'Device', 'category_level2' => 'Monitoring', 'category_level3' => 'Patient Monitors',
                'supplier_name' => 'BioTech Germany', 'manufacturer' => 'MedTech Solutions',
                'country_of_origin' => 'Germany',
                'registration_number' => 'FDA-K19283', 'sku' => 'DEV-CM-2024',
                'image' => 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=500&q=80',
                ],
                'video' => 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
            ],

            // ── EQUIPMENT ──
            [
                'id' => 'p2', 'supplier_id' => '2',
                'name' => 'N95 Medical Respirator',
                'description' => 'NIOSH-approved N95 particulate respirator mask for healthcare settings. Fluid resistant and disposable.',
                'price' => 22.00, 'unit_of_measurement' => 'Box', 'stock_level' => 5000,
                'category' => 'Equipment',
                'category_level1' => 'Equipment', 'category_level2' => 'PPE', 'category_level3' => 'Masks',
                'supplier_name' => 'MediGlobal Suppliers', 'manufacturer' => 'SafeWear Industries',
                'country_of_origin' => 'China', 'pack_size' => '20 Pcs/Box', 'sku' => 'PPE-N95-20',
                'image' => 'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1585842378081-5c020224aa71?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p10', 'supplier_id' => '2',
                'name' => 'Sterile Surgical Gloves (Powder-free)',
                'description' => 'High-sensitivity latex-free surgical gloves. Enhanced grip and comfort for long procedures.',
                'price' => 1.20, 'unit_of_measurement' => 'Pair', 'stock_level' => 10000,
                'category' => 'Equipment',
                'category_level1' => 'Equipment', 'category_level2' => 'PPE', 'category_level3' => 'Gloves',
                'supplier_name' => 'MediGlobal Suppliers', 'manufacturer' => 'Ansell',
                'country_of_origin' => 'Malaysia', 'pack_size' => '50 Pairs/Box', 'sku' => 'GLV-SUR-LFX',
                'image' => 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1588611910609-b6840742b746?auto=format&fit=crop&w=500&q=80',
                ],
                'bonus_threshold' => 500, 'bonus_type' => 'percentage', 'bonus_value' => 2,
            ],
            [
                'id' => 'p15', 'supplier_id' => '2',
                'name' => 'Movable Surgical Operation Table',
                'description' => 'Electric hydraulic operating table with multiple positioning options and radiographic compatibility.',
                'price' => 8500.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 5,
                'category' => 'Equipment',
                'category_level1' => 'Equipment', 'category_level2' => 'Hospital Furniture', 'category_level3' => 'Operating Room',
                'supplier_name' => 'MediGlobal Suppliers', 'manufacturer' => 'EuroMed',
                'country_of_origin' => 'Germany', 'sku' => 'EQ-SUR-TAB',
                'image' => 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1579684453423-f84349ca60df?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p16', 'supplier_id' => '5',
                'name' => 'Stainless Steel IV Stand',
                'description' => 'Sturdy four-leg IV pole with adjustable height and smooth-rolling casters.',
                'price' => 85.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 45,
                'category' => 'Equipment',
                'category_level1' => 'Equipment', 'category_level2' => 'Hospital Furniture', 'category_level3' => 'General Ward',
                'supplier_name' => 'Gulf Health Agents', 'manufacturer' => 'SteelMed',
                'country_of_origin' => 'UAE', 'sku' => 'EQ-IVS-SS',
                'image' => 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=500&q=80',
                ],
            ],

            // ── SUPPLEMENTS & HERBS ──
            [
                'id' => 'p6', 'supplier_id' => '5',
                'name' => 'Vitamin C 1000mg Effervescent',
                'description' => 'Orange flavored effervescent tablets for immune support. High absorption formula.',
                'price' => 12.50, 'unit_of_measurement' => 'Tube', 'stock_level' => 3000,
                'category' => 'Supplement',
                'category_level1' => 'Supplement', 'category_level2' => 'Vitamins', 'category_level3' => 'Immunity',
                'supplier_name' => 'Gulf Health Agents', 'manufacturer' => 'BioNutrition',
                'country_of_origin' => 'UK', 'pack_size' => '20 Tabs/Tube', 'sku' => 'SUP-VIC-1000',
                'image' => 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=500&q=80',
                ],
                'bonus_threshold' => 100, 'bonus_type' => 'percentage', 'bonus_value' => 10,
            ],
            [
                'id' => 'p17', 'supplier_id' => '5',
                'name' => 'Omega-3 Fish Oil 1000mg',
                'description' => 'Pure Norwegian fish oil rich in EPA and DHA for heart and brain health.',
                'price' => 19.00, 'unit_of_measurement' => 'Bottle', 'stock_level' => 600,
                'category' => 'Supplement',
                'category_level1' => 'Supplement', 'category_level2' => 'Nutrients', 'category_level3' => 'Heart Health',
                'supplier_name' => 'Gulf Health Agents', 'manufacturer' => 'Nordic Pharma',
                'country_of_origin' => 'Norway', 'pack_size' => '60 Softgels', 'sku' => 'SUP-OMG-03',
                'image' => 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'p18', 'supplier_id' => '2',
                'name' => 'Chamomile Tea Extract Capsules',
                'description' => 'Organic chamomile extract for relaxation and digestive support.',
                'price' => 14.50, 'unit_of_measurement' => 'Bottle', 'stock_level' => 250,
                'category' => 'Herb',
                'category_level1' => 'Herb', 'category_level2' => 'Extracts', 'category_level3' => 'Sleep Support',
                'supplier_name' => 'MediGlobal Suppliers', 'manufacturer' => 'NaturePath',
                'country_of_origin' => 'USA', 'pack_size' => '90 Caps', 'sku' => 'HRB-CHA-EXT',
                'image' => 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1564593739703-e5e5d3298c77?auto=format&fit=crop&w=500&q=80',
                ],
            ],

            // ── BIOTECH GERMANY (FOREIGN_SUPPLIER) ──
            [
                'id' => 'p19', 'supplier_id' => '4',
                'name' => 'Magnetom Vida 3T MRI Scanner',
                'description' => 'State-of-the-art 3 Tesla MRI scanner with BioMatrix technology. Delivers consistent, high-quality personalized exams with faster workflow.',
                'price' => 1200000.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 2,
                'category' => 'Equipment',
                'category_level1' => 'Equipment', 'category_level2' => 'Diagnostic Imaging', 'category_level3' => 'MRI',
                'supplier_name' => 'BioTech Germany', 'manufacturer' => 'Siemens Healthineers',
                'country_of_origin' => 'Germany',
                'registration_number' => 'FDA-K18321', 'sku' => 'EQ-MRI-3T-V',
                'image' => 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=500&q=80',
                ],
                'video' => 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
            ],
            [
                'id' => 'p20', 'supplier_id' => '4',
                'name' => 'DaVinci Xi Surgical System',
                'description' => 'Advanced robotic surgical system designed for minimally invasive surgery. Features 3D HD vision system and wristed instruments.',
                'price' => 1850000.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 1,
                'category' => 'Equipment',
                'category_level1' => 'Equipment', 'category_level2' => 'Robotics', 'category_level3' => 'Surgical Systems',
                'supplier_name' => 'BioTech Germany', 'manufacturer' => 'Intuitive Surgical',
                'country_of_origin' => 'Germany',
                'registration_number' => 'FDA-K13123', 'sku' => 'EQ-ROB-DVX',
                'image' => 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80',
                ],
                'video' => 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
            ],
            [
                'id' => 'p21', 'supplier_id' => '4',
                'name' => 'Drager Apollo Anesthesia Workstation',
                'description' => 'Integrated anesthesia workstation for adults, pediatrics, and neonates. Includes advanced ventilation modes and monitoring.',
                'price' => 45000.00, 'unit_of_measurement' => 'Unit', 'stock_level' => 8,
                'category' => 'Device',
                'category_level1' => 'Device', 'category_level2' => 'Anesthesia', 'category_level3' => 'Workstations',
                'supplier_name' => 'BioTech Germany', 'manufacturer' => 'Drager',
                'country_of_origin' => 'Germany',
                'registration_number' => 'FDA-K08213', 'sku' => 'DEV-ANS-APL',
                'image' => 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                    'https://images.unsplash.com/photo-1579684453423-f84349ca60df?auto=format&fit=crop&w=500&q=80',
                ],
            ],
        ];

        foreach ($products as $p) {
            Product::updateOrCreate(['id' => $p['id']], $p);
        }
    }

    /* ──────────────── ORDERS ──────────────── */
    private function seedOrders(): void
    {
        $order = Order::updateOrCreate(['id' => 'o1'], [
            'id' => 'o1',
            'order_number' => 'ORD-2023-MOCK001',
            'product_id' => 'p1',
            'product_name' => 'Amoxicillin 500mg',
            'customer_id' => '3',
            'customer_name' => 'City General Hospital',
            'supplier_id' => '2',
            'supplier_name' => 'MediGlobal Suppliers',
            'quantity' => 50,
            'unit_of_measurement' => 'Box',
            'status' => 'Completed',
            'date' => '2023-10-15T10:00:00Z',
        ]);

        // Status history (idempotent)
        OrderHistoryLog::where('order_id', 'o1')->delete();
        $logs = [
            ['status' => 'Received',     'timestamp' => '2023-10-15T10:00:00Z'],
            ['status' => 'In Progress',  'timestamp' => '2023-10-16T09:00:00Z'],
            ['status' => 'Completed',    'timestamp' => '2023-10-18T14:00:00Z'],
        ];
        foreach ($logs as $l) {
            OrderHistoryLog::create(array_merge(['order_id' => 'o1'], $l));
        }

        // ── Pharmacy Master historical orders (Phase A demo) ──
        // These are placed by master m1 on behalf of pharmazone1..3 to showcase the audit trail.
        $masterOrders = [
            [
                'id' => 'om1', 'order_number' => 'ORD-2026-PMG001',
                'product_id' => 'p1', 'product_name' => 'Amoxicillin 500mg',
                'customer_id' => 'pz1', 'customer_name' => 'PharmaZone 1 (Salmiya)',
                'supplier_id' => '2',  'supplier_name' => 'MediGlobal Suppliers',
                'placed_by_user_id' => 'm1',
                'quantity' => 50, 'bonus_quantity' => 2, 'unit_of_measurement' => 'Box',
                'status' => 'Completed', 'date' => '2026-04-10T09:00:00Z',
            ],
            [
                'id' => 'om2', 'order_number' => 'ORD-2026-PMG002',
                'product_id' => 'p1', 'product_name' => 'Amoxicillin 500mg',
                'customer_id' => 'pz2', 'customer_name' => 'PharmaZone 2 (Hawalli)',
                'supplier_id' => '2',  'supplier_name' => 'MediGlobal Suppliers',
                'placed_by_user_id' => 'm1',
                'quantity' => 60, 'bonus_quantity' => 3, 'unit_of_measurement' => 'Box',
                'status' => 'Shipment On The Way', 'date' => '2026-04-12T11:00:00Z',
            ],
            [
                'id' => 'om3', 'order_number' => 'ORD-2026-PMG003',
                'product_id' => 'p6', 'product_name' => 'Vitamin C 1000mg Effervescent',
                'customer_id' => 'pz3', 'customer_name' => 'PharmaZone 3 (Salmiya)',
                'supplier_id' => '5',  'supplier_name' => 'Gulf Health Agents',
                'placed_by_user_id' => 'm1',
                'quantity' => 100, 'bonus_quantity' => 10, 'unit_of_measurement' => 'Tube',
                'status' => 'In Progress', 'date' => '2026-04-18T14:30:00Z',
            ],
        ];
        foreach ($masterOrders as $o) {
            // Skip cleanly if pharmacy_master users don't exist yet (e.g. seedPharmacyMaster wasn't run)
            $exists = \App\Models\User::where('id', $o['customer_id'])->exists()
                && \App\Models\User::where('id', $o['placed_by_user_id'])->exists();
            if (!$exists) continue;
            Order::updateOrCreate(['id' => $o['id']], $o);
            OrderHistoryLog::where('order_id', $o['id'])->delete();
            OrderHistoryLog::create([
                'order_id' => $o['id'],
                'status' => 'Received',
                'timestamp' => $o['date'],
                'note' => "Placed by Gulf Pharmacy Group (master) on behalf of {$o['customer_name']}",
            ]);
            if ($o['status'] !== 'Received') {
                OrderHistoryLog::create([
                    'order_id' => $o['id'],
                    'status' => 'In Progress',
                    'timestamp' => date('c', strtotime($o['date']) + 86400),
                ]);
            }
            if (in_array($o['status'], ['Completed', 'Shipment On The Way'], true)) {
                OrderHistoryLog::create([
                    'order_id' => $o['id'],
                    'status' => $o['status'],
                    'timestamp' => date('c', strtotime($o['date']) + 86400 * 2),
                ]);
            }
        }
    }

    /* ──────────────── PHARMACY MASTER GROUP (Phase A demo) ──────────────── */
    private function seedPharmacyMaster(): void
    {
        // Master account
        $master = [
            'id' => 'm1',
            'name' => 'Gulf Pharmacy Group',
            'email' => 'master@gulfgroup.kw',
            'password' => Hash::make('password', ['rounds' => 4]),
            'phone' => '+965-2222-1000',
            'role' => 'PHARMACY_MASTER',
            'status' => 'APPROVED',
        ];
        \App\Models\User::updateOrCreate(['id' => $master['id']], $master);

        // 4 child pharmacies — independent CUSTOMER accounts, each can log in directly
        $pharmacies = [
            ['id' => 'pz1', 'name' => 'PharmaZone 1 (Salmiya)',     'email' => 'pharmazone1@example.com', 'address' => 'Salmiya, Block 4, Kuwait'],
            ['id' => 'pz2', 'name' => 'PharmaZone 2 (Hawalli)',     'email' => 'pharmazone2@example.com', 'address' => 'Hawalli, Tunis St., Kuwait'],
            ['id' => 'pz3', 'name' => 'PharmaZone 3 (Salmiya)',     'email' => 'pharmazone3@example.com', 'address' => 'Salmiya, Block 11, Kuwait'],
            ['id' => 'pz4', 'name' => 'PharmaZone 4 (Farwaniya)',   'email' => 'pharmazone4@example.com', 'address' => 'Farwaniya, Kuwait'],
        ];
        foreach ($pharmacies as $p) {
            \App\Models\User::updateOrCreate(['id' => $p['id']], [
                'id' => $p['id'],
                'name' => $p['name'],
                'email' => $p['email'],
                'password' => Hash::make('password', ['rounds' => 4]),
                'phone' => '+965-9999-' . substr($p['id'], -3),
                'role' => 'CUSTOMER',
                'status' => 'APPROVED',
            ]);
            CompanyDetails::updateOrCreate(
                ['user_id' => $p['id']],
                ['user_id' => $p['id'], 'address' => $p['address'], 'website' => 'pharmazone.kw'],
            );
        }

        // Link all 4 to the master (idempotent)
        DB::table('pharmacy_group_members')
            ->where('master_user_id', $master['id'])
            ->whereNotIn('pharmacy_user_id', array_column($pharmacies, 'id'))
            ->delete();
        foreach ($pharmacies as $p) {
            DB::table('pharmacy_group_members')->updateOrInsert(
                ['master_user_id' => $master['id'], 'pharmacy_user_id' => $p['id']],
                ['joined_at' => now()],
            );
        }
    }

    /* ──────────────── FEED ──────────────── */
    private function seedFeed(): void
    {
        $now = now();

        $items = [
            [
                'id' => 'f1', 'type' => 'NEWS',
                'title' => 'MOH Quality Control Seminar',
                'description' => 'Invitation to all local agents for the upcoming seminar on medical product safety and traceability.',
                'timestamp' => $now,
                'author_id' => '1', 'author_name' => 'Admin', 'author_role' => 'ADMIN',
                'metadata' => ['newsUrl' => 'https://health.gov/seminar'],
            ],
            [
                'id' => 'f8', 'type' => 'NEWS',
                'title' => 'New Regulatory Guidelines for Biologics',
                'description' => 'Please find the attached document containing the latest MOH guidelines for the import and storage of biological medicines.',
                'timestamp' => $now->copy()->subSeconds(1800),
                'author_id' => '1', 'author_name' => 'Admin', 'author_role' => 'ADMIN',
                'metadata' => [
                    'mediaType' => 'pdf',
                    'attachmentName' => 'MOH_Biologics_Guidelines_2024.pdf',
                    // Truncated short demo PDF data URL — full prototype was a placeholder string too
                    'mediaUrl' => 'data:application/pdf;base64,JVBERi0xLjcK',
                ],
            ],
            [
                'id' => 'f2', 'type' => 'CUSTOMER_REQUEST',
                'title' => 'Urgent Request: Orthopedic Implants',
                'description' => 'City General Hospital is looking for suppliers of high-grade titanium orthopedic screws and plates. Urgent requirement for next week.',
                'timestamp' => $now->copy()->subSeconds(3600),
                'author_id' => '3', 'author_name' => 'City General Hospital', 'author_role' => 'CUSTOMER',
            ],
            [
                'id' => 'f3', 'type' => 'ADVERTISEMENT',
                'title' => 'Promotion: N95 Respirator Masks',
                'description' => 'Get an extra 5% discount on bulk orders of NIOSH-approved N95 masks. Stock is ready for immediate dispatch.',
                'timestamp' => $now->copy()->subSeconds(7200),
                'author_id' => '2', 'author_name' => 'MediGlobal Suppliers', 'author_role' => 'SUPPLIER',
                'is_pinned' => true,
                'expiry_date' => $now->copy()->addDays(7),
                'metadata' => [
                    'productId' => 'p2',
                    'productImage' => 'https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=500&q=80',
                    'price' => 20.90,
                ],
            ],
            [
                'id' => 'f9', 'type' => 'ADVERTISEMENT',
                'title' => 'Premium Cardiology Monitors Available',
                'description' => 'Upgrade your ICU with the latest VitalSignz technology. Limited local stock available through MediGlobal.',
                'timestamp' => $now->copy()->subSeconds(10800),
                'author_id' => '2', 'author_name' => 'MediGlobal Suppliers', 'author_role' => 'SUPPLIER',
                'metadata' => [
                    'productId' => 'p3',
                    'productImage' => 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=500&q=80',
                    'price' => 1450.00,
                ],
            ],
            [
                'id' => 'f4', 'type' => 'STOCK_UPDATE',
                'title' => 'Back in Stock: VitalSignz Cardio Monitor',
                'description' => 'Our highly requested cardiac monitors are back in stock and ready for global distribution.',
                'timestamp' => $now->copy()->subSeconds(14400),
                'author_id' => '4', 'author_name' => 'BioTech Germany', 'author_role' => 'FOREIGN_SUPPLIER',
                'metadata' => ['productId' => 'p3', 'stockStatus' => 'IN_STOCK'],
            ],
            [
                'id' => 'f10', 'type' => 'STOCK_UPDATE',
                'title' => 'Restock Alert: Amoxicillin 500mg',
                'description' => 'Fresh batch of Amoxicillin arrived today. All pending backorders will be processed within 24 hours.',
                'timestamp' => $now->copy()->subSeconds(21600),
                'author_id' => '2', 'author_name' => 'MediGlobal Suppliers', 'author_role' => 'SUPPLIER',
                'metadata' => ['productId' => 'p1', 'stockStatus' => 'IN_STOCK'],
            ],
            [
                'id' => 'f5', 'type' => 'NEW_PRODUCT',
                'title' => 'New Diagnostic Range: Omron Devices',
                'description' => 'Gulf Health Agents is proud to announce the addition of Omron Diagnostic devices to our local portfolio.',
                'timestamp' => $now->copy()->subDay(),
                'author_id' => '5', 'author_name' => 'Gulf Health Agents', 'author_role' => 'SUPPLIER',
                'metadata' => [
                    'productId' => 'p5',
                    'productImage' => 'https://images.unsplash.com/photo-1628863012213-397a61d15be1?auto=format&fit=crop&w=500&q=80',
                ],
            ],
            [
                'id' => 'f6', 'type' => 'CUSTOMER_REQUEST',
                'title' => 'Seeking: Pediatric Nebulizers',
                'description' => 'We are expanding our pediatric ward and require 50 units of high-quality nebulizers with child-sized masks.',
                'timestamp' => $now->copy()->subDays(2),
                'author_id' => '3', 'author_name' => 'City General Hospital', 'author_role' => 'CUSTOMER',
            ],
            [
                'id' => 'f11', 'type' => 'NEW_PRODUCT',
                'title' => 'Omicron-X Surgical Table Launch',
                'description' => 'Introducing the state-of-the-art EuroMed surgical table. Now available for demonstration at our Dubai showroom.',
                'timestamp' => $now->copy()->subDays(3),
                'author_id' => '2', 'author_name' => 'MediGlobal Suppliers', 'author_role' => 'SUPPLIER',
                'metadata' => [
                    'productId' => 'p15',
                    'productImage' => 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=500&q=80',
                ],
            ],
        ];

        foreach ($items as $f) {
            FeedItem::updateOrCreate(['id' => $f['id']], $f);
        }
    }
}
