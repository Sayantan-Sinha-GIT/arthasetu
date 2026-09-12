# ArthaSetu — Production Operations Runbook

This runbook provides end-to-end instructions for running, operating, maintaining, and debugging ArthaSetu on `localhost` and in production.

---

## 1. Prerequisites & Environment Setup

- **Node.js**: Version `>= 20.0.0` (Verify with `node -v`)
- **Package Manager**: `npm` (Version 10+)
- **Operating System**: Windows, macOS, or Linux

### Environment Configuration

Copy the example environment file and configure your keys:

```bash
cp .env.example .env.local
```

Key environment variables required:
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase web API key.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project identifier (`arthasetu-...`).
- `NEXT_PUBLIC_ADMIN_ROUTE_KEY`: Obfuscated admin route prefix (default: `4632`).
- `GEMINI_API_KEY`: Google Gemini API key for primary advisor and financial structuring.
- `GROQ_API_KEY`: Groq API key for high-speed fallback.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Firebase Admin SDK credentials for server-side operations (account deletion, error logging).

---

## 2. Local Commands Reference

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server at `http://localhost:3000` |
| `npm test` | Runs the Vitest unit test suite (DSCR, Zod API validation, Scheme freshness) |
| `npm run lint` | Runs ESLint across the codebase |
| `npm run build` | Builds the production Next.js application bundle |
| `npm run start` | Starts the production server using the built bundle |
| `npx tsx scripts/report-errors.ts` | Displays recent server/client errors logged to Firestore |

---

## 3. Core Architecture & Safety Subsystems

### A. Circuit Breakers & Fallback Chain
- AI calls follow a multi-tier fallback: **Gemini 2.5 Flash → Gemini Flash-Lite → Groq LLaMA 3.3 70B**.
- If a provider fails 3 consecutive times, its circuit breaker trips open for a 60-second cooldown period.
- Health status can be checked in real time at:
  ```http
  GET /api/health
  ```
  Returns status code `200` with circuit breaker states and timestamp.

### B. Rate Limiting & Abuse Protection
- Public endpoints (`/api/advisor`, `/api/planner`, `/api/tts`, `/api/translate`) are protected by an in-memory sliding window rate limiter (`src/lib/server/rate-limit.ts`).
- Standard window: 30 requests per minute per IP.
- Legitimate rural micro-entrepreneurs have uninterrupted access, while automated bot spam is blocked with `429 Too Many Requests`.

### C. Input Validation
- All incoming API request bodies are strictly validated using Zod schemas (`src/lib/validation/api-schemas.ts`).
- Invalid PIN codes, negative monetary figures, and empty text payloads are safely caught with friendly `400` errors before reaching AI models.

---

## 4. Admin Dashboard Operations

Access the admin dashboard at:
```text
http://localhost:3000/4632/admin
```
*(Replace `4632` with your `NEXT_PUBLIC_ADMIN_ROUTE_KEY` if customized)*

### A. AI Scheme Update Assistant (Human-in-the-Loop)
1. Navigate to the **Verified Schemes Directory** tab.
2. Find any scheme (cards display `⚠️ >180d` badge if unverified for over 6 months).
3. Click **"✨ Update with AI"**.
4. In the modal dialog, paste the official government circular, gazette notice, or policy amendment text.
5. (Optional) Provide the official circular URL.
6. Click **"Analyze Circular & Show Differences"**.
7. The AI parses the parameters and generates a **side-by-side Diff Viewer**:
   - 🔴 **Red box**: Current live database values.
   - 🟢 **Green box**: Proposed new values extracted from the circular.
8. **Human Approval**: The database is NOT modified automatically. Click **"Approve & Update Live Scheme"** to commit the changes, or **"Cancel"** to discard.

### B. User Account & Data Erasure (GDPR / DPDP Compliance)
1. Navigate to the **User Management** tab.
2. Click **"Delete"** next to any user account.
3. Review the confirmation prompt displaying user email and UID.
4. Click **"Confirm & Delete Target User"**.
5. Server-side batch deletion wipes all user plans, saved advice, user profile, and deletes the Firebase Auth record, recording an entry in `adminActions`.

---

## 5. Error Observability & Logging

- All unhandled server exceptions and API errors are automatically captured by `src/lib/server/logger.ts` and saved to Firestore under the `error_events` collection.
- To view recent logged errors in your terminal, run:
  ```bash
  npx tsx scripts/report-errors.ts
  ```
- Client-side fatal errors trigger `src/app/error.tsx` and `src/app/global-error.tsx`, which post an anonymized error report back to `/api/client-errors`.

---

## 6. Verification Checklist Before Any Production Release

Before considering any deployment to production:
1. `npx tsc --noEmit` exits with `0` errors.
2. `npm run lint` exits with `0` errors.
3. `npm test` passes all test suites.
4. `npm run build` generates the production bundle without errors.
5. Run locally (`npm run dev`) and test the end-to-end user flow:
   - Speak into advisor microphone in regional language.
   - Generate financial business plan in the planner.
   - Export bank-ready PDF.
   - Test Admin AI Scheme Updater and user list.
