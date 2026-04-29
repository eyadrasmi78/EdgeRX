<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Transfer Audit — {{ $t->id }}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; background: #fff; margin: 0; padding: 32px; }
    .wrap { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; color: #0d9488; border-bottom: 3px solid #0d9488; padding-bottom: 8px; margin: 0 0 4px; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #0d9488; margin: 24px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .subtitle { font-size: 12px; color: #6b7280; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size: 13px; }
    .grid div b { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; border-bottom: 2px solid #d1d5db; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .pill-ok   { background: #d1fae5; color: #065f46; }
    .pill-fail { background: #fee2e2; color: #991b1b; }
    .pill-mid  { background: #fef3c7; color: #92400e; }
    .totals { margin-top: 12px; font-size: 13px; }
    .totals td { padding: 4px 8px; }
    .totals tr.bold td { border-top: 2px solid #111827; font-weight: 700; }
    .footer { font-size: 11px; color: #6b7280; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { padding: 0; } .noprint { display: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>EdgeRX — Pharmacy Transfer Audit</h1>
    <p class="subtitle">
      Transfer #{{ $t->id }} ·
      Generated {{ now()->format('d M Y H:i') }} UTC ·
      Status:
      @php
        $cls = match ($t->status) {
            'COMPLETED', 'RELEASED' => 'pill-ok',
            'QC_FAILED', 'CANCELLED' => 'pill-fail',
            default => 'pill-mid',
        };
      @endphp
      <span class="pill {{ $cls }}">{{ $t->status }}</span>
    </p>

    <h2>Parties</h2>
    <div class="grid">
      <div><b>Source pharmacy (A)</b>{{ $t->source?->name ?? '—' }}</div>
      <div><b>Target pharmacy (B)</b>{{ $t->target?->name ?? '— (marketplace, unclaimed)' }}</div>
      <div><b>Local supplier (chain of title)</b>{{ $t->supplier?->name ?? '—' }}</div>
      <div><b>Discovery mode</b>{{ $t->discovery_mode }}</div>
    </div>

    <h2>Items transferred</h2>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Batch / Lot</th>
          <th>Expiry</th>
          <th>QC</th>
        </tr>
      </thead>
      <tbody>
      @foreach ($t->items as $i)
        <tr>
          <td>
            <strong>{{ $i->product?->name ?? '—' }}</strong>
            @if ($i->product?->is_cold_chain) <span class="pill pill-mid">COLD CHAIN</span> @endif
            @if ($i->gs1_barcode) <br><small>GS1: {{ $i->gs1_barcode }}</small> @endif
          </td>
          <td>{{ $i->quantity }}</td>
          <td>
            {{ $i->batch_number }}
            @if ($i->lot_number) <br><small>lot {{ $i->lot_number }}</small> @endif
          </td>
          <td>{{ optional($i->expiry_date)->format('d M Y') }}</td>
          <td>
            @php
              $qcCls = match ($i->qc_status) {
                  'PASSED' => 'pill-ok',
                  'FAILED' => 'pill-fail',
                  default => 'pill-mid',
              };
            @endphp
            <span class="pill {{ $qcCls }}">{{ $i->qc_status }}</span>
          </td>
        </tr>
      @endforeach
      </tbody>
    </table>

    <h2>Chain of custody &amp; QC</h2>
    @if ($t->inspections->isEmpty())
      <p style="font-size:12px;color:#6b7280;">No inspections recorded yet.</p>
    @else
      <table>
        <thead>
          <tr><th>When</th><th>Inspector</th><th>Result</th><th>Notes</th></tr>
        </thead>
        <tbody>
        @foreach ($t->inspections as $insp)
          <tr>
            <td>{{ optional($insp->inspected_at)->format('d M Y H:i') }}</td>
            <td>{{ $insp->inspector?->name ?? '—' }}</td>
            <td>
              <span class="pill {{ $insp->result === 'PASS' ? 'pill-ok' : ($insp->result === 'FAIL' ? 'pill-fail' : 'pill-mid') }}">
                {{ $insp->result }}
              </span>
            </td>
            <td>{{ $insp->notes ?? '' }}</td>
          </tr>
        @endforeach
        </tbody>
      </table>
    @endif

    <h2>Linked legs</h2>
    <div class="grid">
      <div><b>Return order (A → supplier)</b>{{ $t->returnOrder?->order_number ?? '—' }}</div>
      <div><b>Purchase order (supplier → B)</b>{{ $t->purchaseOrder?->order_number ?? '—' }}</div>
      <div><b>Credit note no.</b>{{ $t->source_credit_note_no ?? '—' }}</div>
      <div><b>Sales invoice no.</b>{{ $t->target_invoice_no ?? '—' }}</div>
    </div>

    <h2>Settlement</h2>
    <table class="totals">
      <tr><td>Refund credited to {{ $t->source?->name }}</td><td style="text-align:right;">{{ number_format($t->source_refund_amount, 2) }} KWD</td></tr>
      <tr><td>Supplier handling fee (max of flat / percent)</td><td style="text-align:right;">{{ number_format($t->supplier_fee_applied, 2) }} KWD</td></tr>
      <tr class="bold"><td>Charged to {{ $t->target?->name ?? '—' }}</td><td style="text-align:right;">{{ number_format($t->target_purchase_amount, 2) }} KWD</td></tr>
    </table>

    <div class="footer">
      Document generated by EdgeRX for Kuwait MoH chain-of-title compliance. The
      paired return + purchase legs above are linked atomically by transfer id
      {{ $t->id }} — neither leg may exist without the other.
      <br><br>
      <button class="noprint" onclick="window.print()" style="background:#0d9488;color:#fff;border:0;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;">Print / Save as PDF</button>
    </div>
  </div>
</body>
</html>
