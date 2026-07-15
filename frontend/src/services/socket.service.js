import { io } from "socket.io-client";

import { getSocketBaseUrl } from "../config/network";

export const createSocket = (token) => {
    return io(getSocketBaseUrl(), {
        autoConnect: false,
        withCredentials: true,
        auth: { token },
    });
};

/**
 * Community chat socket — the "/community" NAMESPACE, not the default one.
 *
 * Deliberately tokenless: that namespace authenticates from the httpOnly
 * session cookie (`withCredentials` ships it on the handshake), whereas the
 * default namespace expects a short-lived telescope *pairing* token. Keeping
 * them apart is why chat can't reuse createSocket().
 */
export const createCommunitySocket = () => {
    return io(`${getSocketBaseUrl()}/community`, {
        autoConnect: false,
        withCredentials: true,
    });
};

/**
 * Notification socket — the "/notifications" namespace. Tokenless like
 * /community (session-cookie auth); listen-only, the server pushes
 * `notification:new`.
 */
export const createNotificationSocket = () => {
    return io(`${getSocketBaseUrl()}/notifications`, {
        autoConnect: false,
        withCredentials: true,
    });
};
