import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AccessibilitySettingsRoute } from "./AccessibilitySettingsRoute";

const english: SpeechSynthesisVoice = { voiceURI: "en-voice", name: "English voice", lang: "en-US", default: true, localService: true };
const vietnamese: SpeechSynthesisVoice = { voiceURI: "vi-voice", name: "Vietnamese voice", lang: "vi-VN", default: false, localService: true };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("makes saved Vietnamese voices unavailable while previewing and saving an English voice", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  const speak = vi.fn();
  vi.stubGlobal("speechSynthesis", { getVoices: () => [english, vietnamese], addEventListener: vi.fn(), removeEventListener: vi.fn(), cancel: vi.fn(), speak });
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  const fetch = vi.fn(async () => new Response(JSON.stringify({ ttsVoiceUri: "vi-voice", ttsRate: 1 })));
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><main><AccessibilitySettingsRoute /></main></QueryClientProvider>);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  await waitFor(() => expect(JSON.parse(localStorage.getItem("learnable.tts")!).state.voiceUri).toBe("en-voice"));
  expect(screen.getByText(/Vietnamese.*temporarily unavailable/i)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Preview voice" }));
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ lang: "en-US", voice: english }));
  fireEvent.click(screen.getByRole("combobox", { name: "Voice" }));
  expect(await screen.findByRole("option", { name: /Vietnamese voice/ })).toHaveAttribute("aria-disabled", "true");
  fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "PUT", body: JSON.stringify({ ttsVoiceUri: "en-voice", ttsRate: 1 }) })));
});
