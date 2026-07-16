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

  /**
   * Assistant turns may carry validated `actions` (buttons the user can
   * click). Stored on the message so history renders them; stripped again
   * before messages are sent back to the API (the model gets text only).
   */
  const addAssistantMessage = (message, actions = []) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: message,
        ...(actions.length > 0 ? { actions } : {}),
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
