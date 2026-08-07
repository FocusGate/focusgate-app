// rules.js — builds and applies chrome.declarativeNetRequest dynamic rules.
//
// declarativeNetRequest matches and redirects requests entirely inside the browser's
// network stack, before the page even starts loading — much faster and more reliable
// than a content script trying to detect and redirect after the fact.

export const DEFAULT_BLOCKED_DOMAINS = [
  "tiktok.com",
  "youtube.com",
  "instagram.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "discord.com",
  "web.whatsapp.com",
];

// Dynamic rule ids must be unique positive integers. Starting at a fixed offset keeps
// them stable and predictable across calls, and clearly out of the way of any other
// rules this extension might add in the future.
const RULE_ID_BASE = 1000;

/**
 * The dashboard's "Add site" field just takes freeform text (placeholder: "e.g.
 * youtube.com") — someone could paste "https://youtube.com/watch?v=..." instead of a
 * bare domain. Strips a scheme, path, and any "www." prefix so it matches the same
 * `||domain^` filter shape either way.
 */
export function normalizeDomain(input) {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .replace(/^www\./i, "");
}

/**
 * One redirect rule per domain, matching the bare domain and any subdomain/path,
 * for top-level page navigations only (resourceTypes: ["main_frame"]) — we want to
 * redirect the tab itself, not block every sub-resource (image/script) a page loads.
 *
 * @param {string[]} domains
 * @returns {chrome.declarativeNetRequest.Rule[]}
 */
function buildRules(domains) {
  return domains.map((domain, i) => ({
    id: RULE_ID_BASE + i,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: "/blocked.html" },
    },
    condition: {
      // Matches the domain itself and any subdomain (e.g. "www.youtube.com",
      // "m.youtube.com"), over http or https.
      urlFilter: `||${normalizeDomain(domain)}^`,
      resourceTypes: ["main_frame"],
    },
  }));
}

/** Installs blocking rules for the given domains, replacing any previous FocusGate rules. */
export async function applyBlockRules(domains) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((r) => r.id).filter((id) => id >= RULE_ID_BASE && id < RULE_ID_BASE + 1000);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: buildRules(domains),
  });
}

/** Removes every FocusGate blocking rule — called when a session ends. */
export async function clearBlockRules() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map((r) => r.id).filter((id) => id >= RULE_ID_BASE && id < RULE_ID_BASE + 1000);
  if (existingIds.length === 0) return;
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existingIds });
}

/**
 * Immediately redirects any already-open tab sitting on a blocked domain.
 * declarativeNetRequest only intercepts *new* navigations — a tab that was already open
 * on a blocked site before a session started (or before a break ended and blocking
 * resumed) wouldn't otherwise get redirected until the user next navigated there. Called
 * right after applyBlockRules() everywhere blocking turns on, so the sweep and the rule
 * update land together instead of leaving a gap between them.
 */
export async function sweepExistingTabs(domains) {
  const normalized = domains.map(normalizeDomain);
  const blockedPage = chrome.runtime.getURL("blocked.html");
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs.map((tab) => {
      if (!tab.id || !tab.url) return Promise.resolve();
      let hostname;
      try {
        hostname = new URL(tab.url).hostname;
      } catch {
        return Promise.resolve(); // chrome://, about:, etc. — nothing to match against
      }
      const isBlocked = normalized.some((d) => hostname === d || hostname.endsWith(`.${d}`));
      if (!isBlocked) return Promise.resolve();
      return chrome.tabs.update(tab.id, { url: blockedPage }).catch(() => {});
    })
  );
}
