/**
 * The primary scrollable work area of an app page.
 *
 * `flex-1 min-w-0` lets it shrink smoothly when the AiSidebar takes width on
 * desktop — the page inside never needs to know the sidebar exists.
 */
export default function MainContent({ children }) {
  return (
    <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
      {children}
    </main>
  );
}
