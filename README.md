# Wish — property-page tools

Wish is a local hackathon prototype: activate the unpacked Chrome extension on a property-listing page, describe a feature you wish the page had, and get safe, working comparison controls in that page. The included Harbor & Grove page is a fictional, explicitly illustrative playground.

## What works

- Manifest V3 extension activation from the toolbar on the current page
- A floating Wish button and compact prompt UI in an isolated Shadow DOM
- One reliable property-card adapter: stable listing IDs, duplicate suffixes, visible-price validation, and an unsupported-page message
- A mandatory listing-data review before the backend shares selected visible card data with an external model
- Page-native selection checkboxes, side-by-side comparison, annual-rent budget filtering, editable fixed deposit/agency-fee assumptions, equal installments, partial-upfront calculations, and CSV export with provenance
- State preservation in `chrome.storage.local` when the same page fingerprint is restored
- Stale-page detection, repeated activation handling, card removal/reordering safety, and a clean remove action that restores hidden cards
- A local backend that keeps provider keys out of the extension bundle, validates all model plans, uses timeouts and bounded responses, and has optional fallback model IDs
- Explicit Exa query review: at most two queries and three results per query; source cards show clickable URL, excerpt, query, and retrieval time

## Limits

This is a reliable adapter for property cards with a visible title, currency, price, and monthly/annual period. It is not a universal extractor, and it does not book, pay, alter accounts, or send messages. Listings with different currencies are not compared or converted. Missing fees remain unknown. The partial upfront estimate is only `first equal rent installment + refundable deposit + fixed agency fee`; unlisted charges are excluded.

## Local setup (Windows)

1. In PowerShell, open this folder and run `npm start`. The demo opens at [http://localhost:8787](http://localhost:8787).
2. Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select the `extension` folder in this project.
3. Visit [http://localhost:8787](http://localhost:8787), click the Wish extension icon, then try: `Compare these apartments side by side. Add a AED 150k budget and let me enter deposit and agency fees.`
4. The app starts in a clearly marked **Offline/demo mode** until OpenRouter is configured.

## API configuration

Copy `.env.example` to `.env` and keep `.env` local; it is excluded from Git. Do not put keys in the extension, source files, or chat.

```powershell
Copy-Item .env.example .env
notepad .env
```

Set `OPENROUTER_API_KEY` and a separately verified `OPENROUTER_MODEL`. The backend verifies the configured model against OpenRouter's Models API for structured-output support before its live test. Optional `OPENROUTER_FALLBACK_MODELS` accepts a comma-separated, compatible fallback list. Set `EXA_API_KEY` only when ready to enable research. Restart `npm start` after any `.env` change.

With the key configured, `http://127.0.0.1:8787/api/models` exposes a small live, structured-output-capable candidate list (without ever exposing the key) so you can select the model ID to place in `OPENROUTER_MODEL`.

To run bounded live checks after configuration, in a second PowerShell window:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8787/api/verify/openrouter
Invoke-RestMethod -Method Post http://127.0.0.1:8787/api/verify/exa
```

The OpenRouter check performs one model-capability lookup and one tiny structured completion. The Exa check performs one query with at most three results. Responses never contain keys.

## Architecture

`extension/content.js` observes and extracts supported listing cards, owns all injected UI, and renders only a fixed registry of components. It never evaluates model-produced JavaScript. `extension/background.js` uses MV3 messaging and makes localhost backend requests; it has no API keys. `backend/server.mjs` serves the demo and proxies bounded OpenRouter/Exa calls. `backend/core.mjs` validates page data and plans before the UI can apply them.

The live model receives only explicitly reviewed, compact listing records. It must return a strict JSON plan that is checked again against supplied IDs and allowlisted components. Exa receives only user-approved search queries, never the full page.

## Checks

```powershell
npm run check
npm test
```

## 40-second demo

1. On Harbor & Grove, click the Wish toolbar icon. Say: “Compare these apartments side by side.” Review the listed card data, send it, and use the green card checkboxes.
2. Follow up: “Now add a AED 150k budget and let me enter the missing fees.” Show the current selections remain, cards over budget hide, set 4 installments, AED 5,000 deposit, and AED 3,000 fixed agency fee; point out the partial-upfront label.
3. Say: “Research these neighborhoods and show me the sources.” Review the proposed Exa query, click Search Exa, then open a source card. Export CSV and use Remove Wish to restore the host page.

