<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        $cd = $this->companyDetails;
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role,
            'status' => $this->status,
            'companyDetails' => $cd ? [
                'address' => $cd->address,
                'website' => $cd->website,
                'country' => $cd->country,
                'tradeLicenseNumber' => $cd->trade_license_number,
                'tradeLicenseExpiry' => optional($cd->trade_license_expiry)->toDateString(),
                'tradeLicenseFileName' => $cd->trade_license_file_name,
                'tradeLicenseDataUrl' => $cd->trade_license_data_url,
                'authorizedSignatory' => $cd->authorized_signatory,
                'authorizedSignatoryExpiry' => optional($cd->authorized_signatory_expiry)->toDateString(),
                'authorizedSignatoryFileName' => $cd->authorized_signatory_file_name,
                'authorizedSignatoryDataUrl' => $cd->authorized_signatory_data_url,
                'businessType' => $cd->business_type,
                'isoCertificateFileName' => $cd->iso_certificate_file_name,
                'isoCertificateExpiry' => optional($cd->iso_certificate_expiry)->toDateString(),
                'isoCertificateDataUrl' => $cd->iso_certificate_data_url,
                'labTestFileName' => $cd->lab_test_file_name,
                'labTestDataUrl' => $cd->lab_test_data_url,
            ] : null,
            'teamMembers' => $this->whenLoaded('teamMembers', function () {
                return $this->teamMembers->map(fn ($m) => [
                    'id' => $m->id,
                    'name' => $m->name,
                    'email' => $m->email,
                    'phone' => $m->phone,
                    'jobTitle' => $m->job_title,
                    'permissions' => $m->permissions ?? [],
                    'createdAt' => $m->created_at?->toIso8601String(),
                    // password not exposed
                ]);
            }, []),
        ];
    }
}
