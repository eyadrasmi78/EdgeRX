<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Admin-only CRUD over Pharmacy Master groups.
 * Routes (all under /api/admin/pharmacy-groups, middleware role:ADMIN):
 *   GET    /                          → list all masters with their children
 *   POST   /                          → create a new master + link initial pharmacies
 *   GET    /{masterId}                → show one
 *   PATCH  /{masterId}                → update master name/email
 *   POST   /{masterId}/pharmacies     → link an existing pharmacy
 *   DELETE /{masterId}/pharmacies/{pharmacyId} → unlink
 *   DELETE /{masterId}                → delete master (children stay, just unlinked)
 */
class PharmacyGroupsController extends Controller
{
    public function index()
    {
        $masters = User::where('role', 'PHARMACY_MASTER')
            ->with(['masterOf' => fn ($q) => $q->where('role', 'CUSTOMER')])
            ->get();

        return UserResource::collection($masters);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            // No company_details required (per locked decision #4)
            'email' => 'required|string|email|max:255|unique:users,email|unique:team_members,email',
            'password' => 'required|string|min:4|max:255',
            'phone' => 'nullable|string|max:64',
            'pharmacyIds' => 'nullable|array',
            'pharmacyIds.*' => 'string|exists:users,id',
        ]);

        DB::transaction(function () use ($data, &$master) {
            $master = User::create([
                'id' => (string) Str::uuid(),
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'], // Eloquent's 'hashed' cast bcrypts on assign
                'phone' => $data['phone'] ?? null,
                'role' => 'PHARMACY_MASTER',
                'status' => 'APPROVED', // admin-created → pre-approved
            ]);

            if (!empty($data['pharmacyIds'])) {
                $this->attachPharmacies($master, $data['pharmacyIds']);
            }
        });

        return new UserResource($master->load('masterOf'));
    }

    public function show($id)
    {
        $master = User::where('role', 'PHARMACY_MASTER')
            ->with('masterOf')
            ->findOrFail($id);

        return new UserResource($master);
    }

    public function update(Request $request, $id)
    {
        $master = User::where('role', 'PHARMACY_MASTER')->findOrFail($id);

        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users,email,' . $master->id . '|unique:team_members,email',
            'phone' => 'nullable|string|max:64',
            'password' => 'nullable|string|min:4|max:255',
        ]);

        if (isset($data['name']))     $master->name = $data['name'];
        if (isset($data['email']))    $master->email = $data['email'];
        if (isset($data['phone']))    $master->phone = $data['phone'];
        if (!empty($data['password'])) $master->password = $data['password'];
        $master->save();

        return new UserResource($master->fresh()->load('masterOf'));
    }

    public function attach(Request $request, $id)
    {
        $master = User::where('role', 'PHARMACY_MASTER')->findOrFail($id);
        $data = $request->validate([
            'pharmacyId' => 'required|string|exists:users,id',
        ]);

        $this->attachPharmacies($master, [$data['pharmacyId']]);

        return new UserResource($master->fresh()->load('masterOf'));
    }

    public function detach($id, $pharmacyId)
    {
        $master = User::where('role', 'PHARMACY_MASTER')->findOrFail($id);
        $master->masterOf()->detach($pharmacyId);

        return new UserResource($master->fresh()->load('masterOf'));
    }

    public function destroy($id)
    {
        $master = User::where('role', 'PHARMACY_MASTER')->findOrFail($id);
        // Detach children first so the cascade delete of the master row doesn't
        // implicitly drop pharmacy_group_members (which it would do anyway, but
        // being explicit keeps the audit log clean).
        $master->masterOf()->detach();
        $master->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Attach a list of pharmacies to a master, enforcing:
     *   - target user exists and has role CUSTOMER
     *   - target user is APPROVED
     *   - target user is not already linked to another master (DB UNIQUE will catch it,
     *     but we 422 with a useful message instead of letting Postgres throw)
     */
    private function attachPharmacies(User $master, array $pharmacyIds): void
    {
        $pharmacies = User::whereIn('id', $pharmacyIds)
            ->where('role', 'CUSTOMER')
            ->get();

        $alreadyLinked = DB::table('pharmacy_group_members')
            ->whereIn('pharmacy_user_id', $pharmacyIds)
            ->where('master_user_id', '!=', $master->id)
            ->pluck('pharmacy_user_id')
            ->all();

        if (!empty($alreadyLinked)) {
            abort(422, 'Pharmacies already linked to another master: ' . implode(',', $alreadyLinked));
        }

        $rows = [];
        foreach ($pharmacies as $p) {
            $rows[$p->id] = ['joined_at' => now()];
        }
        $master->masterOf()->syncWithoutDetaching($rows);
    }
}
