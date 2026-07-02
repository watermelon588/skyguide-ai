import { useEffect, useRef, useState } from "react";
import { useChat } from "../../context/ChatContext";
import { sendMessage } from "../../services/chat.service";
import { assets } from "../../assets/assets.js";
import "../../styles/chatwindow.css";

export default function ChatWindow() {
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

      const reply = await sendMessage(conversation);

      addAssistantMessage(reply);
    } catch (err) {
      addAssistantMessage("⚠️ Sorry, I couldn't reach mission control.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`
      fixed
      top-0
      right-0

      h-screen
      w-[420px]

      bg-black/40
      backdrop-blur-2xl

      border-l
      border-white/10

      z-[999]

      flex
      flex-col

      transition-all
      duration-500

      ${isOpen ? "translate-x-0" : "translate-x-full"}
    `}
    >
      {/* Header */}

      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div
          className={`flex items-center gap-8 ${isOpen ? "animate-dock" : ""}`}
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
            <h2 className="text-white text-2xl font-semibold">Astro</h2>

            <p className="text-gray-400 text-sm">AI Astronomy Assistant</p>
          </div>
        </div>

        <button
          onClick={closeChat}
          className="text-2xl text-gray-300 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* Messages */}

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-white border border-white/10"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="bg-white/10 rounded-xl px-4 py-2 text-gray-300 w-fit">
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
              text-white
              bg-white/10
              border
              border-white/10
              rounded-full
              px-3
              py-2
              hover:bg-white/20
            "
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {/* Input */}

      <div className="border-t border-white/10 p-4 flex gap-3">
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
          bg-white/10
          border
          border-white/10
          rounded-xl
          px-4
          py-3
          text-white
          outline-none
          placeholder:text-gray-500
        "
        />

        <button
          onClick={() => handleSend()}
          className="
          px-5
          rounded-xl
          bg-white/10
          border
          border-white/10
          hover:bg-white/20
          text-white
        "
        >
          ➜
        </button>
      </div>
    </div>
  );
}
