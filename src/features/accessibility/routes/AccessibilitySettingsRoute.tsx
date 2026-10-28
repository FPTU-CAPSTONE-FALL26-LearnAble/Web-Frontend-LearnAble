import { useEffect } from "react";
import { Card, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/primitives/radio-group";
import { Label } from "@/shared/ui/primitives/label";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { announce } from "@/shared/a11y/announcer";
import { vi } from "@/shared/strings/vi";
import { useTtsStore } from "@/features/accessibility/store/ttsStore";
import { useViVoices } from "@/features/accessibility/hooks/useViVoices";
import {
  useAccessibilityProfile,
  useUpdateAccessibilityProfile,
} from "@/features/accessibility/api/useAccessibilityProfile";

const RATES = ["0.75", "1", "1.25", "1.5"] as const;

/** SCR-02 — FR-02 */
export function AccessibilitySettingsRoute() {
  useRouteAnnouncer(vi.a11ySettings.pageTitle, vi.a11ySettings.title);

  const voices = useViVoices();
  const { voiceUri, rate, setVoiceUri, setRate } = useTtsStore();
  const profileQuery = useAccessibilityProfile();
  const updateMutation = useUpdateAccessibilityProfile();

  // Đồng bộ hồ sơ server → store cục bộ lần đầu tải
  useEffect(() => {
    if (profileQuery.data) {
      setVoiceUri(profileQuery.data.ttsVoiceUri);
      setRate(profileQuery.data.ttsRate);
    }
  }, [profileQuery.data, setVoiceUri, setRate]);

  // Không giả định máy có giọng vi-VN: mặc định giọng đầu tiên nếu chưa chọn
  const selectedVoice =
    voices.find((v) => v.voiceURI === voiceUri) ?? (voices.length > 0 ? voices[0] : null);

  const preview = () => {
    if (!selectedVoice) return;
    const utterance = new SpeechSynthesisUtterance(vi.a11ySettings.ttsPreviewText);
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
    utterance.rate = rate;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  const save = () => {
    updateMutation.mutate(
      { ttsVoiceUri: selectedVoice?.voiceURI ?? null, ttsRate: rate },
      { onSuccess: () => announce(vi.a11ySettings.saved) },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 tabIndex={-1} className="text-2xl font-bold">
        {vi.a11ySettings.title}
      </h1>
      <p className="max-w-prose text-muted-foreground">{vi.a11ySettings.intro}</p>

      <Card className="flex max-w-2xl flex-col gap-5">
        <CardTitle>{vi.a11ySettings.ttsSection}</CardTitle>

        {voices.length === 0 ? (
          <div className="rounded-md border border-warning-foreground/30 bg-warning p-4 text-warning-foreground">
            {/* Quyết định 7: KHÔNG âm thầm rơi về giọng tiếng Anh — nói thẳng. */}
            <p>{vi.a11ySettings.noViVoice}</p>
            <a
              href="https://support.microsoft.com/vi-vn/topic/t%E1%BA%A3i-xu%E1%BB%91ng-ng%C3%B4n-ng%E1%BB%AF-v%C3%A0-gi%E1%BB%8Dng-n%C3%B3i"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-medium underline"
            >
              {vi.a11ySettings.noViVoiceHelp}
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="tts-voice-select">{vi.a11ySettings.ttsVoice}</Label>
            <Select
              value={selectedVoice?.voiceURI}
              onValueChange={setVoiceUri}
            >
              <SelectTrigger id="tts-voice-select">
                <SelectValue placeholder={vi.a11ySettings.ttsVoice} />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-medium">{vi.a11ySettings.ttsRate}</legend>
          <RadioGroup value={String(rate)} onValueChange={(v) => setRate(Number(v))}>
            {RATES.map((r) => (
              <div key={r} className="flex min-h-[44px] items-center gap-3">
                <RadioGroupItem id={`rate-${r}`} value={r} />
                <Label htmlFor={`rate-${r}`} className="cursor-pointer">
                  {vi.a11ySettings.ttsRateValue(r)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={preview} disabled={!selectedVoice}>
            {vi.a11ySettings.ttsPreview}
          </Button>
          <Button onClick={save} disabled={updateMutation.isPending}>
            {vi.common.save}
          </Button>
        </div>
      </Card>
    </div>
  );
}
