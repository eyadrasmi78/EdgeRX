<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\CompanyDetails;
use App\Models\TeamMember;
use App\Support\CompanyDetailsPayload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $data = $request->validated();

        // First try a regular user
        $user = User::where('email', $data['email'])->first();
        if ($user && Hash::check($data['password'], $user->password)) {
            if ($user->status !== 'APPROVED' && $user->role !== 'ADMIN') {
                return response()->json(['success' => false, 'message' => 'Account is pending approval.'], 403);
            }
            $request->session()->regenerate();
            Auth::login($user);

            $relations = ['companyDetails', 'teamMembers'];
            if ($user->isPharmacyMaster()) $relations[] = 'masterOf';
            if ($user->isCustomer())       $relations[] = 'masteredBy';

            return response()->json([
                'success' => true,
                'user' => new UserResource($user->load($relations)),
            ]);
        }

        // Fallback: team-member login (logs in as parent user, attaches member info to session)
        $member = TeamMember::where('email', $data['email'])->first();
        if ($member && Hash::check($data['password'], $member->password)) {
            $parent = $member->parent;
            if ($parent && ($parent->status === 'APPROVED' || $parent->role === 'ADMIN')) {
                $request->session()->regenerate();
                Auth::login($parent);
                $request->session()->put('team_member_id', $member->id);
                return response()->json([
                    'success' => true,
                    'user' => new UserResource($parent->load('companyDetails', 'teamMembers')),
                    'isTeamMember' => true,
                    'memberDetails' => [
                        'id' => $member->id,
                        'name' => $member->name,
                        'email' => $member->email,
                        'phone' => $member->phone,
                        'jobTitle' => $member->job_title,
                        'permissions' => $member->permissions ?? [],
                    ],
                ]);
            }
        }

        return response()->json(['success' => false, 'message' => 'Invalid credentials.'], 401);
    }

    public function register(RegisterRequest $request)
    {
        $data = $request->validated();

        $user = User::create([
            'id' => (string) Str::uuid(),
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'],
            'status' => 'PENDING',
        ]);

        if (!empty($data['companyDetails']) && is_array($data['companyDetails'])) {
            CompanyDetails::create(CompanyDetailsPayload::fromRequest($data['companyDetails'], $user->id));
        }

        // Fan-out: ping every admin so they see the new pending registration
        $admins = User::where('role', 'ADMIN')->get();
        foreach ($admins as $admin) {
            $admin->notify(new \App\Notifications\EdgeRxNotification(
                kind: 'registration_pending',
                title: 'New registration pending approval',
                message: "{$user->name} ({$user->role}) just registered and is awaiting approval.",
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['userId' => $user->id, 'role' => $user->role],
            ));
        }

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. Pending approval.',
            'user' => new UserResource($user->load('companyDetails')),
        ], 201);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['success' => true]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['user' => null], 200);
        }

        // Eager-load relations the SPA needs: company details + team members + (for masters)
        // their child pharmacies + (for customers) their master if any.
        $relations = ['companyDetails', 'teamMembers'];
        if ($user->isPharmacyMaster()) {
            $relations[] = 'masterOf';
        }
        if ($user->isCustomer()) {
            $relations[] = 'masteredBy';
        }

        return response()->json([
            'user' => new UserResource($user->load($relations)),
            'isTeamMember' => $request->session()->has('team_member_id'),
        ]);
    }
}
