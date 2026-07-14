import { useState } from "react";
import { useChat } from "../../context/ChatContext";
import { assets } from "../../assets/assets.js";

export default function ChatWidget() {
  const { isOpen, toggleChat } = useChat();

  const [hover, setHover] = useState(false);

  return (
    <>
      {/* Hover Bubble */}

      <div
        className={`
        fixed
        bottom-45
        right-30
        z-40

        border
        border-line

        bg-surface-2

        px-4
        py-3

        text-ink
        text-sm

        transition-all
        duration-300

        ${
          hover
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3 pointer-events-none"
        }
      `}
      >
        👨‍🚀 Hi Explorer!
        <br />
        I'm Astro,
        <br />
        your helping assistant.
      </div>

      {/* Astronaut */}

      <button
        onClick={toggleChat}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={` fixed
          bottom-0
          right-10

          z-50

          cursor-pointer

          transition-all
          duration-500
          ease-in-out
          ${
            isOpen
              ? "opacity-0 scale-75 pointer-events-none"
              : "opacity-100 scale-80"
          }`}
      >
        <img
          src={assets[16]} // astronaut image
          alt="Astro Assistant"
          className="w-34 animate-space"
        />
      </button>
    </>
  );
}
