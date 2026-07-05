/**
 * Pure reducer for telescope pairing state. Kept separate from PairingContext
 * (which has JSX) so the transition logic is trivially unit-testable and has
 * zero React dependency.
 *
 * One state shape serves both sides of a pairing session:
 *  - dashboard: idle -> creating -> waiting -> connected -> expired
 *               (any of the above) -> idle  (RESET / disconnect)
 *  - phone:     idle -> connecting -> authenticating -> connected
 *               connected -> disconnected -> authenticating (auto-reconnect)
 *               connected -> terminated (dashboard ended the session)
 *
 * Phone-only statuses (connecting/authenticating/disconnected) are additive —
 * the dashboard never produces them. Keeping one shape (instead of two) means
 * every consumer speaks the same `pairing.status` vocabulary.
 */

export const initialPairingState = {
  status: "idle",
  roomId: null,
  pairingToken: null,
  expiresAt: null,
  phone: { connected: false, socketId: null, connectedAt: null, device: null },
  error: "",
};

export function pairingReducer(state, action) {
  switch (action.type) {
    case "CREATE_START":
      // Ignore if a phone is already paired — an active session is
      // authoritative and must not be clobbered by a stray call.
      if (state.status === "connected") return state;
      return { ...initialPairingState, status: "creating" };

    case "CREATE_SUCCESS":
      return {
        ...initialPairingState,
        status: "waiting",
        roomId: action.roomId,
        pairingToken: action.token,
        expiresAt: action.expiresAt,
      };

    case "CREATE_ERROR":
      return { ...initialPairingState, status: "error", error: action.message };

    // ---- dashboard-role events ----
    case "PHONE_CONNECTED":
      return {
        ...state,
        status: "connected",
        phone: {
          connected: true,
          socketId: action.socketId ?? null,
          connectedAt: action.at ?? Date.now(),
          device: action.device ?? "Mobile device",
        },
      };

    case "PHONE_DISCONNECTED": {
      // Computed fresh from state at dispatch time (not a closed-over value),
      // so this can't go stale even if the disconnect arrives long after the
      // socket effect was set up.
      const isExpired =
        !!state.expiresAt && Date.now() >= new Date(state.expiresAt).getTime();
      return {
        ...state,
        phone: initialPairingState.phone,
        status: isExpired ? "expired" : "waiting",
      };
    }

    case "SESSION_EXPIRED":
      // Connected > Countdown: expiry only matters before anyone has paired.
      return state.status === "waiting" ? { ...state, status: "expired" } : state;

    case "SOCKET_ERROR":
      return { ...state, status: "error", error: action.message };

    case "RESET":
      return initialPairingState;

    // ---- phone-role events ----
    case "PHONE_AUTHENTICATING":
      return { ...state, status: "authenticating" };

    case "PHONE_CONNECTED_SELF":
      return { ...state, status: "connected" };

    case "PHONE_SOCKET_LOST":
      return { ...state, status: "disconnected" };

    case "SESSION_TERMINATED":
      // The dashboard ended the session — terminal state for the phone.
      return { ...state, status: "terminated" };

    default:
      return state;
  }
}
