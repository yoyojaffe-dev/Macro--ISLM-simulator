/**
 * Public API of the economic logic engine. The presentation layer imports
 * only from here; nothing in /engine depends on React or the DOM.
 */
export * from './constants.js';
export { buildScenario, demand, multipliers, kappaOf, sgn, potentialOutput, supplyCurves, isLarge, sigmaOf, EXPECTATION_DECAY, EXPECTATION_FADE, expectationShare, fiscal, FIXED_DOMAINS, outOfRange, regimeAt, effectiveSettings, calibrateShock, effectiveParams, bandAtStart, MPS_MAX, maxC } from './model.js';
export * from './curves.js';
export { buildChains, NODE_META, SHOCK_TITLES } from './chains.js';
export { evaluatePitfalls } from './pitfalls.js';
export { causeQuestion, predictQuestion, robustSigns, makeRng, COMPARISONS } from './quiz.js';
export { CASES } from './cases.js';
export { LC_QUESTIONS, COURSE_COLUMNS, LC_VARS, signTableKey, compareKey } from './learningCenters.js';
export { CASE_ARTICLES } from './caseArticles.js';
export { qualitative, caseSplit, realize, SHOCK_UNIT, SIGN_VARS, RULES, vectorKey } from './qualitative.js';
