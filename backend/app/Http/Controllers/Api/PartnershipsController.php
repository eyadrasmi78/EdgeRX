<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PartnershipRequestResource;
use App\Models\PartnershipRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PartnershipsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = PartnershipRequest::query();
        if ($user->isLocalSupplier()) {
            $query->where('from_agent_id', $user->id);
        } elseif ($user->isForeignSupplier()) {
            $query->where('to_foreign_supplier_id', $user->id);
        }
        return PartnershipRequestResource::collection($query->orderByDesc('date')->get());
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->isLocalSupplier()) {
            return response()->json(['message' => 'Only local suppliers can send partnership requests.'], 403);
        }
        $data = $request->validate([
            'foreignSupplierId' => 'required|string|exists:users,id',
            'productId' => 'nullable|string',
            'productName' => 'nullable|string',
            'message' => 'nullable|string',
        ]);

        $existing = PartnershipRequest::where('from_agent_id', $user->id)
            ->where('to_foreign_supplier_id', $data['foreignSupplierId'])
            ->where(function ($q) use ($data) {
                if (!empty($data['productId'])) $q->where('product_id', $data['productId']);
                else $q->whereNull('product_id');
            })
            ->first();
        if ($existing) {
            return response()->json(['success' => false, 'message' => 'Request already sent.'], 409);
        }

        $req = PartnershipRequest::create([
            'id' => (string) Str::uuid(),
            'from_agent_id' => $user->id,
            'from_agent_name' => $user->name,
            'to_foreign_supplier_id' => $data['foreignSupplierId'],
            'status' => 'PENDING',
            'date' => now(),
            'message' => $data['message'] ?? (
                !empty($data['productName'])
                    ? "Interest in product: {$data['productName']}. Distribution rights inquiry."
                    : "Local distribution partnership request from {$user->name}."
            ),
            'product_id' => $data['productId'] ?? null,
            'product_name' => $data['productName'] ?? null,
            'request_type' => !empty($data['productId']) ? 'PRODUCT_INTEREST' : 'GENERAL_CONNECTION',
        ]);
        return response()->json(['success' => true, 'request' => new PartnershipRequestResource($req)], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $req = PartnershipRequest::findOrFail($id);
        if (!$user->isAdmin() && $req->to_foreign_supplier_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        $data = $request->validate(['status' => 'required|in:ACCEPTED,REJECTED,PENDING']);
        $req->update(['status' => $data['status']]);
        return new PartnershipRequestResource($req->fresh());
    }
}
