import "./App.css";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthTest from "./pages/AuthTest";
import LoginPage from "./pages/LoginPage";
import Align from "./pages/Align";
import { useLocation } from "react-router-dom";
import ChatWidget from "./components/chatbot/ChatWidget";
import ChatWindow from "./components/chatbot/ChatWindow";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import NetworkStatus from "./components/dev/NetworkStatus";

// Authenticated app pages render inside AppLayout (which provides its own
// integrated AI sidebar + launcher). Every other page keeps the legacy
// floating overlay chat so the Landing page is unchanged.
const APP_PATHS = ["/dashboard", "/profile", "/community"];
const HIDE_CHAT_ON = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/align",
  "/align-lab",
  "/tonight",
  "/observers",
  "/guide",
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
const HomePage = lazy(() => import("./pages/HomePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Community = lazy(() => import("./pages/Community"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Guide = lazy(() => import("./pages/Guide"));

function App() {
  const location = useLocation();

  const isAppPage = APP_PATHS.includes(location.pathname);
  // startsWith so nested immersive routes (/tonight/M42) stay chat-free too.
  const showOverlayChat =
    !HIDE_CHAT_ON.some((path) => location.pathname.startsWith(path)) &&
    !isAppPage;

  return (
    <>
      <div>
        <img
          src={"./src/assets/bg/7.jpg"}
          alt="bgimage"
          className="absolute inset-0 w-full h-screen -z-10"
        />
      </div>
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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Suspense fallback={null}>
                  <Dashboard />
                </Suspense>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        {/* Immersive full-screen experience — outside AppLayout on purpose. */}
        <Route
          path="/tonight"
          element={
            <ProtectedRoute>
              <Suspense fallback={null}>
                <Tonight />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tonight/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={null}>
                <TargetPanel />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Suspense fallback={null}>
                  <Profile />
                </Suspense>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/community"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Suspense fallback={null}>
                  <Community />
                </Suspense>
              </AppLayout>
            </ProtectedRoute>
          }
        />
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
      </Routes>
      {showOverlayChat && (
        <>
          <ChatWidget />
          <ChatWindow />
        </>
      )}
      <NetworkStatus />
    </>
  );
}

export default App;
