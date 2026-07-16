import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { ChatProvider } from "./context/ChatContext";
import { ToastProvider } from "./context/ToastContext.jsx";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ChatProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ChatProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>,
);
