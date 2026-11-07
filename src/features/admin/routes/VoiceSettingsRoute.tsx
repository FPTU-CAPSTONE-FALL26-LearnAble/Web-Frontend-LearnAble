import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, Gauge, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  getVoiceSettings,
  saveVoiceSettings,
  voiceGenders,
  voiceLanguages,
  type VoiceOption,
  type VoiceSettings,
  type VoiceSettingsBody,
} from "@/api/adminSystem";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/primitives/table";
import { PageHeading, ReadState } from "@/components/workbench/Workbench";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { adminKeys, useAdminWrite, useExpiredAdminSession } from "../api/useAdminData";
import { FormDialog } from "../components/AdminSurfaces";
import { formatDateTime } from "../components/SystemSurfaces";

export const MIN_SPEED = 0.5;
export const MAX_SPEED = 2;

const speedLabel = (value: number) => `${value}×`;
const languageLabel = (code: string) =>
  code === "vi-VN" ? "Vietnamese" : code === "en-US" ? "English (US)" : code;

/** Rules the saved configuration must satisfy; each message names the fix. */
export function validateVoiceSettings(body: VoiceSettingsBody): string[] {
  const errors: string[] = [];
  const activeVoices = body.voices.filter((voice) => voice.isActive);
  const activeSpeeds = body.speeds.filter((speed) => speed.isActive);
  if (!activeVoices.length) errors.push("Make at least one voice available to students.");
  if (!activeSpeeds.length) errors.push("Make at least one reading speed available.");
  if (!body.defaultVoiceKey || !activeVoices.some((v) => v.voiceKey === body.defaultVoiceKey))
    errors.push("Choose a default voice that is available to students.");
  if (body.defaultSpeed === null || !activeSpeeds.some((s) => s.value === body.defaultSpeed))
    errors.push("Choose a default speed that is available to students.");
  for (const language of voiceLanguages) {
    if (
      body.voices.some((v) => v.languageCode === language) &&
      !activeVoices.some((v) => v.languageCode === language)
    )
      errors.push(
        `Keep at least one ${languageLabel(language)} voice available, or questions in that language cannot be read aloud.`,
      );
  }
  return errors;
}

type VoiceDraft = {
  voiceKey: string;
  displayName: string;
  languageCode: string;
  gender: string;
};
const emptyVoice: VoiceDraft = {
  voiceKey: "",
  displayName: "",
  languageCode: "vi-VN",
  gender: "Female",
};

const toBody = (settings: VoiceSettings): VoiceSettingsBody => ({
  voices: settings.voices,
  speeds: settings.speeds,
  defaultVoiceKey: settings.defaultVoiceKey,
  defaultSpeed: settings.defaultSpeed,
});

/** FR-35 — which voices and speeds students may pick (FFCB-204). */
export function VoiceSettingsRoute() {
  useRouteAnnouncer("Voices and speeds · LearnAble Admin", "Voices and speeds");
  const settings = useQuery({
    queryKey: adminKeys.list("voice-settings"),
    queryFn: getVoiceSettings,
  });
  useExpiredAdminSession(settings.error);
  const [draft, setDraft] = useState<VoiceSettingsBody | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [voiceForm, setVoiceForm] = useState<{
    mode: "create" | "edit";
    value: VoiceDraft;
  } | null>(null);
  const [voiceErrors, setVoiceErrors] = useState<string[]>([]);
  const [newSpeed, setNewSpeed] = useState("");
  const [speedError, setSpeedError] = useState<string | undefined>();

  const current = draft ?? (settings.data ? toBody(settings.data) : null);
  const dirty = draft !== null;
  const update = (change: (body: VoiceSettingsBody) => VoiceSettingsBody) => {
    if (!current) return;
    setDraft(change(current));
    setErrors([]);
  };

  const save = useAdminWrite({
    resource: "voice-settings",
    action: "Save voice settings",
    mutationFn: async () => {
      await saveVoiceSettings(current!);
    },
    onSuccess: () => setDraft(null),
  });
  const submit = () => {
    if (!current) return;
    const found = validateVoiceSettings(current);
    setErrors(found);
    if (!found.length) save.mutate();
  };

  const setVoice = (voiceKey: string, patch: Partial<VoiceOption>) =>
    update((body) => ({
      ...body,
      voices: body.voices.map((voice) =>
        voice.voiceKey === voiceKey ? { ...voice, ...patch } : voice,
      ),
    }));

  const submitVoice = () => {
    if (!voiceForm || !current) return;
    const value = voiceForm.value;
    const found: string[] = [];
    if (!value.displayName.trim()) found.push("Display name is required.");
    if (!value.voiceKey.trim()) found.push("Engine voice ID is required.");
    if (
      voiceForm.mode === "create" &&
      current.voices.some((voice) => voice.voiceKey === value.voiceKey.trim())
    )
      found.push("Engine voice ID is already in the list.");
    setVoiceErrors(found);
    if (found.length) return;
    const voice: VoiceOption = {
      voiceKey: value.voiceKey.trim(),
      displayName: value.displayName.trim(),
      languageCode: value.languageCode,
      gender: value.gender as VoiceOption["gender"],
      isActive: true,
    };
    if (voiceForm.mode === "create")
      update((body) => ({ ...body, voices: [...body.voices, voice] }));
    else
      setVoice(voice.voiceKey, {
        displayName: voice.displayName,
        languageCode: voice.languageCode,
        gender: voice.gender,
      });
    setVoiceForm(null);
  };

  const addSpeed = () => {
    if (!current) return;
    const value = Number(newSpeed);
    if (!newSpeed.trim() || Number.isNaN(value)) {
      setSpeedError("Enter a number, for example 1.25.");
      return;
    }
    if (value < MIN_SPEED || value > MAX_SPEED) {
      setSpeedError(`Speed must be between ${MIN_SPEED} and ${MAX_SPEED}.`);
      return;
    }
    const rounded = Math.round(value * 100) / 100;
    if (current.speeds.some((speed) => speed.value === rounded)) {
      setSpeedError(`${speedLabel(rounded)} is already in the list.`);
      return;
    }
    setSpeedError(undefined);
    setNewSpeed("");
    update((body) => ({
      ...body,
      speeds: [...body.speeds, { value: rounded, isActive: true }].sort(
        (a, b) => a.value - b.value,
      ),
    }));
  };

  const activeVoices = current?.voices.filter((voice) => voice.isActive) ?? [];
  const activeSpeeds = current?.speeds.filter((speed) => speed.isActive) ?? [];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Voices and speeds"
        description="The reading voices and speeds students can choose on the web and in the exam app."
      >
        <Button
          variant="outline"
          disabled={!dirty || save.isPending}
          onClick={() => {
            setDraft(null);
            setErrors([]);
          }}
        >
          <RotateCcw aria-hidden />
          Discard changes
        </Button>
        <Button disabled={!dirty || save.isPending} onClick={submit}>
          <Save aria-hidden />
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </PageHeading>

      {(settings.isPending || settings.error) && (
        <ReadState
          pending={settings.isPending}
          error={settings.error}
          retry={() => void settings.refetch()}
        />
      )}

      {current && settings.data && (
        <>
          {errors.length > 0 && (
            <div
              role="alert"
              className="rounded-xl border border-destructive bg-destructive/10 p-4 text-destructive"
            >
              <p className="font-bold">Fix the following before saving:</p>
              <ul className="mt-2 list-inside list-disc text-sm">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {dirty ? (
              <span role="status" className="font-bold text-foreground">
                You have unsaved changes.{" "}
              </span>
            ) : null}
            Last saved {formatDateTime(settings.data.updatedAt)}
            {settings.data.updatedBy ? ` by ${settings.data.updatedBy}` : ""}. Students
            keep their own choice if it is still available; otherwise they get
            the default.
          </p>

          <Card className="admin-panel shadow-none">
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-lg font-bold">Defaults for students</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <ChoiceField
                  label="Default voice"
                  value={current.defaultVoiceKey ?? ""}
                  placeholder="Choose a voice"
                  options={activeVoices.map((voice) => ({
                    value: voice.voiceKey,
                    label: `${voice.displayName} (${languageLabel(voice.languageCode)})`,
                  }))}
                  onChange={(value) =>
                    update((body) => ({ ...body, defaultVoiceKey: value }))
                  }
                />
                <ChoiceField
                  label="Default speed"
                  value={current.defaultSpeed === null ? "" : String(current.defaultSpeed)}
                  placeholder="Choose a speed"
                  options={activeSpeeds.map((speed) => ({
                    value: String(speed.value),
                    label: speedLabel(speed.value),
                  }))}
                  onChange={(value) =>
                    update((body) => ({ ...body, defaultSpeed: Number(value) }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div className="flex items-center gap-2">
                <AudioLines aria-hidden className="size-5" />
                <h2 className="text-lg font-bold">Voices</h2>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setVoiceErrors([]);
                  setVoiceForm({ mode: "create", value: emptyVoice });
                }}
              >
                <Plus aria-hidden />
                Add voice
              </Button>
            </div>
            <Table containerLabel="Voices table">
              <TableHeader>
                <TableRow>
                  <TableHead>Voice</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Engine voice ID</TableHead>
                  <TableHead>Available to students</TableHead>
                  <TableHead>
                    <span className="sr-only">Edit</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.voices.map((voice) => {
                  const checkboxId = `voice-active-${voice.voiceKey}`;
                  return (
                    <TableRow key={voice.voiceKey}>
                      <TableCell className="font-bold">{voice.displayName}</TableCell>
                      <TableCell>{languageLabel(voice.languageCode)}</TableCell>
                      <TableCell>{voice.gender}</TableCell>
                      <TableCell className="font-mono text-sm">{voice.voiceKey}</TableCell>
                      <TableCell>
                        <div className="flex min-h-11 items-center gap-3">
                          <Checkbox
                            id={checkboxId}
                            checked={voice.isActive}
                            onCheckedChange={(checked) =>
                              setVoice(voice.voiceKey, { isActive: checked === true })
                            }
                          />
                          <Label htmlFor={checkboxId} className="cursor-pointer">
                            {voice.isActive ? "Available" : "Hidden"}
                            <span className="sr-only"> — {voice.displayName}</span>
                          </Label>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          aria-label={`Edit ${voice.displayName}`}
                          onClick={() => {
                            setVoiceErrors([]);
                            setVoiceForm({
                              mode: "edit",
                              value: {
                                voiceKey: voice.voiceKey,
                                displayName: voice.displayName,
                                languageCode: voice.languageCode,
                                gender: voice.gender,
                              },
                            });
                          }}
                        >
                          <Pencil aria-hidden />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!current.voices.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <p className="font-bold">No voices yet.</p>
                      <p className="mt-2 text-muted-foreground">
                        Add the first voice students can listen with.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <Card className="shadow-none">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2">
                <Gauge aria-hidden className="size-5" />
                <h2 className="text-lg font-bold">Reading speeds</h2>
              </div>
              <ul className="flex flex-wrap gap-3" aria-label="Reading speeds">
                {current.speeds.map((speed) => {
                  const checkboxId = `speed-${speed.value}`;
                  return (
                    <li
                      key={speed.value}
                      className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={speed.isActive}
                        onCheckedChange={(checked) =>
                          update((body) => ({
                            ...body,
                            speeds: body.speeds.map((item) =>
                              item.value === speed.value
                                ? { ...item, isActive: checked === true }
                                : item,
                            ),
                          }))
                        }
                      />
                      <Label htmlFor={checkboxId} className="cursor-pointer tabular-nums">
                        {speedLabel(speed.value)}
                      </Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove speed ${speedLabel(speed.value)}`}
                        onClick={() =>
                          update((body) => ({
                            ...body,
                            speeds: body.speeds.filter((item) => item.value !== speed.value),
                          }))
                        }
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <form
                className="flex flex-wrap items-end gap-2"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  addSpeed();
                }}
              >
                <div className="w-48 space-y-2">
                  <Label htmlFor="new-speed">New speed</Label>
                  <Input
                    id="new-speed"
                    inputMode="decimal"
                    value={newSpeed}
                    aria-invalid={!!speedError}
                    aria-describedby={speedError ? "new-speed-error" : "new-speed-help"}
                    onChange={(event) => setNewSpeed(event.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline">
                  <Plus aria-hidden />
                  Add speed
                </Button>
                <p
                  id={speedError ? "new-speed-error" : "new-speed-help"}
                  className={`w-full text-sm ${speedError ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {speedError ?? `Between ${MIN_SPEED} and ${MAX_SPEED}; 1 is normal speed.`}
                </p>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      <FormDialog
        open={!!voiceForm}
        onOpenChange={(open) => !open && setVoiceForm(null)}
        title={voiceForm?.mode === "edit" ? "Edit voice" : "Add voice"}
        description="The engine voice ID must match a voice the text-to-speech service provides."
        submitLabel={voiceForm?.mode === "edit" ? "Update voice" : "Add voice"}
        pending={false}
        errors={voiceErrors}
        onSubmit={submitVoice}
      >
        {voiceForm && (
          <div className="grid gap-4">
            <TextField
              label="Display name"
              value={voiceForm.value.displayName}
              onChange={(displayName) =>
                setVoiceForm({ ...voiceForm, value: { ...voiceForm.value, displayName } })
              }
            />
            <TextField
              label="Engine voice ID"
              value={voiceForm.value.voiceKey}
              disabled={voiceForm.mode === "edit"}
              onChange={(voiceKey) =>
                setVoiceForm({ ...voiceForm, value: { ...voiceForm.value, voiceKey } })
              }
            />
            <ChoiceField
              label="Language"
              value={voiceForm.value.languageCode}
              options={voiceLanguages.map((code) => ({ value: code, label: languageLabel(code) }))}
              onChange={(languageCode) =>
                setVoiceForm({ ...voiceForm, value: { ...voiceForm.value, languageCode } })
              }
            />
            <ChoiceField
              label="Gender"
              value={voiceForm.value.gender}
              options={[...voiceGenders]}
              onChange={(gender) =>
                setVoiceForm({ ...voiceForm, value: { ...voiceForm.value, gender } })
              }
            />
          </div>
        )}
      </FormDialog>
    </div>
  );
}
