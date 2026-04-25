<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase B — Virtual Buying Groups (Feature 2).
 *
 * A buying_group is an admin-curated coalition of unrelated CUSTOMER pharmacies
 * pooling orders for one (supplier, product) pair to unlock bulk pricing.
 *
 * Lifecycle states:
 *   OPEN        — admin just created, members being invited
 *   COLLECTING  — members can commit + accept/decline (default working state)
 *   LOCKED      — deadline reached or all accepted; admin reviews before release
 *   RELEASED    — N child orders created, supplier notified, lifecycle continues per-member
 *   DISSOLVED   — threshold not met or admin cancelled
 *
 * Member states:
 *   INVITED     — admin added them, no commitment yet
 *   COMMITTED   — chose a quantity (still revocable until ACCEPTED)
 *   ACCEPTED    — locked their commitment; counts toward release threshold
 *   DECLINED    — opted out; ignored at release
 *
 * Master-owned pharmacies (those linked to a PHARMACY_MASTER via
 * pharmacy_group_members) are excluded from buying groups by app-level guard
 * in BuyingGroupsController. Per locked decision #16.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buying_groups', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('product_id');
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->string('supplier_id');
            $table->foreign('supplier_id')->references('id')->on('users')->cascadeOnDelete();
            $table->integer('target_quantity'); // aggregate threshold across all ACCEPTED members
            $table->timestamp('window_ends_at')->nullable(); // optional auto-release deadline
            $table->string('status')->default('OPEN'); // OPEN|COLLECTING|LOCKED|RELEASED|DISSOLVED
            $table->string('created_by_admin_id');
            $table->foreign('created_by_admin_id')->references('id')->on('users')->cascadeOnDelete();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('dissolved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'window_ends_at']);
            $table->index(['supplier_id', 'status']);
        });

        Schema::create('buying_group_members', function (Blueprint $table) {
            $table->id();
            $table->string('buying_group_id');
            $table->foreign('buying_group_id')->references('id')->on('buying_groups')->cascadeOnDelete();
            $table->string('customer_id');
            $table->foreign('customer_id')->references('id')->on('users')->cascadeOnDelete();
            $table->integer('committed_quantity')->nullable();
            $table->integer('apportioned_bonus')->nullable(); // populated at release
            $table->string('status')->default('INVITED'); // INVITED|COMMITTED|ACCEPTED|DECLINED
            $table->string('resulting_order_id')->nullable(); // link back to the Order created on release
            $table->foreign('resulting_order_id')->references('id')->on('orders')->nullOnDelete();
            $table->timestamps();

            // Each customer appears at most once per group
            $table->unique(['buying_group_id', 'customer_id'], 'bgm_group_customer_unique');
            $table->index(['customer_id', 'status']);
        });

        // Link from orders back to the buying group that released them (null for normal orders).
        Schema::table('orders', function (Blueprint $table) {
            $table->string('buying_group_id')->nullable()->after('placed_by_user_id');
            $table->foreign('buying_group_id')->references('id')->on('buying_groups')->nullOnDelete();
            $table->index('buying_group_id', 'orders_buying_group_idx');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['buying_group_id']);
            $table->dropIndex('orders_buying_group_idx');
            $table->dropColumn('buying_group_id');
        });
        Schema::dropIfExists('buying_group_members');
        Schema::dropIfExists('buying_groups');
    }
};
