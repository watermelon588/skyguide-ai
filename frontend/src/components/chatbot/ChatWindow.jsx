import { useEffect, useRef, useState } from "react";
import { useChat } from "../../context/ChatContext";
import { sendMessage } from "../../services/chat.service";
import { useAppSnapshot } from "../../hooks/useAppSnapshot";
import ActionButton from "./ActionButton";
import { assets } from "../../assets/assets.js";
import Button from "../ui/Button";
import "../../styles/chatwindow.css";

/**
 * Astro chat panel.
 *
 * variant "overlay" (default): legacy floating panel — used on the Landing
 * page, unchanged. variant "docked": fills its parent (the AiSidebar) so the
 * layout owns positioning and animation.
 */
export default function ChatWindow({ variant = "overlay" }) {
  const isDocked = variant === "docked";
  const {
    isOpen,
    closeChat,
    messages,
    addUserMessage,
    addAssistantMessage,
    loading,
    setLoading,
  } = useChat();

  const [input, setInput] = useState("");
  const buildSnapshot = useAppSnapshot();

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSend = async (question = input) => {
    if (!question.trim()) return;

    addUserMessage(question);

    setInput("");

    setLoading(true);

    try {
      const conversation = [
        ...messages,

        {
          role: "user",

          content: question,
        },
      ];

      // Astro sees what the user sees: a compact snapshot of the live app
      // state rides along with every message.
      const { reply, actions } = await sendMessage(
        conversation,
        buildSnapshot(),
      );

      addAssistantMessage(reply, actions);
    } catch {
      addAssistantMessage("⚠️ Sorry, I couldn't reach mission control.");
    } finally {
      setLoading(false);
    }
  };

  const wrapperClass = isDocked
    ? "flex h-full w-full flex-col"
    : `fixed top-0 right-0 h-screen w-[420px] bg-surface-1 border-l border-line z-[999] flex flex-col transition-all duration-500 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`;

  return (
    <div className={wrapperClass}>
      {/* Header */}

      <div className="flex items-center justify-between p-5 border-b border-line">
        <div
          className={`flex items-center gap-3 ${isOpen ? "animate-dock" : ""}`}
        >
          <img
            src={assets[16]}
            alt="Astro"
            className={`
        w-14
        animate-space
    `}
          />
          <div>
            <h2 className="text-ink text-2xl font-black uppercase tracking-tight">Astro</h2>

            <p className="text-ink-3 text-sm">AI Astronomy Assistant</p>
          </div>
        </div>

        <button
          onClick={closeChat}
          className="text-2xl text-ink-2 hover:text-ink"
        >
          ×
        </button>
      </div>

      {/* Messages */}

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              message.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-accent text-ink"
                  : "bg-surface-2 text-ink border border-line"
              }`}
            >
              {message.content}
            </div>
            {/* Validated actions become buttons under the assistant bubble. */}
            {message.role === "assistant" && message.actions?.length > 0 && (
              <div className="mt-2 flex max-w-[80%] flex-wrap gap-2">
                {message.actions.map((action, i) => (
                  <ActionButton key={`${index}-${i}`} action={action} />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="bg-surface-2 px-4 py-2 text-ink-2 w-fit">
            Astro is thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}

      {messages.length === 1 && (
        <div className="px-5 flex flex-wrap gap-2 mb-3">
          {[
            "🪐 What can I observe tonight?",
            "🔭 Help align my telescope",
            "🌌 Explain Orion Nebula",
            "🛰 Track satellites",
          ].map((question) => (
            <button
              key={question}
              onClick={() => handleSend(question)}
              className="
              text-xs
              text-ink
              bg-surface-2
              border
              border-line
              px-3
              py-2
              hover:bg-surface-3
            "
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {/* Input */}

      <div className="border-t border-line p-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
          placeholder="Ask Astro..."
          className="
          flex-1
          bg-surface-2
          border
          border-line
          px-4
          py-3
          text-ink
          outline-none
          transition-colors
          focus:border-accent
          placeholder:text-ink-3
        "
        />

        <Button
          variant="primary"
          size="md"
          onClick={() => handleSend()}
          disabled={loading}
          className="px-5"
          aria-label="Send message"
        >
          ➜
        </Button>
      </div>
    </div>
  );
}
