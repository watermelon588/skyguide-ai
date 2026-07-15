import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "../../context/ChatContext";
import ChatWindow from "../chatbot/ChatWindow";

/**
 * The Astro AI Assistant as an integrated workspace panel.
 *
 * Two coordinated presentations, chosen purely by CSS breakpoint (no JS media
 * query):
 *
 *  - Desktop (xl+): an inline flex sibling whose WIDTH animates 0 → 400px, so
 *    MainContent shrinks beside it. The inner panel keeps a fixed width and is
 *    clipped, giving a clean reveal with no text reflow.
 *  - Below xl: a fixed overlay that slides in on X with a dismissable backdrop;
 *    full-screen on mobile, 400px on sm+.
 *
 * Open state comes from ChatContext, so the launcher and panel stay in sync.
 */

const SPRING = { type: "spring", stiffness: 260, damping: 30 };

export default function AiSidebar() {
  const { isOpen, closeChat } = useChat();

  return (
    <>
      {/* Desktop: inline push panel (width animation) */}
      <motion.aside
        aria-hidden={!isOpen}
        initial={false}
        animate={{ width: isOpen ? 400 : 0 }}
        transition={SPRING}
        className="hidden h-screen shrink-0 overflow-hidden xl:block"
      >
        <div className="h-full w-[400px] border-l border-line bg-surface-1">
          <ChatWindow variant="docked" />
        </div>
      </motion.aside>

      {/* Tablet / mobile: overlay panel + backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeChat}
            className="fixed inset-0 z-[940] bg-black/60 xl:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        aria-hidden={!isOpen}
        initial={false}
        animate={{ x: isOpen ? "0%" : "100%" }}
        transition={SPRING}
        className="fixed right-0 top-0 z-[950] h-screen w-full border-l border-line bg-surface-1 sm:w-[400px] xl:hidden"
      >
        <ChatWindow variant="docked" />
      </motion.aside>
    </>
  );
}
