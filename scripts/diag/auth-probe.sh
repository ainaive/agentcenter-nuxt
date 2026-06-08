#!/usr/bin/env bash
# Throwaway diagnostic — DELETE after the SSR-auth bug is fixed.
# Bisects which layer of the auth chain breaks on hard-refresh.
#
# Usage:
#   1. Sign in to the dev server in your browser.
#   2. Open DevTools → Application → Cookies → http://localhost:3000.
#      Copy the value of the cookie whose name starts with
#      `better-auth` (the session_token, not the data cookie).
#   3. Run:
#        SESSION_TOKEN='paste-value-here' bash scripts/diag/auth-probe.sh
#      Or pass the whole Cookie header (if there are multiple cookies):
#        COOKIE_HEADER='better-auth.session_token=...; other=...' bash scripts/diag/auth-probe.sh
#
# Override BASE_URL=http://localhost:3001 etc. if your dev server is on a
# different port.

set -uo pipefail

if [[ -n "${COOKIE_HEADER:-}" ]]; then
  COOKIE="$COOKIE_HEADER"
elif [[ -n "${SESSION_TOKEN:-}" ]]; then
  COOKIE="better-auth.session_token=$SESSION_TOKEN"
else
  echo "ERROR: provide SESSION_TOKEN='...' or COOKIE_HEADER='...; ...' as env" >&2
  exit 2
fi

BASE="${BASE_URL:-http://localhost:3000}"

hr() { printf '\n=== %s ===\n' "$1"; }

hr "Probe 0: dev server up?"
curl -sS -o /dev/null -w 'GET / -> HTTP %{http_code}\n' "$BASE/" || true

hr "Probe 1: /api/internal/auth/me (our new endpoint that calls getSessionUser)"
echo "Expecting: HTTP 200, body { user: { id: ... } } when signed in"
echo "Distinguishes: H1 vs H2/H3 (server-side direct read)"
echo "If 404: H4/H5 (route not registered — server needs restart, or stale code)"
echo
curl -sS -i -H "Cookie: $COOKIE" "$BASE/api/internal/auth/me" || true

hr "Probe 2: /api/auth/get-session (better-auth's own handler, baseline)"
echo "Expecting: HTTP 200, body { user, session } when signed in"
echo "If 200 with user here but Probe 1 returns null: H3 (getSessionUser API misuse)"
echo
curl -sS -i -H "Cookie: $COOKIE" "$BASE/api/auth/get-session" || true

hr "Probe 3: GET /en/publish (full SSR refresh — the user's exact reproducer)"
echo "Expecting: HTTP 200, response body contains 'publish' UI (not the sign-in page)"
echo "If 302 to /en/sign-in?next=...: middleware path is broken even though Probes 1/2 work → H1"
echo
curl -sS -i -H "Cookie: $COOKIE" "$BASE/en/publish" \
  | awk '/^HTTP|^[Ll]ocation:|^[Ss]et-[Cc]ookie:|^[Cc]ontent-[Tt]ype:/{print} /<title>|sign-in|publish/{if (++m<6) print}' \
  | head -40

hr "Probe 4: GET /en/publish via the same in-process path as the middleware"
echo "Curls /en/publish and shows only the response status + a tiny excerpt"
curl -sS -o /dev/null -w 'GET /en/publish -> HTTP %{http_code} Location=%{redirect_url}\n' \
  -H "Cookie: $COOKIE" "$BASE/en/publish"

echo
echo "DONE — paste the entire output above back into the chat."
