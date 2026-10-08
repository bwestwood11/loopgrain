// The visitor's country from Vercel's edge, so the Meta Pixel can tell whether
// it needs an explicit Accept first (OPT_IN_REGIONS). Null outside Vercel,
// which the Pixel treats as "ask first".
export function GET(request: Request) {
  return Response.json(
    { country: request.headers.get("x-vercel-ip-country") },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
