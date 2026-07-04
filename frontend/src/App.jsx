import "./App.css";
import { Route, Routes } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthTest from "./pages/AuthTest";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Align from "./pages/Align";
import { useLocation } from "react-router-dom";
import ChatWidget from "./components/chatbot/ChatWidget";
import ChatWindow from "./components/chatbot/ChatWindow";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";

// Authenticated app pages render inside AppLayout (which provides its own
// integrated AI sidebar + launcher). Every other page keeps the legacy
// floating overlay chat so the Landing page is unchanged.
const APP_PATHS = ["/dashboard"];
const HIDE_CHAT_ON = ["/login", "/signup", "/align"];

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
        <Route path="/" element={<HomePage />} />
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
        <Route path="/align" element={<Align />} />
        <Route path="/socket-test" element={<SocketTest />} />
        <Route path="/auth-test" element={<AuthTest />} />
      </Routes>
      {showOverlayChat && (
        <>
          <ChatWidget />
          <ChatWindow />
        </>
      )}
    </>
  );
}

export default App;
