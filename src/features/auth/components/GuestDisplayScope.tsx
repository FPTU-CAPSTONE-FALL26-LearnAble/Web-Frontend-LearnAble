import { Outlet } from "react-router";
import { GUEST, useDisplayPreferenceScope } from "@/lib/a11y/displayPreferences";

/**
 * Sign-in pages show the text size and colours a visitor chose on the public
 * site, so a low-vision student keeps them on the page where they type their
 * account details.
 */
export function GuestDisplayScope() {
  useDisplayPreferenceScope(GUEST);
  return <Outlet />;
}
