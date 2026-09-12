# Wish: the page-native assistant — working idea, flow, and how to use it

## The idea

Wish makes a webpage adaptable without changing the site itself. Someone clicks **✦ Wish**, describes the outcome they need in plain language or by voice, and receives a small set of useful, safe tools over the information already visible on that page.

The magic is not another generic chat window. Wish lives at the point of decision and turns intent into an inspectable interface: comparison controls when choosing, a checklist when evaluating, a summary when researching, or an approved source trail when confidence matters.

The current working prototype proves the first vertical: property decisions. For example: *“Compare these homes side by side and show which are under AED 150,000 a year.”* Wish turns that request into checkboxes, a comparison view, a budget filter, and transparent rent assumptions. The included Harbor & Grove page is fictional and clearly labelled. It exists to demonstrate the interaction before Wish gains adapters for more page types.

## Where Wish can create value

The underlying interaction works anywhere a person has a goal but the page offers only static information. These are product directions; only the property workflow below is implemented in this prototype.

| Moment of intent | A Wish someone might make | The page-native experience Wish could create |
| --- | --- | --- |
| **Property decisions** — implemented now | “Compare these homes, keep me under budget, and show upfront costs.” | Comparable cards, budget filtering, editable assumptions, and approved neighborhood research. |
| **Travel planning** | “Build a three-day plan around these places, group them by area, and flag what needs booking.” | An itinerary, map-aware groups, a decision checklist, and a user-approved research trail. |
| **Shopping and gifting** | “Compare these laptops for design work, keep it under my budget, and explain the trade-offs.” | A spec comparison, budget guardrails, compatibility questions, and transparent rationale. |
| **Career discovery** | “Show which roles match my experience, extract deadlines, and make a focused application checklist.” | A relevance view, requirements matrix, deadline tracker, and editable action plan. |
| **Learning and research** | “Turn these resources into a study plan and separate evidence from opinion.” | Topic grouping, source provenance, a sequenced plan, and knowledge gaps to investigate. |
| **Complex service journeys** | “What do I need before I start, and which choices affect the outcome?” | A plain-language decision tree, document checklist, and milestone tracker — never an automatic submission. |

Wish therefore has two layers: a durable **interaction and safety platform** (intent, review, validation, approval) and a focused **page adapter** for each domain (the property-card adapter is the first one).

## End-to-end flow

```mermaid
flowchart TD
  A[Compatible page with visible, structured information] --> B[Click ✦ Wish]
  B --> C{Describe the wish}
  C -->|Type| D[Editable request]
  C -->|Talk| E[Browser speech recognition]
  E --> D
  D --> F[Review the selected visible page data]
  F --> G[Wish backend]
  G --> H[OpenRouter returns a structured plan]
  H --> I{Validate plan}
  I -->|Valid| J[Render only allowlisted tools]
  I -->|Rejected| K[Show a safe error and preserve the page]
  J --> L[Contextual controls: compare, plan, filter, or track]
  J --> M{Research requested?}
  M -->|Approve query and click Search| N[Exa: max 2 queries and 3 results per query]
  N --> O[Source cards with links, excerpts, and timestamps]
```

### What happens at each point

| Stage | What Wish does | What stays under the user's control |
| --- | --- | --- |
| Describe | Captures a typed request or an editable speech transcript. | Voice starts only after the user presses the voice button. |
| Review | Shows the compact, visible page data that would be used. The current adapter uses listing data. | Nothing is sent to an external model until the user reviews and submits it. |
| Plan | Asks the configured model for strict JSON describing allowed components. | A validator checks IDs, component types, limits, and fields before any UI changes. |
| Use tools | Adds domain-appropriate controls — comparison, planning, filtering, or checklists — to the page. | The original page and visible information remain the source of truth. |
| Research | Proposes concise searches when research is requested. | Each external search needs an explicit approval click. |

## How to use Wish

### Option A — use the built-in standalone preview

This is the fastest way to see the full Wish-button experience. It does **not** require loading the browser extension. It demonstrates the property-decision adapter, not the full set of future Wish verticals.

1. In this project folder, run `npm start`.
2. Open [http://localhost:8787](http://localhost:8787).
3. Click the floating **✦ Wish** button at the lower-right of the page.
4. Type your request, or choose **Talk to Wish** and allow the browser microphone prompt only if you want speech-to-text.
5. Review the clearly labelled fictional listings and check the consent box.
6. Select **Create my Wish**. The preview returns a plan and enables comparison controls on the demo cards.

The prompt is always editable. If the browser does not support speech recognition or microphone access is declined, type the request instead.

### Option B — load the Chrome extension

1. Start the backend with `npm start`.
2. In Chrome, visit `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select this project's `extension` folder.
4. Open the Harbor & Grove demo at [http://localhost:8787](http://localhost:8787), or a property page using the supported card format.
5. Click the Wish extension icon in Chrome's toolbar. Wish injects its compact panel into the current page.
6. Enter a request or select **Describe by voice**. Review the generated transcript, then continue with the page tools.

After changing extension files, click Chrome's reload icon for the extension and reload the target page. The extension was built for cards with visible title, currency, price, and monthly or annual rental period; unsupported layouts show an explanation instead of guessing.

## Suggested prompts

Try one request at a time:

1. `Compare these homes side by side.`
2. `Add an AED 150,000 annual budget and let me enter deposit and agency fees.`
3. `Research this neighborhood and show me sources.`

The last request follows the research-approval path. Wish proposes bounded queries first; it does not search until the user presses the dedicated search action.

For the future page adapters described above, Wish requests could sound like: *“Group these hotels into a weekend plan,”* *“Explain the material differences between these products,”* or *“Turn these job pages into an application checklist.”* These examples communicate the product direction; they are not claimed as working capabilities of the present property prototype.

## Setup and provider keys

Wish keeps provider credentials in the local `.env` file, never in the extension bundle or repository.

```powershell
Copy-Item .env.example .env
notepad .env
npm start
```

Add `OPENROUTER_API_KEY` and a separately selected `OPENROUTER_MODEL` to `.env`. `EXA_API_KEY` is optional and is required only for the research step. Restart the backend after changing `.env`.

Do not paste keys into source files, commit `.env`, or add them to the extension. The backend makes provider calls so keys remain local. The model endpoint exposes no credentials, and verification endpoints return no credentials.

To run the bounded provider checks after setup:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8787/api/verify/openrouter
Invoke-RestMethod -Method Post http://127.0.0.1:8787/api/verify/exa
```

## Guardrails and privacy

- Wish does not book, purchase, make payments, alter accounts, submit forms, send messages, or execute model-provided JavaScript.
- The model may select only components from Wish's allowlist. Server-side validation rejects unexpected IDs, fields, or UI types.
- The request uses only the compact card data the user reviewed. The page's raw HTML and microphone audio are not sent to the Wish backend.
- Speech recognition is browser-provided and may use the browser's speech service. It begins only from a user click. See [MDN's SpeechRecognition reference](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) for browser behaviour and availability.
- Exa receives only approved research queries. Wish limits research to two queries and three results per query, with displayed source links and retrieval times.
- CSV exports include provenance so a recipient can distinguish listing data from the user's assumptions.

## Architecture at a glance

| Part | Responsibility |
| --- | --- |
| `demo/wish-preview.js` | Standalone floating Wish button and type/voice interaction for the fictional demo. |
| `extension/content.js` | Owns the injected, isolated page UI and currently extracts supported property cards. Future domain adapters belong behind this layer. |
| `extension/background.js` | Manifest V3 messaging and localhost backend requests; it contains no provider keys. |
| `backend/server.mjs` | Serves the demo, proxies bounded OpenRouter/Exa requests, and exposes verification endpoints. |
| `backend/core.mjs` | Validates structured page records and plans before the interface applies anything. The current record schema is for listings. |

## Validation and known limits

Run the local checks with:

```powershell
npm run check
npm test
```

The standalone button was manually opened and inspected in the local demo. The provider configuration was exercised with bounded, schema-valid requests. Loading the toolbar extension and accepting a microphone prompt are deliberately manual browser actions: they require the user's local Chrome installation and explicit permission.

Wish currently supports a narrow listing-card adapter. It will not yet interpret every real-estate website, travel result, product grid, job board, or research portal; those require their own tested adapters and schemas. It also will not convert different currencies or invent missing charges. For the property demo, the partial-upfront estimate is limited to the first equal rent installment, refundable deposit, and a fixed agency fee supplied by the user; anything unlisted remains unknown.

## Quick troubleshooting

| If you see this | Try this |
| --- | --- |
| No floating standalone button | Confirm `npm start` is running, then reload [http://localhost:8787](http://localhost:8787). |
| No extension panel | Reload the extension at `chrome://extensions`, reload the property page, and click its toolbar icon. |
| Voice is unavailable | Use a supported browser, allow microphone access only if desired, or type the request. |
| Offline/demo result | Configure OpenRouter in local `.env`, restart the server, then use the verification endpoint. |
| Research is unavailable | Add a local `EXA_API_KEY`, restart, and explicitly approve a proposed query. |
| A real page is unsupported | Use the Harbor & Grove demo or adapt the property-card extractor for that page's stable visible fields. |

