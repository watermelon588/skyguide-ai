import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Clock, Mail, CalendarDays, Sparkles } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { getObserverLocation } from "../../utils/location";

/**
 * The dashboard's opening act — greets the observer by name and surfaces
 * their identity at a glance: email, membership age, coordinates, timezone
 * and a live local clock. Quick actions jump straight into the two core
 * experiences (Tonight, Alignment).
 *
 * Entrance is a quiet stagger; chips get a hairline hover — micro, per the
 * design system.
 */

function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Clear skies tonight";
}

function LiveClock({ timezone }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums">
      {now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: timezone || undefined,
      })}
    </span>
  );
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function WelcomeHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { latitude, longitude, timezone } = getObserverLocation(user);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : null;

  const chips = [
    user?.email && { Icon: Mail, label: user.email },
    memberSince && { Icon: CalendarDays, label: `Member since ${memberSince}` },
    latitude != null &&
      longitude != null && {
        Icon: MapPin,
        label: `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`,
      },
    {
      Icon: Clock,
      label: (
        <>
          {timezone || "UTC"} · <LiveClock timezone={timezone} />
        </>
      ),
    },
  ].filter(Boolean);

  const dateLine = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <motion.header
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-wrap items-end justify-between gap-6"
    >
      <div className="min-w-0">
        <motion.p
          variants={item}
          className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent"
        >
          {dateLine} · Observatory
        </motion.p>
        <motion.h1
          variants={item}
          className="mt-2 truncate text-3xl font-black uppercase tracking-tight text-ink sm:text-4xl"
        >
          {greetingFor(new Date().getHours())},{" "}
          <span className="capitalize">{user?.username || "observer"}</span>
        </motion.h1>
        <motion.div variants={item} className="mt-4 flex flex-wrap gap-2">
          {chips.map(({ Icon, label }, i) => (
            <span
              key={i}
              className="flex items-center gap-2 border border-line bg-surface-2 px-3 py-1.5 text-xs text-ink-2 transition-colors duration-300 hover:border-accent hover:text-ink"
            >
              <Icon size={13} className="shrink-0 text-accent" />
              <span className="truncate">{label}</span>
            </span>
          ))}
        </motion.div>
      </div>

      <motion.div variants={item} className="flex shrink-0 gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/tonight")}
          className="flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi"
        >
          <Sparkles size={15} />
          Tonight's sky
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/alignment")}
          className="border border-line bg-surface-2 px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-surface-3"
        >
          Alignment
        </motion.button>
      </motion.div>
    </motion.header>
  );
}
