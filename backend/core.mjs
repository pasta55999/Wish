export const SUPPORTED_COMPONENTS = new Set([
  "selection", "comparison", "budget", "assumptions", "research"
]);

const TEXT_LIMIT = 280;
const CURRENCIES = new Set(["AED", "USD", "EUR", "GBP", "SAR", "QAR"]);

export const planSchema = {
  name: "wish_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["components", "listingIds", "budgetAnnual", "researchRequested", "searchQueries", "explanation"],
    properties: {
      components: { type: "array", items: { type: "string", enum: [...SUPPORTED_COMPONENTS] }, minItems: 1, maxItems: 5 },
      listingIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 12 },
      budgetAnnual: { type: ["number", "null"], minimum: 0 },
      researchRequested: { type: "boolean" },
      searchQueries: { type: "array", items: { type: "string", maxLength: 160 }, maxItems: 2 },
      explanation: { type: "string", minLength: 1, maxLength: 300 }
    }
  }
};

export function safeText(value, max = TEXT_LIMIT) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";
}

export function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateListings(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return { ok: false, error: "Choose between 1 and 12 listings." };
  const ids = new Set();
  for (const item of value) {
    if (!item || typeof item !== "object" || !safeText(item.id, 80) || ids.has(item.id)) return { ok: false, error: "Listings need unique stable IDs." };
    ids.add(item.id);
    if (!safeText(item.title) || !safeText(item.location) || !item.price || !finiteNumber(item.price.amount) || item.price.amount < 0) return { ok: false, error: "Each shared listing needs title, location, and a numeric price." };
    if (!CURRENCIES.has(item.price.currency) || !["monthly", "annual"].includes(item.price.period)) return { ok: false, error: "Unsupported price currency or period." };
  }
  return { ok: true };
}

export function validatePlan(value, suppliedIds) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "The model did not return a plan object." };
  const allowedKeys = new Set(["components", "listingIds", "budgetAnnual", "researchRequested", "searchQueries", "explanation"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return { ok: false, error: "The plan contained unsupported fields." };
  if (!Array.isArray(value.components) || !value.components.length || value.components.length > 5 || value.components.some((item) => !SUPPORTED_COMPONENTS.has(item))) return { ok: false, error: "The plan requested an unsupported component." };
  if (!Array.isArray(value.listingIds) || !value.listingIds.length || value.listingIds.length > 12 || value.listingIds.some((id) => typeof id !== "string" || !suppliedIds.has(id))) return { ok: false, error: "The plan referenced a listing that was not shared." };
  if (new Set(value.listingIds).size !== value.listingIds.length) return { ok: false, error: "The plan repeated a listing." };
  if (!(value.budgetAnnual === null || (finiteNumber(value.budgetAnnual) && value.budgetAnnual >= 0 && value.budgetAnnual <= 100000000))) return { ok: false, error: "The budget is invalid." };
  if (typeof value.researchRequested !== "boolean" || !Array.isArray(value.searchQueries) || value.searchQueries.length > 2 || value.searchQueries.some((query) => !safeText(query, 160))) return { ok: false, error: "The research configuration is invalid." };
  if (typeof value.explanation !== "string" || !safeText(value.explanation, 300)) return { ok: false, error: "The plan explanation is invalid." };
  if (!value.researchRequested && value.searchQueries.length) return { ok: false, error: "Research queries require a research request." };
  return { ok: true, value: {
    components: [...new Set(value.components)],
    listingIds: value.listingIds,
    budgetAnnual: value.budgetAnnual,
    researchRequested: value.researchRequested,
    searchQueries: value.searchQueries.map((query) => safeText(query, 160)),
    explanation: safeText(value.explanation, 300)
  }};
}

function parseBudget(prompt) {
  const match = prompt.match(/(?:aed|dh|\$|€|£)?\s*(\d+(?:[.,]\d+)?)\s*(k|000)?\b/i);
  if (!match || !/(budget|under|below|less than|max|afford)/i.test(prompt)) return null;
  const base = Number(match[1].replace(",", ""));
  return Number.isFinite(base) ? base * (match[2] ? 1000 : 1) : null;
}

export function buildLocalPlan(prompt, listings) {
  const lower = safeText(prompt, 600).toLowerCase();
  const researchRequested = /\b(research|neighbou?rhood|transport|sources?|area|schools?)\b/.test(lower);
  const needsBudget = /\b(budget|under|below|less than|max|afford|filter)\b/.test(lower);
  const needsAssumptions = /\b(deposit|fee|fees|installments?|upfront|cash)\b/.test(lower);
  const components = ["selection", "comparison"];
  if (needsBudget) components.push("budget");
  if (needsAssumptions) components.push("assumptions");
  if (researchRequested) components.push("research");
  const location = listings[0]?.location || "this area";
  return {
    components,
    listingIds: listings.map((listing) => listing.id),
    budgetAnnual: parseBudget(lower),
    researchRequested,
    searchQueries: researchRequested ? [`${location} neighbourhood public transport and amenities`] : [],
    explanation: "Local demo plan: comparison controls are configured from your request. Connect OpenRouter for live interpretation."
  };
}

export function annualRent(listing) {
  if (!listing?.price || !finiteNumber(listing.price.amount)) return null;
  return listing.price.period === "annual" ? listing.price.amount : listing.price.amount * 12;
}

export function calculatePartialUpfront(listing, assumptions) {
  const annual = annualRent(listing);
  const parsed = (value) => value === "" || value === null || value === undefined ? null : Number(value);
  const installments = parsed(assumptions?.installments);
  const deposit = parsed(assumptions?.deposit);
  const agencyFee = parsed(assumptions?.agencyFee);
  if (!finiteNumber(annual) || !Number.isInteger(installments) || installments < 1 || !finiteNumber(deposit) || deposit < 0 || !finiteNumber(agencyFee) || agencyFee < 0) return null;
  return annual / installments + deposit + agencyFee;
}

export function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

