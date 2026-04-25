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

        // Notify the foreign supplier
        $foreign = \App\Models\User::find($data['foreignSupplierId']);
        $foreign?->notify(new \App\Notifications\EdgeRxNotification(
            kind: 'partnership_requested',
            title: 'New partnership request',
            message: "{$user->name} wants to partner with you" .
                (!empty($data['productName']) ? " — interested in {$data['productName']}." : '.'),
            actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
            data: ['requestId' => $req->id, 'fromAgentId' => $user->id],
        ));

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

        if (in_array($data['status'], ['ACCEPTED', 'REJECTED'], true)) {
            $agent = \App\Models\User::find($req->from_agent_id);
            $kind = $data['status'] === 'ACCEPTED' ? 'partnership_accepted' : 'partnership_rejected';
            $agent?->notify(new \App\Notifications\EdgeRxNotification(
                kind: $kind,
                title: $data['status'] === 'ACCEPTED' ? 'Partnership request accepted' : 'Partnership request declined',
                message: $data['status'] === 'ACCEPTED'
                    ? "Your partnership request was accepted. You can now collaborate on EdgeRX."
                    : "Your partnership request was declined.",
                actionUrl: rtrim(env('FRONTEND_URL', 'http://localhost'), '/') . '/',
                data: ['requestId' => $req->id, 'status' => $data['status']],
            ));
        }

        return new PartnershipRequestResource($req->fresh());
    }
}
