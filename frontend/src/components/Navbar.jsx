import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Avatar from "./profile/Avatar";
import NotificationBell from "./notifications/NotificationBell";

export const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="border-b border-line">
      <nav className="w-full flex items-center justify-between px-12 py-6">
        <h1
          className="cursor-pointer text-2xl font-black uppercase tracking-tight text-ink"
          onClick={() => navigate("/")}
        >
          SkyGuide <span className="text-accent">AI</span>
        </h1>

        <ul className="flex items-center gap-10 text-sm font-medium text-ink-2">
          <li
            className="cursor-pointer transition-colors hover:text-accent"
            onClick={() => navigate("/")}
          >
            Home
          </li>
          <li
            className="cursor-pointer transition-colors hover:text-accent"
            onClick={() => navigate("/tonight")}
          >
            Tonight
          </li>
          <li
            className="cursor-pointer transition-colors hover:text-accent"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </li>
          <li
            className="cursor-pointer transition-colors hover:text-accent"
            onClick={() => navigate("/community")}
          >
            Community
          </li>
          <li
            className="cursor-pointer transition-colors hover:text-accent"
            onClick={() => navigate("/guide")}
          >
            Guide
          </li>
          <li>
            <NotificationBell />
          </li>
          <li>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              aria-label="Your profile"
              className="flex items-center gap-2 rounded-full transition hover:opacity-80"
            >
              <Avatar
                src={user?.avatar}
                name={user?.displayName || user?.username}
                size={32}
              />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};
