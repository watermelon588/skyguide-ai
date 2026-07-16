const { askGroq } = require("../services/groqService");

/**
 * Astro chat controller.
 *
 * Treats the LLM as untrusted input: whatever `actions` it proposes are
 * filtered through a fixed allowlist HERE, before a client ever sees them.
 * An action that survives is still only a button — nothing executes until
 * the user clicks it, client-side, through already-authenticated services.
 */

// The fixed set of pages a chat button may open (target panels handled
// separately). Anchored — a hallucinated route dies here.
const STATIC_ROUTES = new Set([
    "/dashboard",
    "/tonight",
    "/explore",
    "/alignment",
    "/community",
    "/community/chat",
    "/guide",
    "/profile",
]);

// A catalog id in any of the three catalogs the app now carries: Messier "M42",
// "NGC 253" (optional trailing component letter), "IC 434". This is the security
// boundary for observe/plan targets and target-panel routes, so it is strict.
const CATALOG_ID_RE = /^(M\s?\d{1,3}|(?:NGC|IC)\s?\d{1,4}[A-Z]?)$/i;

/** Canonical catalog id ("m 42" -> "M42", "ngc253" -> "NGC 253"), or null. */
function normalizeCatalogId(raw) {
    if (typeof raw !== "string") return null;
    const s = raw.trim().toUpperCase();
    if (!CATALOG_ID_RE.test(s)) return null;
    const m = s.match(/^M\s?(\d{1,3})$/);
    if (m) return `M${Number(m[1])}`;
    const ngc = s.match(/^(NGC|IC)\s?(\d{1,4})([A-Z]?)$/);
    return `${ngc[1]} ${Number(ngc[2])}${ngc[3]}`;
}

const MAX_ACTIONS = 3;
const MAX_LABEL_CHARS = 40;

/** Keep only actions that match the allowlist, normalized for the client. */
function sanitizeActions(actions) {
    if (!Array.isArray(actions)) return [];

    const clean = [];
    for (const action of actions) {
        if (clean.length >= MAX_ACTIONS) break;
        if (!action || typeof action !== "object") continue;

        const label =
            typeof action.label === "string" && action.label.trim()
                ? action.label.trim().slice(0, MAX_LABEL_CHARS)
                : null;

        if (action.type === "navigate") {
            const to = typeof action.to === "string" ? action.to.trim() : "";

            if (STATIC_ROUTES.has(to)) {
                clean.push({ type: "navigate", label: label ?? "Open", to });
                continue;
            }
            // A target panel: "/tonight/<id>". Validate + canonicalize the id so
            // a bad id can't smuggle an arbitrary path through.
            const panel = to.match(/^\/tonight\/(.+)$/);
            if (panel) {
                let raw;
                try {
                    raw = decodeURIComponent(panel[1]);
                } catch {
                    continue; // malformed encoding
                }
                const id = normalizeCatalogId(raw);
                if (!id) continue;
                clean.push({
                    type: "navigate",
                    label: label ?? "Open",
                    to: `/tonight/${id}`,
                });
            }
            // Anything else: dropped.
        } else if (action.type === "observe" || action.type === "plan") {
            const target = normalizeCatalogId(action.target);
            if (!target) continue;
            clean.push({
                type: action.type,
                label:
                    label ??
                    (action.type === "observe"
                        ? `Observe ${target}`
                        : `Add ${target} to plan`),
                target,
            });
        }
        // Unknown types fall through — dropped.
    }
    return clean;
}

/** Forward only clean {role, content} pairs — no client-invented fields. */
function sanitizeMessages(messages) {
    if (!Array.isArray(messages)) return null;
    const clean = messages
        .filter(
            (m) =>
                m &&
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string" &&
                m.content.trim().length > 0,
        )
        .slice(-20) // the model doesn't need a novel of history
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    return clean.length > 0 ? clean : null;
}

exports.chat = async function chat(req, res) {
    try {
        const messages = sanitizeMessages(req.body?.messages);
        if (!messages) {
            return res.status(400).json({
                success: false,
                message: "Messages are required.",
            });
        }

        const { reply, actions } = await askGroq(messages, req.body?.context);

        return res.json({
            success: true,
            reply,
            actions: sanitizeActions(actions),
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Groq Error",
        });
    }
};
