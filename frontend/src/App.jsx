import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthTest from "./pages/AuthTest";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import { useLocation } from "react-router-dom";
import ChatWidget from "./components/chatbot/ChatWidget";
import ChatWindow from "./components/chatbot/ChatWindow";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const location = useLocation();

  const hideChatOn = ["/login", "/signup"];

  const showChat = !hideChatOn.includes(location.pathname);
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
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/socket-test" element={<SocketTest />} />
        <Route path="/auth-test" element={<AuthTest />} />
      </Routes>
      {showChat && (
        <>
          <ChatWidget />
          <ChatWindow />
        </>
      )}
    </>
  );
}

export default App;
