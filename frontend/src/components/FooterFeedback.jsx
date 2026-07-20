import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

import { submitFeedback } from "../services/feedback.service";
import { useToast } from "../context/ToastContext";

/**
 * The footer feedback form — short and minimal by design: one category chip
 * row, a message, an optional reply-to email, one button. Works signed-out.
 * Feedback on success/failure is a toast; the form never uses a browser alert.
 */

const CATEGORIES = [
  { value: "idea", label: "Idea" },
  { value: "bug", label: "Bug" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
];

export default function FooterFeedback() {
  const toast = useToast();
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = message.trim().length >= 3 && !sending;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      await submitFeedback({
        category,
        message: message.trim(),
        email: email.trim(),
        page: typeof window !== "undefined" ? window.location.pathname : "",
      });
      toast.success("Thanks — your feedback is in.");
      setMessage("");
      setEmail("");
      setCategory("idea");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Couldn't send that — please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none " +
    "placeholder:text-ink-3 transition-colors duration-300 focus:border-accent";

  return (
    <div>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.25em] text-ink-3">
        Send feedback
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        Spotted a bug or have an idea? Tell us — it goes straight to the team.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors duration-300 ${
                category === c.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface-2 text-ink-3 hover:border-accent hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What's on your mind?"
          className={`${inputClass} resize-none`}
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional — for a reply)"
          className={inputClass}
        />

        <motion.button
          type="submit"
          disabled={!canSend}
          whileHover={{ scale: canSend ? 1.01 : 1 }}
          whileTap={{ scale: canSend ? 0.99 : 1 }}
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={15} />
          {sending ? "Sending…" : "Send feedback"}
        </motion.button>
      </form>
    </div>
  );
}
