import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { Providers } from "@/app/providers";
import { router } from "@/app/router";
import { initContrastTheme } from "@/lib/a11y/contrastTheme";
import "@/styles/index.css";

// Before the first paint, so the page never flashes in another theme.
initContrastTheme();

async function enableMocking() {
  if (import.meta.env.VITE_USE_MSW !== "true") return;
  const { worker } = await import("@/mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
});
