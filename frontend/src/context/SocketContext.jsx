import { createContext, useContext } from "react";

import { createSocket } from "../services/socket.service";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  return (
    <SocketContext.Provider value={createSocket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
