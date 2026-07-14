import { Navbar } from "../components/Navbar";
import MainContent from "../components/layout/MainContent";
import AiSidebar from "../components/layout/AiSidebar";
import ChatWidget from "../components/chatbot/ChatWidget";

/**
 * Global layout for authenticated application pages (Dashboard and future
 * Planner / Telescope Manager / Settings).
 *
 * A flex row: MainContent shrinks smoothly as the AiSidebar opens. The root
 * clips overflow so the width animation never introduces horizontal scroll.
 *
 * NOT used by the Landing/Home or auth pages — those keep their existing look.
 */
export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      <MainContent>
        <Navbar />
        {children}
      </MainContent>

      <AiSidebar />
      <ChatWidget />
    </div>
  );
}
