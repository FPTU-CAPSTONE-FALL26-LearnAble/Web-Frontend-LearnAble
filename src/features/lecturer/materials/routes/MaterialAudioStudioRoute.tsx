/* eslint-disable shadcn/no-restyle, jsx-a11y/media-has-caption -- This route composes the established lecturer workbench primitives; TTS audio is generated from the visible text. */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Headphones, LoaderCircle, Play, RefreshCw, Save, Sparkles } from "lucide-react";
import { describeError } from "@/app/providers";
import {
  approveSlideAudio,
  generateMaterialAudio,
  generateSlideAudio,
  getMaterialTtsBatch,
  getMaterialTtsJob,
  getMaterialTtsOptions,
  getMaterialTtsSlides,
  getSlideAudioPlayback,
  regenerateSlideAudio,
  updateSlideTtsText,
  type MaterialTtsAudio,
} from "@/api/materialTts";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { Breadcrumb, PageHeading, ReadState, StatusBadge } from "@/features/lecturer/shared/components/Workbench";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Label } from "@/shared/ui/primitives/label";
import { Progress } from "@/shared/ui/primitives/progress";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { toast } from "@/shared/ui/primitives/toast";

const runningStatuses = new Set(["Pending", "Queued", "Claimed", "Processing", "Running"]);
const isRunning = (status?: string | null) => runningStatuses.has(status ?? "");

export function MaterialAudioStudioRoute() {
  const { materialId = "" } = useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [batchId, setBatchId] = useState("");
  const [jobId, setJobId] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState("");

  const slidesQuery = useQuery({
    queryKey: ["material-tts", "slides", materialId],
    queryFn: () => getMaterialTtsSlides(materialId),
    enabled: Boolean(materialId),
    refetchInterval: (query) => {
      const slides = query.state.data;
      return slides?.some((slide) => slide.extractionStatus && isRunning(slide.extractionStatus)) ? 3000 : false;
    },
  });
  const optionsQuery = useQuery({ queryKey: ["material-tts", "options"], queryFn: getMaterialTtsOptions });
  const batchQuery = useQuery({
    queryKey: ["material-tts", "batch", batchId],
    queryFn: () => getMaterialTtsBatch(batchId),
    enabled: Boolean(batchId),
    refetchInterval: (query) => query.state.data?.jobs?.some((job) => isRunning(job.status)) ? 2500 : false,
  });
  const jobQuery = useQuery({
    queryKey: ["material-tts", "job", jobId],
    queryFn: () => getMaterialTtsJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) => isRunning(query.state.data?.status) ? 2500 : false,
  });
  useExpiredSession(slidesQuery.error || optionsQuery.error || batchQuery.error || jobQuery.error);

  const slides = useMemo(() => slidesQuery.data ?? [], [slidesQuery.data]);
  const selected = slides.find((slide) => slide.slideId === selectedId) ?? slides[0];
  useEffect(() => {
    if (!selectedId && slides[0]) setSelectedId(slides[0].slideId);
  }, [selectedId, slides]);
  useEffect(() => {
    setTtsText(selected?.ttsText ?? selected?.originalText ?? "");
    setPlaybackUrl("");
  }, [selected?.slideId, selected?.ttsText, selected?.originalText]);

  const jobs = batchQuery.data?.jobs ?? [];
  const completedJobs = jobs.filter((job) => !isRunning(job.status)).length;
  const progress = jobs.length ? Math.round((completedJobs / jobs.length) * 100) : 0;
  const defaultVoice = optionsQuery.data?.voiceId ?? "";
  const defaultSpeed = optionsQuery.data?.synthesisSpeed ?? 1;

  const refreshSlides = async () => {
    await queryClient.invalidateQueries({ queryKey: ["material-tts", "slides", materialId] });
  };
  useEffect(() => {
    if (jobQuery.data && !isRunning(jobQuery.data.status)) void refreshSlides();
  // Refresh exactly when the polled job reaches a terminal state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobQuery.data?.status]);
  useEffect(() => {
    if (jobs.length > 0 && !jobs.some((job) => isRunning(job.status))) void refreshSlides();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchQuery.dataUpdatedAt]);
  const saveText = useMutation({
    mutationFn: () => updateSlideTtsText(selected!.slideId, ttsText.trim()),
    onSuccess: async () => {
      await refreshSlides();
      toast({ title: "TTS text saved", description: "The corrected text will be used for the next audio version.", variant: "success" });
    },
    onError: (error) => toast({ title: "TTS text could not be saved", description: describeError(error), variant: "error" }),
  });
  const generateOne = useMutation({
    mutationFn: () => {
      const input = { text: ttsText.trim(), voiceId: defaultVoice, speed: defaultSpeed };
      return (selected?.audioVersions?.length ? regenerateSlideAudio : generateSlideAudio)(selected!.slideId, input);
    },
    onSuccess: (job) => {
      setJobId(job.jobId);
      toast({ title: "Audio generation queued", description: "Keep the local TTS agent running while this slide is processed.", variant: "success" });
    },
    onError: (error) => toast({ title: "Audio could not be queued", description: describeError(error), variant: "error" }),
  });
  const generateAll = useMutation({
    mutationFn: () => generateMaterialAudio(materialId, { voiceId: defaultVoice, speed: defaultSpeed }),
    onSuccess: (batch) => {
      setBatchId(batch.batchId);
      toast({ title: "Material audio queued", description: `${batch.jobs?.length ?? slides.length} slide jobs were created.`, variant: "success" });
    },
    onError: (error) => toast({ title: "Material audio could not be queued", description: describeError(error), variant: "error" }),
  });
  const approve = useMutation({
    mutationFn: (audio: MaterialTtsAudio) => approveSlideAudio(selected!.slideId, audio.audioId),
    onSuccess: async () => {
      await refreshSlides();
      toast({ title: "Audio approved", description: "Students will receive this approved version when the material is published.", variant: "success" });
    },
    onError: (error) => toast({ title: "Audio could not be approved", description: describeError(error), variant: "error" }),
  });
  const play = useMutation({
    mutationFn: (audio: MaterialTtsAudio) => getSlideAudioPlayback(selected!.slideId, audio.audioId),
    onSuccess: (link) => {
      if (!link.url) return toast({ title: "Playback is unavailable", description: "The server did not return an audio URL.", variant: "error" });
      setPlaybackUrl(link.url);
    },
    onError: (error) => toast({ title: "Audio could not be opened", description: describeError(error), variant: "error" }),
  });
  const mutationError = saveText.error || generateOne.error || generateAll.error || approve.error || play.error;
  useExpiredSession(mutationError);

  const summary = useMemo(() => ({
    ready: slides.filter((slide) => Boolean(slide.publishedAudioId)).length,
    extracted: slides.filter((slide) => slide.extractionStatus?.toLowerCase() === "completed").length,
  }), [slides]);

  return (
    <div className="space-y-6">
      <Breadcrumb parent="Learning Materials" path="/lecturer/materials" current="Audio studio" />
      <PageHeading title="Material Audio Studio" description="Review extracted slide text, generate speech with your local TTS agent, then approve the version students should hear.">
        <Button variant="outline" asChild><Link to="/lecturer/materials">Back to materials</Link></Button>
        <Button disabled={!slides.length || !defaultVoice || generateAll.isPending} onClick={() => generateAll.mutate()}>
          {generateAll.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
          Generate all audio
        </Button>
      </PageHeading>

      <section aria-label="Audio preparation status" className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent><p className="text-sm text-muted-foreground">Slides found</p><p className="mt-2 text-2xl font-extrabold">{slides.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">Text extracted</p><p className="mt-2 text-2xl font-extrabold">{summary.extracted}/{slides.length}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">Approved audio</p><p className="mt-2 text-2xl font-extrabold">{summary.ready}/{slides.length}</p></CardContent></Card>
      </section>

      {batchId && (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3"><p className="font-bold">Batch processing</p><p role="status" className="text-sm text-muted-foreground">{completedJobs}/{jobs.length} jobs finished</p></div>
            <Progress value={progress} aria-label="Batch audio progress" />
            {jobs.some((job) => job.errorCode) && <p className="text-sm text-destructive">Some slides failed. Review their job status and retry those slides.</p>}
          </CardContent>
        </Card>
      )}
      {jobId && jobQuery.data && (
        <Card><CardContent className="flex flex-wrap items-center gap-3"><LoaderCircle aria-hidden className={isRunning(jobQuery.data.status) ? "size-5 animate-spin text-primary" : "size-5 text-success"} /><p className="mr-auto font-bold">Current slide job</p><StatusBadge value={jobQuery.data.status ?? "Unknown"} /><p role="status" className="text-sm text-muted-foreground">Attempt {jobQuery.data.attemptCount}</p></CardContent></Card>
      )}

      <ReadState pending={slidesQuery.isPending || optionsQuery.isPending} error={slidesQuery.error || optionsQuery.error} retry={() => { void slidesQuery.refetch(); void optionsQuery.refetch(); }} />
      {!slidesQuery.isPending && !slidesQuery.error && !slides.length && (
        <Card><CardContent className="py-12 text-center"><Headphones aria-hidden className="mx-auto size-10 text-muted-foreground" /><p className="mt-4 font-bold">Slides are not available yet</p><p className="mt-2 text-sm text-muted-foreground">The server must finish splitting and extracting the PDF/PPTX before audio can be generated.</p><Button className="mt-5" variant="outline" onClick={() => void slidesQuery.refetch()}><RefreshCw aria-hidden />Check again</Button></CardContent></Card>
      )}

      {slides.length > 0 && selected && (
        <div className="grid items-start gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <Card className="xl:sticky xl:top-5">
            <CardHeader><CardTitle>Slides</CardTitle></CardHeader>
            <CardContent className="max-h-[38rem] space-y-2 overflow-y-auto">
              {slides.map((slide) => (
                <button key={slide.slideId} type="button" onClick={() => setSelectedId(slide.slideId)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${selected.slideId === slide.slideId ? "border-primary bg-accent font-bold" : "border-border bg-background"}`}>
                  <span>Slide {slide.slideNumber}</span>
                  {slide.publishedAudioId ? <CheckCircle2 aria-label="Audio approved" className="size-4 text-success" /> : <StatusBadge value={slide.extractionStatus ?? "Pending"} />}
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-5">
            <Card>
              <CardHeader><CardTitle>Slide {selected.slideNumber} text</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><p className="text-sm font-bold">Original extracted text</p><p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm text-muted-foreground">{selected.originalText || "No text was extracted from this slide."}</p></div>
                <div><Label htmlFor="tts-text">Text spoken by TTS</Label><Textarea id="tts-text" className="mt-2 min-h-40" value={ttsText} maxLength={100000} onChange={(event) => setTtsText(event.target.value)} /></div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!ttsText.trim() || saveText.isPending} onClick={() => saveText.mutate()}><Save aria-hidden />{saveText.isPending ? "Saving…" : "Save text"}</Button>
                  <Button disabled={!ttsText.trim() || !defaultVoice || generateOne.isPending} onClick={() => generateOne.mutate()}><Sparkles aria-hidden />{generateOne.isPending ? "Queuing…" : selected.audioVersions?.length ? "Regenerate audio" : "Generate audio"}</Button>
                </div>
                <p className="text-xs text-muted-foreground">Voice: {defaultVoice || "Not configured by the server"} · Speed: {defaultSpeed}× · Model: {optionsQuery.data?.modelId || "Not reported"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Audio versions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(selected.audioVersions ?? []).map((audio) => (
                  <div key={audio.audioId} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
                    <div className="mr-auto"><p className="font-bold">Version {audio.version}</p><p className="mt-1 text-xs text-muted-foreground">{audio.status ?? "Unknown"}{audio.durationSeconds ? ` · ${audio.durationSeconds.toFixed(1)} seconds` : ""}</p></div>
                    <Button variant="outline" disabled={audio.status !== "Ready" || play.isPending} onClick={() => play.mutate(audio)}><Play aria-hidden />Preview</Button>
                    <Button disabled={audio.status !== "Ready" || selected.publishedAudioId === audio.audioId || approve.isPending} onClick={() => approve.mutate(audio)}>{selected.publishedAudioId === audio.audioId ? "Approved" : "Approve"}</Button>
                  </div>
                ))}
                {!selected.audioVersions?.length && <p className="text-sm text-muted-foreground">No audio version has been generated for this slide.</p>}
                {playbackUrl && <div><Label htmlFor="slide-audio">Audio preview</Label><audio id="slide-audio" className="mt-2 w-full" controls autoPlay src={playbackUrl}>Your browser does not support audio playback.</audio></div>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
