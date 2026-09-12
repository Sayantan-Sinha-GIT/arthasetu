# ArthaSetu — Operations Runbook

How to run, release, check and repair ArthaSetu, locally and in production
(https://arthasetu-sigma.vercel.app).

---

## 1. Setup

- **Node.js** 20 or newer (`node -v`), **npm** 10 or newer.
- Copy the template and fill in the values:

  ```bash
  cp .env.example .env.local
  ```

| Variable | What it is |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web app config (API key, auth domain, project id, storage bucket, sender id, app id). |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | The whole service-account JSON on one line. Used by the server for Firestore, token checks and account deletion. |
| `GEMINI_API_KEY` | Google Gemini, the first AI provider. |
| `GROQ_API_KEY` | Groq, the fallback provider. Optional, but without it a spent Gemini quota means no AI answers. |
| `NEXT_PUBLIC_ADMIN_EMAIL` | The admin account's email. |
| `NEXT_PUBLIC_ADMIN_ROUTE_KEY` | The path segment in front of `/admin`. |

`/api/health` reports `"config": "incomplete"` if a required server variable is missing.

---

## 2. Commands

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` then `npm run start` | Production build and server |
| `npm test` | Vitest unit tests (DSCR bands, API request schemas, scheme freshness) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck (run `npx next typegen` first on a clean checkout) |
| `npx tsx scripts/test-plan-pdf-text.ts` | PDF text checks (₹, disclaimer, EMI label) |
| `npx tsx scripts/report-errors.ts` | Latest entries in Firestore `error_events` |
| `npx tsx scripts/deploy-firestore-rules.ts` | Publishes `firestore.rules` to the live project |

---

## 3. Releasing

1. Locally: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` all pass.
2. Push to `main`. Vercel builds and deploys it; GitHub Actions (`.github/workflows/ci.yml`)
   runs route type generation, typecheck, lint, tests and a build on the same commit.
3. If `firestore.rules` changed: `npx tsx scripts/deploy-firestore-rules.ts`. Rules are not
   deployed by pushing.
4. Check the live site: `GET /api/health` returns `"status": "ok"`, and the home, login and
   schemes pages load.

**Rolling back:** in the Vercel dashboard, open Deployments, pick the last good one and choose
"Promote to Production" (or `npx vercel rollback`). Rules roll back by deploying the previous
`firestore.rules` from git.

---

## 4. How the safety pieces work

### AI providers
- Order: **Gemini 3.5 Flash → Gemini 3.5 Flash-Lite → Groq** (`openai/gpt-oss-120b`, then
  `openai/gpt-oss-20b`). Gemini's free quota is counted per model.
- A 429 from a Gemini model marks that model as out of quota for 60 seconds, so later requests
  skip it.
- **Circuit breaker:** three outage errors in a row (5xx, unreachable — not quota and not bad
  requests) send requests to Groq first for 60 seconds. Groq has the same breaker.
- The planner still shows the calculated numbers when every AI provider fails, with a
  "try again" button for the explanation.

### Health check
`GET /api/health` returns `status`, `firestore`, `config`, `gemini` (`available` / `cooling`),
`groq` (`configured` / `missing`) and `buildId`. It answers 503 only when Firestore is unreachable.
It never calls an AI model.

### Rate limits
- `src/proxy.ts`: 60 requests a minute per IP for every `/api/*` route.
- `/api/client-errors`: 10 reports a minute per IP.
- Both count in the memory of one server instance. Vercel runs several instances, so these
  slow down abuse; they are not an exact global limit.

### Request validation
Zod schemas in `src/lib/validation/api-schemas.ts` check the planner, scheme-explanation,
translation, read-aloud and PIN-code routes and answer 400 with a readable message.
Values are then cleaned by the routes themselves (for example `sanitizePlanInputs`).

---

## 5. Common incidents

| Symptom | Check | Fix |
| :--- | :--- | :--- |
| "AI is busy" everywhere | `/api/health` shows `gemini: cooling` | Wait for the quota reset; make sure `GROQ_API_KEY` is set in Vercel. |
| Health returns 503 | `firestore: error` | Check the Firebase project status and `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel. |
| A user reports a crash | `npx tsx scripts/report-errors.ts` | Browser crashes arrive from `error.tsx` / `global-error.tsx` with the page path. |
| Profile or plan saves fail | Browser console shows `permission-denied` | Compare live rules with `firestore.rules`; redeploy them. |

---

## 6. Admin tasks

The console is at `/<NEXT_PUBLIC_ADMIN_ROUTE_KEY>/admin`, for the admin account only.

### Updating a scheme from a circular
1. On a scheme card choose **✨ Update with AI** (cards not verified in 180 days show `⚠️ >180d`).
2. Paste the circular text (at least 20 characters) and, optionally, its source URL.
3. **Analyze Circular & Show Differences** shows current and proposed values side by side.
4. Nothing is published until **✓ Approve & Update Live Scheme** is pressed. The change is
   recorded in the audit history with the admin's identity and today's verification date.

### Deleting a user
In the user management tab, delete the user and confirm. The server deletes their plans,
advice, advisor state, profile and login in batches, and writes an `adminActions` entry. If it
stops partway, running it again finishes the job.
