import { createContext, useContext, useState } from "react";

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👨‍🚀 Hello explorer! I'm Astro, your AI astronomy assistant. Ask me anything about SkyGuide AI or the night sky.",
    },
  ]);

  const openChat = () => setIsOpen(true);

  const closeChat = () => setIsOpen(false);

  const toggleChat = () => setIsOpen((prev) => !prev);

  const addUserMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: message,
      },
    ]);
  };

  const addAssistantMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: message,
      },
    ]);
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "👨‍🚀 Hello explorer! I'm Astro, your AI astronomy assistant. Ask me anything about SkyGuide AI or the night sky.",
      },
    ]);
  };

  const value = {
    isOpen,
    loading,
    messages,

    setLoading,

    openChat,
    closeChat,
    toggleChat,

    addUserMessage,
    addAssistantMessage,

    clearChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}
