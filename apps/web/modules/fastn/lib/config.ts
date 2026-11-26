import "server-only";

/**
 * fastn settings, read from the server environment.
 *
 * Nothing here may reach the browser: FASTN_API_KEY is a secret key (`fsk_…`). The Formbricks
 * backend uses it to mint embed tokens for the hub and to send response events to fastn's
 * webhook trigger. Only the short-lived embed token (`emb_…`) is ever handed to the browser.
 */
export const FASTN_API_KEY = process.env.FASTN_API_KEY;
export const FASTN_BASE_URL = process.env.FASTN_BASE_URL || "https://api.fastn.dev";
/** The webhook trigger URL copied from fastn (Triggers → row menu → Copy URL). */
export const FASTN_WEBHOOK_URL = process.env.FASTN_WEBHOOK_URL;

/** The hub can be shown: we can mint embed tokens. */
export const isFastnEmbedConfigured = (): boolean => Boolean(FASTN_API_KEY);

/** Response events can be sent: we have a key and a trigger to send them to. */
export const isFastnEventConfigured = (): boolean => Boolean(FASTN_API_KEY && FASTN_WEBHOOK_URL);
