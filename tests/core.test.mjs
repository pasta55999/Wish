import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalPlan, calculatePartialUpfront, validateListings, validatePlan } from "../backend/core.mjs";

const listings = [
  { id: "one", title: "Cove", location: "Dubai Marina", price: { amount: 120000, currency: "AED", period: "annual" } },
  { id: "two", title: "Loft", location: "Dubai Marina", price: { amount: 9000, currency: "AED", period: "monthly" } }
];

test("accepts bounded structured listing payloads", () => {
  assert.equal(validateListings(listings).ok, true);
  assert.equal(validateListings([{ ...listings[0], id: "one" }, { ...listings[1], id: "one" }]).ok, false);
});

test("rejects a plan that references data or components it was not given", () => {
  const valid = { components: ["selection", "comparison"], listingIds: ["one"], budgetAnnual: null, researchRequested: false, searchQueries: [], explanation: "Safe plan" };
  assert.equal(validatePlan(valid, new Set(["one", "two"])).ok, true);
  assert.equal(validatePlan({ ...valid, listingIds: ["not-shared"] }, new Set(["one", "two"])).ok, false);
  assert.equal(validatePlan({ ...valid, components: ["run-javascript"] }, new Set(["one", "two"])).ok, false);
  assert.equal(validatePlan({ ...valid, unexpected: "no" }, new Set(["one", "two"])).ok, false);
});

test("demo planner handles budget and research as bounded configuration", () => {
  const plan = buildLocalPlan("Compare these. Keep it under AED 150k and research the neighbourhood sources.", listings);
  assert.equal(plan.budgetAnnual, 150000);
  assert.equal(plan.researchRequested, true);
  assert.equal(plan.searchQueries.length, 1);
  assert.ok(plan.components.includes("comparison"));
  assert.ok(plan.components.includes("budget"));
});

test("partial upfront estimate keeps annual rent separate from refundable costs", () => {
  const result = calculatePartialUpfront(listings[1], { installments: 4, deposit: 5000, agencyFee: 3000 });
  assert.equal(result, 35000);
  assert.equal(calculatePartialUpfront(listings[0], { installments: 1, deposit: "", agencyFee: 1000 }), null);
});

