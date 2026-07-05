import { io } from "socket.io-client";

import { getSocketBaseUrl } from "../config/network";

export const createSocket = (token) => {
    return io(getSocketBaseUrl(), {
        autoConnect: false,
        withCredentials: true,
        auth: { token },
    });
};
