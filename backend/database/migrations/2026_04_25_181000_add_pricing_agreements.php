<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase D2 — Locked-price agreements between a customer and a supplier.
 *
 * Status (string column, no DB constraint):
 *   DRAFT             supplier authoring; not yet sent
 *   PENDING_CUSTOMER  sent to customer for review/counter-sign
 *   PENDING_ADMIN     customer counter-signed; admin neutral approval pending
 *   ACTIVE            in effect (between valid_from and valid_to)
 *   EXPIRED           past valid_to, no auto-renew
 *   TERMINATED        early termination (notice period applies)
 *
 * Versioning: amendments produce a new row in pricing_agreement_versions snapshot;
 * orders reference (agreement_id, version) so historical pricing is immutable.
 *
 * MOQ behavior: when an order line qty < agreement_items.min_order_quantity,
 * `moq_fallback_mode` decides:
 *   FALLBACK_CATALOG  use catalog price for that line (with warning) — default
 *   BLOCK             reject the order line
 *   SPLIT             contract qty at contract price + remainder at catalog
 *
 * Scope: which pharmacies this agreement applies to.
 *   CUSTOMER_ONLY     only the named customer (default)
 *   MASTER_AND_CHILDREN  master + all child pharmacies
 *   SPECIFIC_CHILDREN nominate a subset of the master's children
 *
 * Bonuses toggle: contract-priced lines may still earn promo bonus rules unless
 * the agreement explicitly excludes (`bonuses_apply = false`).
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Header ──
        Schema::create('pricing_agreements', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('agreement_number')->unique(); // human-readable A-2026-001 style
            $table->string('customer_id');
            $table->foreign('customer_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('supplier_id');
            $table->foreign('supplier_id')->references('id')->on('users')->cascadeOnDelete();

            $table->string('status')->default('DRAFT');
            $table->integer('version')->default(1);

            $table->date('valid_from');
            $table->date('valid_to');
            $table->boolean('auto_renew')->default(false);
            $table->integer('renew_notice_days')->default(30);

            $table->string('moq_fallback_mode')->default('FALLBACK_CATALOG'); // FALLBACK_CATALOG|BLOCK|SPLIT
            $table->string('scope')->default('CUSTOMER_ONLY'); // CUSTOMER_ONLY|MASTER_AND_CHILDREN|SPECIFIC_CHILDREN
            $table->json('scoped_pharmacy_ids')->nullable();   // when scope = SPECIFIC_CHILDREN
            $table->boolean('bonuses_apply')->default(true);

            $table->string('currency', 3)->default('KWD');

            // Approval audit
            $table->timestamp('sent_to_customer_at')->nullable();
            $table->timestamp('signed_by_customer_at')->nullable();
            $table->timestamp('approved_by_admin_at')->nullable();
            $table->string('approved_by_admin_id')->nullable();
            $table->foreign('approved_by_admin_id')->references('id')->on('users')->nullOnDelete();

            $table->timestamp('terminated_at')->nullable();
            $table->text('termination_reason')->nullable();

            $table->string('signed_pdf_path')->nullable(); // counter-signed PDF
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'status']);
            $table->index(['supplier_id', 'status']);
            $table->index(['status', 'valid_to']);
        });

        // ── 2. Items ──
        Schema::create('pricing_agreement_items', function (Blueprint $table) {
            $table->id();
            $table->string('pricing_agreement_id');
            $table->foreign('pricing_agreement_id')->references('id')->on('pricing_agreements')->cascadeOnDelete();
            $table->string('product_id');
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();

            $table->decimal('unit_price', 10, 2);
            $table->integer('min_order_quantity')->default(1);
            $table->integer('max_period_quantity')->nullable();   // volume cap across the whole period
            $table->integer('committed_period_quantity')->nullable(); // total customer must buy across period
            $table->json('tier_breaks')->nullable();              // [{qty:100,price:5},{qty:500,price:4.5}]

            $table->timestamps();
            $table->unique(['pricing_agreement_id', 'product_id'], 'pa_items_unique');
        });

        // ── 3. Frozen snapshots referenced by historical orders ──
        Schema::create('pricing_agreement_versions', function (Blueprint $table) {
            $table->id();
            $table->string('pricing_agreement_id');
            $table->foreign('pricing_agreement_id')->references('id')->on('pricing_agreements')->cascadeOnDelete();
            $table->integer('version');
            $table->json('snapshot'); // full agreement+items at the moment of activation/amendment
            $table->timestamp('activated_at');
            $table->timestamps();
            $table->unique(['pricing_agreement_id', 'version'], 'pav_id_ver_unique');
        });

        // ── 4. Per-order-line pricing source (which agreement/version applied) ──
        // Non-breaking: nullable on existing orders; populated by the resolver when contract wins.
        Schema::table('orders', function (Blueprint $table) {
            $table->string('pricing_source')->nullable()->after('buying_group_id'); // CATALOG|PROMO|CONTRACT|BUYING_GROUP
            $table->string('pricing_agreement_id')->nullable()->after('pricing_source');
            $table->foreign('pricing_agreement_id')->references('id')->on('pricing_agreements')->nullOnDelete();
            $table->integer('pricing_agreement_version')->nullable()->after('pricing_agreement_id');
            $table->decimal('contracted_unit_price', 10, 2)->nullable()->after('pricing_agreement_version');
            $table->decimal('catalog_unit_price', 10, 2)->nullable()->after('contracted_unit_price');
            $table->decimal('savings_amount', 10, 2)->nullable()->after('catalog_unit_price');
            $table->index(['pricing_agreement_id'], 'orders_pricing_agreement_idx');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['pricing_agreement_id']);
            $table->dropIndex('orders_pricing_agreement_idx');
            $table->dropColumn([
                'pricing_source', 'pricing_agreement_id', 'pricing_agreement_version',
                'contracted_unit_price', 'catalog_unit_price', 'savings_amount',
            ]);
        });
        Schema::dropIfExists('pricing_agreement_versions');
        Schema::dropIfExists('pricing_agreement_items');
        Schema::dropIfExists('pricing_agreements');
    }
};
