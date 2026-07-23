import "./App.css";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthTest from "./pages/AuthTest";
import LoginPage from "./pages/LoginPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Align from "./pages/Align";
import { useLocation } from "react-router-dom";
import ChatWidget from "./components/chatbot/ChatWidget";
import ChatWindow from "./components/chatbot/ChatWindow";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import PairedRoutes from "./layouts/PairedRoutes";
import NetworkStatus from "./components/dev/NetworkStatus";
import RouteMeta from "./components/RouteMeta";
import NotFound from "./pages/NotFound";

// Authenticated app pages render inside AppLayout (which provides its own
// integrated AI sidebar + launcher). Every other page keeps the legacy
// floating overlay chat so the Landing page is unchanged.
// Pages that use AppLayout — which already provides the docked AI sidebar and
// its ChatWidget launcher. They must be listed here so App.jsx does NOT also
// mount the floating overlay chat, or the page shows two chatbots (Explore hit
// exactly that bug).
const APP_PATHS = [
  "/dashboard",
  "/alignment",
  "/profile",
  "/community",
  "/community/chat",
  "/explore",
  "/gallery",
];
// Astro is available on the main product pages (including the immersive
// /tonight and /guide, for a uniform shell) but not on auth screens, the mobile
// alignment companion, or public profiles.
const HIDE_CHAT_ON = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/align",
  "/align-lab",
  "/observers",
  "/privacy",
];

// Dev-only Alignment Mode simulator. The dead branch is eliminated from
// production builds, so the lab never ships.
const AlignLab = import.meta.env.DEV
  ? lazy(() => import("./pages/AlignLab"))
  : null;

// /tonight, the landing page and the dashboard carry GSAP/three.js via the
// shared sky components — lazy-loaded so the app shell stays lean and the
// sky stack downloads only where used.
const Tonight = lazy(() => import("./pages/Tonight"));
const TargetPanel = lazy(() => import("./pages/TargetPanel"));
const Explore = lazy(() => import("./pages/Explore"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AlignmentWorkspace = lazy(() => import("./pages/AlignmentWorkspace"));
const Profile = lazy(() => import("./pages/Profile"));
const Community = lazy(() => import("./pages/Community"));
// The gallery pulls in GSAP-driven BounceCards and a grid of full-size photos —
// lazy so it only downloads for people who open it.
const Gallery = lazy(() => import("./pages/Gallery"));
const CommunityChat = lazy(() => import("./pages/CommunityChat"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Guide = lazy(() => import("./pages/Guide"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

function App() {
  const location = useLocation();

  const isAppPage = APP_PATHS.includes(location.pathname);
  // startsWith so nested immersive routes (/tonight/M42) stay chat-free too.
  const showOverlayChat =
    !HIDE_CHAT_ON.some((path) => location.pathname.startsWith(path)) &&
    !isAppPage;

  return (
    <>
      <RouteMeta />
      {/* Removed: a full-screen <img src="./src/assets/bg/7.jpg"> sat here at
          -z-10. The path was a raw STRING, not an import, so Vite never
          fingerprinted or copied it — it resolved only under the dev server and
          404'd in any production build. It was therefore already absent from
          the deployed app; deleting it just makes dev match what ships. Every
          route paints its own opaque `bg-bg` canvas over it regardless. */}
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={null}>
              <HomePage />
            </Suspense>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        {/* Password recovery. The emailed link points at /reset-password/<token>,
            so the token lives in the path — see forgotPassword() in the gateway. */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Every authenticated page shares ONE pairing session (PairedRoutes).
            That is what lets /alignment be a route: the phone stays paired
            while the user moves between the dashboard, tonight and back. */}
        <Route
          element={
            <ProtectedRoute>
              <PairedRoutes />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <AppLayout>
                <Suspense fallback={null}>
                  <Dashboard />
                </Suspense>
              </AppLayout>
            }
          />
          {/* The alignment workspace — telemetry + guidance, two columns. */}
          <Route
            path="/alignment"
            element={
              <AppLayout>
                <Suspense fallback={null}>
                  <AlignmentWorkspace />
                </Suspense>
              </AppLayout>
            }
          />
          {/* Immersive full-screen experience — outside AppLayout on purpose. */}
          <Route
            path="/tonight"
            element={
              <Suspense fallback={null}>
                <Tonight />
              </Suspense>
            }
          />
          <Route
            path="/tonight/:id"
            element={
              <Suspense fallback={null}>
                <TargetPanel />
              </Suspense>
            }
          />
          {/* The full ~13k-object catalog: visualizations + a browsable table. */}
          <Route
            path="/explore"
            element={
              <AppLayout>
                <Suspense fallback={null}>
                  <Explore />
                </Suspense>
              </AppLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <AppLayout>
                <Suspense fallback={null}>
                  <Profile />
                </Suspense>
              </AppLayout>
            }
          />
          <Route
            path="/community"
            element={
              <AppLayout>
                <Suspense fallback={null}>
                  <Community />
                </Suspense>
              </AppLayout>
            }
          />
          <Route
            path="/gallery"
            element={
              <AppLayout>
                <Suspense fallback={null}>
                  <Gallery />
                </Suspense>
              </AppLayout>
            }
          />
          <Route
            path="/community/chat"
            element={
              <AppLayout>
                <Suspense fallback={null}>
                  <CommunityChat />
                </Suspense>
              </AppLayout>
            }
          />
        </Route>
        {/* Public observer profile — standalone, visibility-gated server-side. */}
        <Route
          path="/observers/:username"
          element={
            <Suspense fallback={null}>
              <PublicProfile />
            </Suspense>
          }
        />
        {/* First Light Guide — public product tour + logged-in checklist. */}
        <Route
          path="/guide"
          element={
            <Suspense fallback={null}>
              <Guide />
            </Suspense>
          }
        />
        {/* Privacy policy — public, linked from the auth consent checkbox. */}
        <Route
          path="/privacy"
          element={
            <Suspense fallback={null}>
              <PrivacyPolicy />
            </Suspense>
          }
        />
        <Route path="/align" element={<Align />} />
        {AlignLab && (
          <Route
            path="/align-lab"
            element={
              <Suspense fallback={null}>
                <AlignLab />
              </Suspense>
            }
          />
        )}
        <Route path="/socket-test" element={<SocketTest />} />
        <Route path="/auth-test" element={<AuthTest />} />
        {/* Anything else: a designed 404 rather than a blank screen. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showOverlayChat && (
        <>
          {/* The floating astronaut is desktop-only; on phones Astro opens from
              the navbar's "Ask Astro" (the ChatWindow overlay still mounts). */}
          <div className="hidden lg:block">
            <ChatWidget />
          </div>
          <ChatWindow />
        </>
      )}
      <NetworkStatus />
    </>
  );
}

export default App;
