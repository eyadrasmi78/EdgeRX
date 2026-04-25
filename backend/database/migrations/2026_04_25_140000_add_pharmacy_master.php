<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Phase A — Pharmacy Master multi-tenant model.
 *
 * Adds:
 *   - pharmacy_group_members pivot (one master ↔ many pharmacies, but each pharmacy
 *     can have at most one master — enforced by UNIQUE constraint on pharmacy_user_id)
 *   - orders.placed_by_user_id  — audit column for "master placed on behalf of pharmacy"
 *   - cart_items.on_behalf_of_user_id — masters can prep multi-pharmacy carts
 *
 * Backward-compatible: existing carts default `on_behalf_of_user_id = user_id` so
 * non-master flows are unaffected. The role string PHARMACY_MASTER doesn't need
 * a schema change because the role column is already a free-form string.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pharmacy_group_members', function (Blueprint $table) {
            $table->string('master_user_id');
            $table->string('pharmacy_user_id');
            $table->timestamp('joined_at')->useCurrent();

            $table->foreign('master_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('pharmacy_user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->primary(['master_user_id', 'pharmacy_user_id']);
            // Each pharmacy belongs to at most ONE master — enforced at the DB level.
            $table->unique('pharmacy_user_id', 'pgm_pharmacy_unique');
            $table->index('master_user_id', 'pgm_master_idx');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('placed_by_user_id')->nullable()->after('supplier_id');
            $table->foreign('placed_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index('placed_by_user_id', 'orders_placed_by_idx');
        });

        Schema::table('cart_items', function (Blueprint $table) {
            // Nullable for the migration window; backfilled below; eventually enforced as NOT NULL via app logic.
            $table->string('on_behalf_of_user_id')->nullable()->after('user_id');
            $table->foreign('on_behalf_of_user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        // Backfill: every existing cart_item has on_behalf_of_user_id = user_id (single-pharmacy default)
        DB::statement('UPDATE cart_items SET on_behalf_of_user_id = user_id WHERE on_behalf_of_user_id IS NULL');

        // Drop the old (user_id, product_id) unique → add (user_id, on_behalf_of_user_id, product_id) unique
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'product_id']);
        });
        Schema::table('cart_items', function (Blueprint $table) {
            $table->unique(['user_id', 'on_behalf_of_user_id', 'product_id'], 'cart_items_unique');
        });
    }

    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropUnique('cart_items_unique');
        });
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropForeign(['on_behalf_of_user_id']);
            $table->dropColumn('on_behalf_of_user_id');
            $table->unique(['user_id', 'product_id']); // restore old constraint
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['placed_by_user_id']);
            $table->dropIndex('orders_placed_by_idx');
            $table->dropColumn('placed_by_user_id');
        });

        Schema::dropIfExists('pharmacy_group_members');
    }
};
