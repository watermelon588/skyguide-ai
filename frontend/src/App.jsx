import "./App.css";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthTest from "./pages/AuthTest";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
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
const APP_PATHS = ["/dashboard"];
const HIDE_CHAT_ON = ["/login", "/signup", "/align", "/align-lab", "/tonight"];

// Dev-only Alignment Mode simulator. The dead branch is eliminated from
// production builds, so the lab never ships.
const AlignLab = import.meta.env.DEV
  ? lazy(() => import("./pages/AlignLab"))
  : null;

// /tonight and the landing page carry three.js + GSAP — lazy-loaded so the
// app-shell bundle stays lean and the sky stack downloads only where used.
const Tonight = lazy(() => import("./pages/Tonight"));
const HomePage = lazy(() => import("./pages/HomePage"));

function App() {
  const location = useLocation();

  const isAppPage = APP_PATHS.includes(location.pathname);
  const showOverlayChat =
    !HIDE_CHAT_ON.includes(location.pathname) && !isAppPage;

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
                <Dashboard />
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
