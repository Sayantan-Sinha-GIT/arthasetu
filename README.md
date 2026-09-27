# ArthaSetu (अर्थसेतु)

**A voice-first, multilingual business advisor for India's rural micro-entrepreneurs.**
Speak in your own language about the business you want to start. ArthaSetu works out the costs, the
loan and the break-even point, finds the government schemes you qualify for, and hands you a
bank-ready project report.

**Live:** https://arthasetu-sigma.vercel.app

Built for **Smart India Hackathon (SIH) 2026**, problem statement **SIH26091**: *AI-Driven Hyper-Local
Business Advisory and Financial Structuring Assistant for Rural Micro-Entrepreneurs.*

## The problem

Tailors, kirana owners, poultry and dairy farmers, weavers and artisans are often "credit-invisible".
Banking terms are intimidating, forms and scheme portals are written in formal English or Hindi, and
hundreds of central and state subsidy schemes exist with no easy way to know which ones apply.

## What ArthaSetu does

- **Talk, don't fill forms.** Speech recognition in 23 Indian languages, with read-aloud answers.
- **Exact numbers.** Start-up cost, working capital, reducing-balance EMI and break-even are computed by
  a deterministic TypeScript engine, not by the language model.
- **Real schemes only.** Matches from a curated database of central and state schemes (PMEGP, MUDRA,
  PMFME and state programmes). The model explains verified records; it never invents one.
- **Credit readiness score** (300–900) that shows how bank-ready a plan is and what would improve it.
- **Bank-ready PDF report**, bilingual, with regional fonts.
- **Admin console** for keeping the scheme database up to date.
- Works as an installable web app and as an Android app (Trusted Web Activity).

### Design rule: the AI advises, it never calculates or invents

1. All arithmetic lives in `src/lib/calculator.ts`; the model only explains the final numbers.
2. Schemes come only from the database in `src/lib/schemes/`.
3. When a plan is saved, the server stores its own computed numbers and ignores any the model supplies.

## Stack

Next.js 16 (App Router, TypeScript) · React 19 · Tailwind CSS 4 · Framer Motion · Lenis ·
Firebase Auth + Cloud Firestore · Google Gemini (with Groq as an automatic fallback) · jsPDF ·
Web Speech API · Vercel · Vitest

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the Firebase and Gemini values
npm run dev
```

```bash
npm test      # unit tests
npm run lint
```

[`RUNBOOK.md`](RUNBOOK.md) covers setup, releases, the safety checks and admin tasks.

## How it was built

ArthaSetu was built in Google's **Antigravity** IDE, with its AI coding agent doing much of the
implementation. Our team decided what to build and the rules it had to follow (such as "the AI never
does the arithmetic"), directed the work, and tested it.

## Team

**Team CoreDumped**: Deepjoy Mullick (team leader), Sayantan Sinha (lead developer). Testing by
Adrija Roy, Madhurya Ghosh and Soumyadeep Das.
