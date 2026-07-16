import axios from "axios";

import { getApiBaseUrl } from "../config/network";

const API = `${getApiBaseUrl()}/api/chat`;

/**
 * Ask Astro.
 *
 * @param {Array<{role: string, content: string}>} messages  conversation so far
 * @param {object|null} context  useAppSnapshot() output — what the user sees
 * @returns {Promise<{reply: string, actions: Array<object>}>}
 *          `actions` already passed the gateway's allowlist; they render as
 *          buttons and execute only on click.
 */
export async function sendMessage(messages, context = null) {
    // The model consumes text only — strip UI fields (actions) from history.
    const clean = messages.map(({ role, content }) => ({ role, content }));

    const res = await axios.post(API, { messages: clean, context });

    return {
        reply: res.data.reply,
        actions: Array.isArray(res.data.actions) ? res.data.actions : [],
    };
}