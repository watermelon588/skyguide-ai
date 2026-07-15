import { useState } from "react";
import { SendHorizonal } from "lucide-react";

/**
 * The message input. Enter sends, Shift+Enter makes a newline; the counter only
 * appears near the limit so it nags exactly when it's useful.
 */

const MAX = 500;

export default function MessageComposer({ onSend, onTyping, disabled }) {
  const [body, setBody] = useState("");

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MAX && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(trimmed);
    setBody("");
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-line bg-surface-1 p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value.slice(0, MAX));
            onTyping?.();
          }}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={
            disabled ? "Connecting…" : "Share what you're seeing tonight…"
          }
          className="max-h-32 min-h-[42px] flex-1 resize-y border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder-ink-3 outline-none transition-colors focus:border-accent disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center bg-accent text-ink transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendHorizonal size={16} />
        </button>
      </div>

      {body.length > MAX - 100 && (
        <p className="mt-1.5 text-right text-[11px] text-ink-3">
          {body.length}/{MAX}
        </p>
      )}
    </div>
  );
}
