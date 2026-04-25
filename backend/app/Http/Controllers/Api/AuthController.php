<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\CompanyDetails;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|string',  // not 'email' rule — admin/admin demo
            'password' => 'required|string',
        ]);

        // First try a regular user
        $user = User::where('email', $data['email'])->first();
        if ($user && Hash::check($data['password'], $user->password)) {
            if ($user->status !== 'APPROVED' && $user->role !== 'ADMIN') {
                return response()->json(['success' => false, 'message' => 'Account is pending approval.'], 403);
            }
            $request->session()->regenerate();
            Auth::login($user);
            return response()->json([
                'success' => true,
                'user' => new UserResource($user->load('companyDetails', 'teamMembers')),
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

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|max:255|unique:users,email',
            'password' => 'required|string|min:4',
            'phone' => 'nullable|string|max:64',
            'role' => 'required|in:CUSTOMER,SUPPLIER,FOREIGN_SUPPLIER',
            'companyDetails' => 'nullable|array',
        ]);

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
            $cd = $data['companyDetails'];
            CompanyDetails::create([
                'user_id' => $user->id,
                'address' => $cd['address'] ?? null,
                'website' => $cd['website'] ?? null,
                'country' => $cd['country'] ?? null,
                'trade_license_number' => $cd['tradeLicenseNumber'] ?? null,
                'trade_license_expiry' => $cd['tradeLicenseExpiry'] ?? null,
                'trade_license_file_name' => $cd['tradeLicenseFileName'] ?? null,
                'trade_license_data_url' => $cd['tradeLicenseDataUrl'] ?? null,
                'authorized_signatory' => $cd['authorizedSignatory'] ?? null,
                'authorized_signatory_expiry' => $cd['authorizedSignatoryExpiry'] ?? null,
                'authorized_signatory_file_name' => $cd['authorizedSignatoryFileName'] ?? null,
                'authorized_signatory_data_url' => $cd['authorizedSignatoryDataUrl'] ?? null,
                'business_type' => $cd['businessType'] ?? null,
                'iso_certificate_file_name' => $cd['isoCertificateFileName'] ?? null,
                'iso_certificate_expiry' => $cd['isoCertificateExpiry'] ?? null,
                'iso_certificate_data_url' => $cd['isoCertificateDataUrl'] ?? null,
                'lab_test_file_name' => $cd['labTestFileName'] ?? null,
                'lab_test_data_url' => $cd['labTestDataUrl'] ?? null,
            ]);
        }

        // Notify admins (Phase 4)
        // event(new \App\Events\UserRegistered($user));

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
        return response()->json([
            'user' => new UserResource($user->load('companyDetails', 'teamMembers')),
            'isTeamMember' => $request->session()->has('team_member_id'),
        ]);
    }
}
