<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'name', 'email', 'password', 'phone', 'role', 'status',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $u) {
            if (empty($u->id)) {
                $u->id = (string) Str::uuid();
            }
        });
    }

    public function companyDetails()
    {
        return $this->hasOne(CompanyDetails::class, 'user_id');
    }

    public function teamMembers()
    {
        return $this->hasMany(TeamMember::class, 'parent_user_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'supplier_id');
    }

    public function customerOrders()
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function supplierOrders()
    {
        return $this->hasMany(Order::class, 'supplier_id');
    }

    public function cartItems()
    {
        return $this->hasMany(CartItem::class);
    }

    /* ---------- role helpers ---------- */
    public function isAdmin(): bool { return $this->role === 'ADMIN'; }
    public function isCustomer(): bool { return $this->role === 'CUSTOMER'; }
    public function isSupplier(): bool { return in_array($this->role, ['SUPPLIER', 'FOREIGN_SUPPLIER'], true); }
    public function isLocalSupplier(): bool { return $this->role === 'SUPPLIER'; }
    public function isForeignSupplier(): bool { return $this->role === 'FOREIGN_SUPPLIER'; }
    public function isPharmacyMaster(): bool { return $this->role === 'PHARMACY_MASTER'; }
    public function isApproved(): bool { return $this->status === 'APPROVED'; }

    /* ---------- pharmacy master relations (Feature 1) ---------- */
    /**
     * Pharmacies this user (a master) owns. Empty for non-masters.
     */
    public function masterOf()
    {
        return $this->belongsToMany(
            User::class,
            'pharmacy_group_members',
            'master_user_id',
            'pharmacy_user_id'
        )->withPivot('joined_at');
    }

    /**
     * The single master that owns this pharmacy (if any). Empty for non-customer roles
     * and for customers without a master — the relation is a collection but the DB
     * UNIQUE on pharmacy_user_id guarantees at most one row.
     */
    public function masteredBy()
    {
        return $this->belongsToMany(
            User::class,
            'pharmacy_group_members',
            'pharmacy_user_id',
            'master_user_id'
        )->withPivot('joined_at');
    }

    /**
     * True iff this user is the master of $pharmacyUserId.
     */
    public function ownsPharmacy(string $pharmacyUserId): bool
    {
        if (!$this->isPharmacyMaster()) return false;
        return $this->masterOf()->where('pharmacy_user_id', $pharmacyUserId)->exists();
    }
}
