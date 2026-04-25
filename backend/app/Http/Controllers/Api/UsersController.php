<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\CompanyDetails;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UsersController extends Controller
{
    public function index()
    {
        $users = User::with('companyDetails', 'teamMembers')->get();
        return UserResource::collection($users);
    }

    public function show($id)
    {
        $user = User::with('companyDetails', 'teamMembers')->findOrFail($id);
        return new UserResource($user);
    }

    public function updateStatus(Request $request, $id)
    {
        $data = $request->validate(['status' => 'required|in:PENDING,APPROVED,REJECTED']);
        $user = User::findOrFail($id);
        $previousStatus = $user->status;
        $user->update(['status' => $data['status']]);

        if ($previousStatus !== $data['status']) {
            $kind = strtolower("registration_{$data['status']}");
            $title = match ($data['status']) {
                'APPROVED' => 'Your EdgeRX account is approved',
                'REJECTED' => 'Your EdgeRX registration was not approved',
                default    => 'Your EdgeRX account status changed',
            };
            $message = match ($data['status']) {
                'APPROVED' => 'Welcome aboard. You can now log in and start using EdgeRX.',
                'REJECTED' => 'After review, your registration was not approved. Please contact support if you believe this is a mistake.',
                default    => "Your account status is now {$data['status']}.",
            };
            $user->notify(new \App\Notifications\EdgeRxNotification(
                kind: $kind,
                title: $title,
                message: $message,
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['status' => $data['status']],
            ));
        }

        return new UserResource($user->fresh()->load('companyDetails', 'teamMembers'));
    }

    public function update(Request $request, $id)
    {
        $authUser = $request->user();
        if ($authUser->id !== $id && !$authUser->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:64',
            'companyDetails' => 'nullable|array',
        ]);

        $user = User::findOrFail($id);
        if (isset($data['name']))  $user->name  = $data['name'];
        if (isset($data['phone'])) $user->phone = $data['phone'];
        $user->save();

        if (!empty($data['companyDetails']) && is_array($data['companyDetails'])) {
            $cd = $data['companyDetails'];
            $payload = [
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
            ];
            CompanyDetails::updateOrCreate(['user_id' => $user->id], $payload);
        }

        return new UserResource($user->fresh()->load('companyDetails', 'teamMembers'));
    }

    public function addTeamMember(Request $request, $id)
    {
        $authUser = $request->user();
        if ($authUser->id !== $id && !$authUser->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|max:255',
            'phone' => 'nullable|string|max:64',
            'jobTitle' => 'nullable|string|max:255',
            'password' => 'required|string|min:4',
            'permissions' => 'nullable|array',
        ]);
        $member = TeamMember::create([
            'id' => (string) Str::uuid(),
            'parent_user_id' => $id,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'job_title' => $data['jobTitle'] ?? null,
            'password' => $data['password'],
            'permissions' => $data['permissions'] ?? [],
        ]);
        return response()->json(['success' => true, 'member' => [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'phone' => $member->phone,
            'jobTitle' => $member->job_title,
            'permissions' => $member->permissions ?? [],
            'createdAt' => $member->created_at?->toIso8601String(),
        ]], 201);
    }

    public function updateTeamMember(Request $request, $id, $memberId)
    {
        $authUser = $request->user();
        if ($authUser->id !== $id && !$authUser->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        $member = TeamMember::where('parent_user_id', $id)->where('id', $memberId)->firstOrFail();
        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:64',
            'jobTitle' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:4',
            'permissions' => 'nullable|array',
        ]);
        if (isset($data['name'])) $member->name = $data['name'];
        if (isset($data['email'])) $member->email = $data['email'];
        if (isset($data['phone'])) $member->phone = $data['phone'];
        if (isset($data['jobTitle'])) $member->job_title = $data['jobTitle'];
        if (isset($data['password']) && $data['password'] !== '') $member->password = $data['password'];
        if (array_key_exists('permissions', $data)) $member->permissions = $data['permissions'] ?? [];
        $member->save();
        return response()->json(['success' => true]);
    }
}
