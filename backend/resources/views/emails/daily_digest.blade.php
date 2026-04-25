<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EdgeRX Daily Digest</title>
</head>
<body style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; margin:0; padding:24px; color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto;">
    <tr>
      <td style="background:#0d9488; color:#fff; padding:18px 24px; border-radius:12px 12px 0 0;">
        <h1 style="margin:0; font-size:18px; font-weight:800; letter-spacing:-0.01em;">
          EdgeRX — Daily Digest
        </h1>
        <p style="margin:4px 0 0; font-size:12px; opacity:0.9;">{{ now()->format('l, j F Y') }}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#fff; padding:24px;">
        <p style="margin:0 0 16px; font-size:14px;">Hi {{ $userName }},</p>
        <p style="margin:0 0 16px; font-size:14px;">
          Here's a summary of the {{ count($items) }} update{{ count($items) === 1 ? '' : 's' }} from your EdgeRX account in the last 24 hours:
        </p>

        @foreach ($items as $item)
          <div style="border-left:3px solid
            @if($item['type']==='success') #10b981
            @elseif($item['type']==='warning') #f59e0b
            @else #3b82f6
            @endif
            ; background:#f9fafb; padding:12px 16px; margin:0 0 12px; border-radius:0 6px 6px 0;">
            <p style="margin:0 0 4px; font-size:14px; font-weight:600; color:#111827;">
              {{ $item['title'] }}
            </p>
            <p style="margin:0; font-size:13px; color:#4b5563; line-height:1.5;">
              {{ $item['message'] }}
            </p>
            <p style="margin:4px 0 0; font-size:11px; color:#9ca3af;">
              {{ $item['when'] }}
            </p>
          </div>
        @endforeach

        <p style="margin:24px 0 0; text-align:center;">
          <a href="{{ $appUrl }}" style="display:inline-block; background:#0d9488; color:#fff; text-decoration:none; padding:10px 24px; border-radius:8px; font-size:13px; font-weight:600;">
            Open EdgeRX
          </a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f3f4f6; padding:16px 24px; border-radius:0 0 12px 12px; text-align:center;">
        <p style="margin:0; font-size:11px; color:#6b7280;">
          You can change your notification preferences from your EdgeRX account.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
