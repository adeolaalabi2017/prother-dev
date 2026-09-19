/**
 * Anonymous voter identity (PRD F-14: 1 vote per visitor per launch).
 * Key is generated once and persisted in localStorage.
 */
const VOTER_KEY_STORAGE = "prother_voter_key";

export function getVoterKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(VOTER_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    window.localStorage.setItem(VOTER_KEY_STORAGE, key);
  }
  return key;
}
