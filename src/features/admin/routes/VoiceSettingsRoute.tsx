import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, Palette, Pencil, Plus, RotateCcw, Save } from "lucide-react";
import type { BackendContrastTheme } from "@/api/accessibility";
import {
  getVoiceSettings,
  saveVoiceSettings,
  voiceGenders,
  voiceLanguages,
  type VoiceOption,
  type VoiceSettings,
  type VoiceSettingsBody,
} from "@/api/adminSystem";
import { themeFromBackend } from "@/lib/a11y/displayPreferences";
import { vi } from "@/shared/strings/vi";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
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

/** The same theme names and descriptions students see in their own settings. */
const themeText = (theme: BackendContrastTheme) => vi.a11ySettings.themes[themeFromBackend(theme)];
const languageLabel = (code: string) =>
  code === "vi-VN" ? "Vietnamese" : code === "en-US" ? "English (US)" : code;

/** Rules the saved configuration must satisfy; each message names the fix. */
export function validateVoiceSettings(body: VoiceSettingsBody): string[] {
  const errors: string[] = [];
  const activeVoices = body.voices.filter((voice) => voice.isActive);
  const activeThemes = body.themes.filter((theme) => theme.isActive);
  if (!activeVoices.length) errors.push("Make at least one voice available to students.");
  if (!activeThemes.length) errors.push("Make at least one colour theme available.");
  if (!body.defaultVoiceKey || !activeVoices.some((v) => v.voiceKey === body.defaultVoiceKey))
    errors.push("Choose a default voice that is available to students.");
  if (body.defaultTheme === null || !activeThemes.some((t) => t.theme === body.defaultTheme))
    errors.push("Choose a default theme that is available to students.");
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
  themes: settings.themes,
  defaultVoiceKey: settings.defaultVoiceKey,
  defaultTheme: settings.defaultTheme,
});

/** FR-35 — which reading voices and colour themes students may pick (FFCB-204). */
export function VoiceSettingsRoute() {
  useRouteAnnouncer("Voices and themes · LearnAble Admin", "Voices and themes");
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

  const activeVoices = current?.voices.filter((voice) => voice.isActive) ?? [];
  const activeThemes = current?.themes.filter((theme) => theme.isActive) ?? [];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Voices and themes"
        description="The reading voices and colour themes students can choose on the web and in the exam app."
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
                  label="Default theme"
                  value={current.defaultTheme ?? ""}
                  placeholder="Choose a theme"
                  options={activeThemes.map((option) => ({
                    value: option.theme,
                    label: themeText(option.theme).name,
                  }))}
                  onChange={(value) =>
                    update((body) => ({
                      ...body,
                      defaultTheme: value as BackendContrastTheme,
                    }))
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

          <section aria-labelledby="themes-heading" className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette aria-hidden className="size-5" />
              <h2 id="themes-heading" className="text-lg font-bold">
                Colour themes
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              The themes are built into the web and exam apps. Choose which ones
              students can switch to.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Colour themes">
              {current.themes.map((option) => {
                const checkboxId = `theme-active-${option.theme}`;
                const text = themeText(option.theme);
                return (
                  <li
                    key={option.theme}
                    className="flex flex-col gap-3 rounded-xl border border-border p-4"
                  >
                    {/* A preview drawn in the theme's own colours; the name below carries the meaning. */}
                    <div
                      aria-hidden
                      data-contrast={themeFromBackend(option.theme)}
                      className="flex h-16 items-center gap-3 rounded-lg border-2 border-foreground bg-background px-4 text-foreground"
                    >
                      <span className="text-2xl font-extrabold">Aa</span>
                      <span className="h-2 flex-1 rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="font-bold">{text.name}</p>
                      <p className="text-sm text-muted-foreground">{text.description}</p>
                    </div>
                    <div className="flex min-h-11 items-center gap-3">
                      <Checkbox
                        id={checkboxId}
                        checked={option.isActive}
                        onCheckedChange={(checked) =>
                          update((body) => ({
                            ...body,
                            themes: body.themes.map((item) =>
                              item.theme === option.theme
                                ? { ...item, isActive: checked === true }
                                : item,
                            ),
                          }))
                        }
                      />
                      <Label htmlFor={checkboxId} className="cursor-pointer">
                        {option.isActive ? "Available" : "Hidden"}
                        <span className="sr-only"> — {text.name}</span>
                      </Label>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
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
