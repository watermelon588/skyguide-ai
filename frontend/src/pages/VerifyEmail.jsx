import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import AuthShell, {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
} from "../components/auth/AuthShell";
import { resendVerification, verifyEmail } from "../services/auth.service";

/**
 * /verify-email — one page, two jobs:
 *
 *   Without a token ("check your inbox", right after signup): instructions,
 *   a resend button, and a cross-tab listener — when the emailed link is
 *   opened (usually in a NEW tab), that tab broadcasts success through
 *   localStorage and this one advances to login by itself. (Registration
 *   creates no session cookie, so polling /auth/me can't work here.)
 *
 *   With a token (the emailed link): redeems it against the API, shows the
 *   verdict, signals any waiting tab, and points at login.
 */

const SIGNAL_KEY = "skyguide:email-verified";

function ResendControl({ initialEmail }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [note, setNote] = useState("");

  const resend = async () => {
    if (state === "sending" || !email.trim()) return;
    setState("sending");
    try {
      await resendVerification(email.trim());
      setState("sent");
      setNote("A fresh verification email is on its way.");
    } catch (err) {
      const message = err.response?.data?.message || "";
      // "Already verified" is good news, not an error.
      if (err.response?.status === 400 && /already verified/i.test(message)) {
        setState("sent");
        setNote("This email is already verified — you can sign in.");
      } else {
        setState("error");
        setNote(message || "Couldn't send — please try again.");
      }
    }
  };

  return (
    <div className="space-y-3">
      {!initialEmail && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          className={AUTH_INPUT_CLASS}
        />
      )}
      <button
        type="button"
        onClick={resend}
        disabled={state === "sending"}
        className={AUTH_BUTTON_CLASS}
      >
        {state === "sending" ? "Sending…" : "Resend verification email"}
      </button>
      {note && (
        <p
          className={`rounded-md border px-4 py-2 text-sm ${
            state === "error"
              ? "border-red-400/20 bg-red-900/60 text-red-100"
              : "border-green-400/20 bg-green-900/40 text-green-100"
          }`}
        >
          {note}
        </p>
      )}
    </div>
  );
}

/** The emailed link's landing: redeem the token, report, signal, hand off. */
function TokenRedeemer({ token }) {
  const navigate = useNavigate();
  const [state, setState] = useState("checking"); // checking | verified | invalid
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke guard — one redemption
    ran.current = true;
    verifyEmail(token)
      .then(() => {
        setState("verified");
        // Wake the "check your inbox" tab, if one is waiting.
        localStorage.setItem(SIGNAL_KEY, String(Date.now()));
      })
      .catch(() => setState("invalid"));
  }, [token]);

  if (state === "checking") {
    return (
      <AuthShell heading="Verifying…" sub="One moment">
        <div className="mx-auto my-6 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
      </AuthShell>
    );
  }

  if (state === "verified") {
    return (
      <AuthShell heading="Email verified" sub="Welcome to SkyGuide AI">
        <div className="space-y-5 text-center">
          <p className="rounded-md border border-green-400/20 bg-green-900/40 px-4 py-3 text-sm text-green-100">
            Your account is active — sign in and meet tonight's sky.
          </p>
          <button
            type="button"
            onClick={() =>
              navigate("/login", { state: { notice: "Email verified — sign in below." } })
            }
            className={AUTH_BUTTON_CLASS}
          >
            Sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell heading="Link expired" sub="Verification links live for 10 minutes">
      <div className="space-y-5">
        <p className="rounded-md border border-red-400/20 bg-red-900/50 px-4 py-3 text-center text-sm text-red-100">
          This verification link is invalid or has expired — request a new one
          below.
        </p>
        <ResendControl />
        <p className="text-center text-sm text-gray-400">
          <Link to="/login" className="font-semibold text-white hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

/** Post-signup waiting room. */
function InboxWaiter() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Fires when the emailed link is redeemed in ANOTHER tab.
    const onSignal = (event) => {
      if (event.key === SIGNAL_KEY) setVerified(true);
    };
    window.addEventListener("storage", onSignal);
    return () => window.removeEventListener("storage", onSignal);
  }, []);

  useEffect(() => {
    if (!verified) return;
    const id = setTimeout(
      () =>
        navigate("/login", {
          state: { notice: "Email verified — sign in below.", email },
        }),
      1500,
    );
    return () => clearTimeout(id);
  }, [verified, navigate, email]);

  return (
    <AuthShell heading="Check your inbox" sub="One click and you're in">
      <div className="space-y-5">
        {verified ? (
          <p className="rounded-md border border-green-400/20 bg-green-900/40 px-4 py-3 text-center text-sm text-green-100">
            Verified! Taking you to sign in…
          </p>
        ) : (
          <>
            <p className="text-center text-sm leading-relaxed text-gray-300">
              We sent a verification link to{" "}
              <span className="font-semibold text-white">
                {email || "your email"}
              </span>
              . Click it (this page will notice) — the link expires in 10
              minutes.
            </p>
            <ResendControl initialEmail={email} />
          </>
        )}
        <p className="text-center text-sm text-gray-400">
          Already verified?{" "}
          <Link to="/login" className="font-semibold text-white hover:underline">
            Login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmail() {
  const { token } = useParams();
  return token ? <TokenRedeemer token={token} /> : <InboxWaiter />;
}
