import { io } from "socket.io-client";

export const createSocket = (token) => {
    return io(import.meta.env.VITE_API_URL, {
        autoConnect: false,
        withCredentials: true,
        auth: { token },
    });
};
