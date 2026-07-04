import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getCurrentLocation } from "./useGeolocation";
import { updateLocation as updateLocationService } from "../services/user.service";
import { hasLocation as hasLocationUtil } from "../utils/location";

/**
 * Orchestrates the observer-location workflow.
 *
 * Responsibilities:
 *  - Read/derive whether the user already has a location.
 *  - Detect location via browser GPS (reuses useGeolocation).
 *  - Persist through the user service (reuses PATCH /users/location).
 *  - Update AuthContext.user so the whole dashboard re-renders (no reload).
 *
 * Consumed by LocationPermissionModal and ObserverCard.
 *
 * status: "idle" | "requesting" | "success" | "denied" | "error"
 */
export function useLocation() {
  const { user, setUser } = useAuth();

  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
  }, []);

  /**
   * Persist an explicit location payload (used by GPS and, later, manual entry).
   * @param {{ latitude:number, longitude:number, timezone:string, elevation_m:number }} payload
   * @returns {Promise<boolean>} whether the save succeeded
   */
  const saveLocation = useCallback(
    async (payload) => {
      setStatus("requesting");
      setErrorMessage("");

      try {
        const data = await updateLocationService(payload);
        setUser(data.user);
        setStatus("success");
        return true;
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err.response?.data?.message ??
            err.message ??
            "Failed to save location.",
        );
        return false;
      }
    },
    [setUser],
  );

  /**
   * Request browser GPS, then persist the resulting coordinates.
   * Timezone is inferred from the browser; elevation defaults to 0 for now.
   * @returns {Promise<boolean>} whether the flow succeeded
   */
  const detectAndSaveLocation = useCallback(async () => {
    if (status === "requesting") return false;

    setStatus("requesting");
    setErrorMessage("");

    let position;
    try {
      position = await getCurrentLocation();
    } catch (err) {
      // GeolocationPositionError.PERMISSION_DENIED === 1
      if (err && err.code === 1) {
        setStatus("denied");
      } else {
        setStatus("error");
        setErrorMessage(
          err?.message ?? "Unable to read your location from the browser.",
        );
      }
      return false;
    }

    const payload = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      elevation_m: 0,
    };

    return saveLocation(payload);
  }, [status, saveLocation]);

  return {
    user,
    hasLocation: hasLocationUtil(user),
    status,
    errorMessage,
    reset,
    saveLocation,
    detectAndSaveLocation,
  };
}
