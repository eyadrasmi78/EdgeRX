<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase D1 — Pharmacy-to-Pharmacy Transfer (legal Kuwait MoH path).
 *
 * Direct A→B transfers are illegal in Kuwait. This feature legalizes them by
 * routing every transfer through the local supplier as a paired Return + Purchase
 * tied by a single transfer_request row. The supplier physically takes custody
 * during QC inspection, satisfying chain-of-title.
 *
 * Lifecycle (transfer_requests.status):
 *   INITIATED            A drafted, items + batch/expiry/cold-chain logs attached
 *   SUPPLIER_REVIEW      supplier sees one paired request (return + purchase legs)
 *   ACCEPTED_BY_SUPPLIER supplier ok'd; if MARKETPLACE, listing now visible to
 *                        all approved customers in this supplier's network;
 *                        if DIRECT, target customer notified
 *   B_CONFIRMED          target customer agreed to take the items
 *   QC_INTAKE            A physically shipped to supplier; supplier received
 *   QC_INSPECTION        supplier inspecting batch / expiry / packaging
 *   QC_PASSED → AWAITING_B_PAYMENT → RELEASED → COMPLETED
 *   QC_FAILED            terminal — items returned to A, B leg auto-cancelled,
 *                        no money moves (escrow_status stays NONE)
 *   CANCELLED            A or supplier cancelled before QC_INTAKE
 *
 * Compliance gates (enforced at INITIATED in FormRequest):
 *   - Controlled-substance products: blocked entirely (v1)
 *   - Cold-chain SKUs: temperature_log_path required
 *   - Expiry floor: each line's expiry must be ≥ system minimum (default 9 months)
 *   - Quantity cap: line qty ≤ N% of A's original purchase qty (default 50%)
 *
 * Pharmacy-Master scope: a child pharmacy's transfer always references the
 * master account (placed_by_user_id pattern). Cross-master transfers are
 * treated identically to unrelated pharmacies — supplier must do physical QC.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Product compliance flags (used by gates) ──
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_cold_chain')->default(false)->after('stock_level');
            $table->boolean('is_controlled_substance')->default(false)->after('is_cold_chain');
            // null = inherit system default (9 months), int = SKU-specific override
            $table->integer('transfer_min_shelf_life_months')->nullable()->after('is_controlled_substance');
            $table->index('is_controlled_substance');
        });

        // ── 2. transfer_requests (header) ──
        Schema::create('transfer_requests', function (Blueprint $table) {
            $table->string('id')->primary(); // uuid

            // Parties
            $table->string('source_user_id'); // pharmacy A
            $table->foreign('source_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('target_user_id')->nullable(); // pharmacy B (null = unclaimed marketplace listing)
            $table->foreign('target_user_id')->references('id')->on('users')->nullOnDelete();
            $table->string('supplier_id'); // local supplier handling QC + chain of title
            $table->foreign('supplier_id')->references('id')->on('users')->cascadeOnDelete();

            // Discovery & status
            $table->string('discovery_mode'); // DIRECT | MARKETPLACE
            $table->string('status')->default('INITIATED');

            // Original purchase A is returning from (for qty-cap check)
            $table->string('source_order_id')->nullable();
            $table->foreign('source_order_id')->references('id')->on('orders')->nullOnDelete();

            // Generated linked legs
            $table->string('return_order_id')->nullable();
            $table->foreign('return_order_id')->references('id')->on('orders')->nullOnDelete();
            $table->string('purchase_order_id')->nullable();
            $table->foreign('purchase_order_id')->references('id')->on('orders')->nullOnDelete();

            // Pricing & escrow
            $table->decimal('source_refund_amount', 10, 2)->default(0);   // what A receives net of fee
            $table->decimal('target_purchase_amount', 10, 2)->default(0); // what B pays (= refund + fee)
            $table->decimal('supplier_fee_flat', 10, 2)->default(0);      // configured by supplier
            $table->decimal('supplier_fee_percent', 5, 2)->default(0);    // configured by supplier
            $table->decimal('supplier_fee_applied', 10, 2)->default(0);   // max(flat, percent*refund)
            $table->string('escrow_status')->default('NONE'); // NONE | LOCKED | RELEASED | REFUNDED

            // QC outcome
            $table->string('qc_inspector_id')->nullable();
            $table->foreign('qc_inspector_id')->references('id')->on('users')->nullOnDelete();
            $table->timestamp('qc_passed_at')->nullable();
            $table->text('qc_failed_reason')->nullable();

            // Audit + invoicing
            $table->string('audit_pdf_path')->nullable();
            $table->string('source_credit_note_no')->nullable(); // credit note issued to A
            $table->string('target_invoice_no')->nullable();      // sales invoice issued to B

            $table->text('notes')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['supplier_id', 'status']);
            $table->index(['source_user_id', 'status']);
            $table->index(['target_user_id', 'status']);
            $table->index(['discovery_mode', 'status']);
        });

        // ── 3. transfer_request_items (lines) ──
        Schema::create('transfer_request_items', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_request_id');
            $table->foreign('transfer_request_id')->references('id')->on('transfer_requests')->cascadeOnDelete();
            $table->string('product_id');
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();

            $table->integer('quantity');
            $table->decimal('unit_price_refund', 10, 2);  // per-unit credit to A
            $table->decimal('unit_price_resale', 10, 2);  // per-unit charge to B

            // Compliance fields (mandatory at INITIATED for any non-controlled product)
            $table->string('batch_number');
            $table->string('lot_number')->nullable();
            $table->date('expiry_date');
            $table->string('gs1_barcode')->nullable();

            // Cold-chain evidence (required if product.is_cold_chain)
            $table->string('temperature_log_path')->nullable();

            // Photos of unopened packaging (JSON array of paths)
            $table->json('photo_paths')->nullable();

            // Per-line QC outcome
            $table->string('qc_status')->default('PENDING'); // PENDING | PASSED | FAILED
            $table->text('qc_failed_reason')->nullable();

            $table->timestamps();
            $table->index(['transfer_request_id', 'qc_status']);
        });

        // ── 4. transfer_qc_inspections (audit log of inspection events) ──
        Schema::create('transfer_qc_inspections', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_request_id');
            $table->foreign('transfer_request_id')->references('id')->on('transfer_requests')->cascadeOnDelete();
            $table->string('inspector_id');
            $table->foreign('inspector_id')->references('id')->on('users')->cascadeOnDelete();
            $table->timestamp('inspected_at');
            $table->string('result'); // PASS | FAIL | PARTIAL
            $table->text('notes')->nullable();
            $table->string('signature_path')->nullable();
            $table->timestamps();

            $table->index('transfer_request_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfer_qc_inspections');
        Schema::dropIfExists('transfer_request_items');
        Schema::dropIfExists('transfer_requests');

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['is_controlled_substance']);
            $table->dropColumn([
                'is_cold_chain',
                'is_controlled_substance',
                'transfer_min_shelf_life_months',
            ]);
        });
    }
};
