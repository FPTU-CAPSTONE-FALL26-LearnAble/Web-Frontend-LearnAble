/* eslint-disable shadcn/no-restyle, jsx-a11y/media-has-caption -- This route composes the established lecturer workbench primitives; TTS audio is generated from the visible text. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Headphones, LoaderCircle, Play, RefreshCw, Save, Sparkles, X } from "lucide-react";
import { ApiFailure } from "@/api/client";
import { publishLearningMaterial } from "@/api/lecturer";
import { describeError } from "@/app/providers";
import {
  approveSlideAudio,
  cancelMaterialTtsJob,
  generateMaterialAudio,
  generateSlideAudio,
  getMaterialAudioInfo,
  getMaterialFileLink,
  getMaterialTtsBatch,
  getMaterialTtsJob,
  getMaterialTtsOptions,
  getMaterialTtsAgents,
  getMaterialTtsSlides,
  getSlideAudioPlayback,
  regenerateSlideAudio,
  updateSlideTtsText,
  type MaterialTtsAudio,
} from "@/api/materialTts";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { Breadcrumb, PageHeading, ReadState, StatusBadge } from "@/features/lecturer/shared/components/Workbench";
import { Button } from "@/shared/ui/primitives/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/primitives/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Label } from "@/shared/ui/primitives/label";
import { Input } from "@/shared/ui/primitives/input";
import { Progress } from "@/shared/ui/primitives/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { toast } from "@/shared/ui/primitives/toast";
import { NarrationFollowAlong } from "./NarrationFollowAlong";

const runningStatuses = new Set(["PENDING", "QUEUED", "CLAIMED", "PROCESSING", "RUNNING", "UPLOADING"]);
const isRunning = (status?: string | null) => runningStatuses.has((status ?? "PENDING").toUpperCase());
const activeAudioStatuses = new Set(["PENDING", "GENERATING", "UPLOADING"]);
const elapsedLabel = (startedAt: string, now: number) => {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return "";
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
};
const audioStatusLabel = (status?: string | null) => ({
  PENDING: "Waiting to create audio",
  GENERATING: "Creating audio",
  UPLOADING: "Saving audio",
  READY_FOR_REVIEW: "Ready to preview",
  APPROVED: "Approved",
  FAILED: "Audio creation failed",
}[status ?? ""] ?? status ?? "Unknown");

export function MaterialAudioStudioRoute() {
  const { materialId = "" } = useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [batchId, setBatchId] = useState(() => typeof window === "undefined" ? "" : window.sessionStorage.getItem(`material-tts-batch:${materialId}`) ?? "");
  const [jobId, setJobId] = useState("");
  const [pagePlayback, setPagePlayback] = useState<{ url: string; slideId: string; audio: MaterialTtsAudio } | null>(null);
  const [pagePlaybackTime, setPagePlaybackTime] = useState({ current: 0, duration: 0 });
  const [wholePlaybackTime, setWholePlaybackTime] = useState({ current: 0, duration: 0 });
  const [wholePlayback, setWholePlayback] = useState<{ pages: { slideId: string; audioId: string; number: number; text: string }[]; index: number; url: string } | null>(null);
  const [wholePlaybackPending, setWholePlaybackPending] = useState(false);
  const [showCancelPending, setShowCancelPending] = useState(false);
  const [selectedDocumentVersion, setSelectedDocumentVersion] = useState(0);
  const [isDocumentAudioOpen, setIsDocumentAudioOpen] = useState(true);
  const [cancelProgress, setCancelProgress] = useState({ done: 0, total: 0 });
  const wholeAudioRef = useRef<HTMLAudioElement>(null);
  const pageAudioRef = useRef<HTMLAudioElement>(null);
  const playbackRun = useRef(0);
  const [listPage, setListPage] = useState(0);
  const [pageNumberInput, setPageNumberInput] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const previousAudioStatuses = useRef(new Map<string, string>());

  const slidesQuery = useQuery({
    queryKey: ["material-tts", "slides", materialId],
    queryFn: () => getMaterialTtsSlides(materialId),
    enabled: Boolean(materialId),
    refetchInterval: (query) => {
      const slides = query.state.data;
      return slides?.some((slide) => (slide.extractionStatus && isRunning(slide.extractionStatus)) || slide.audioVersions?.some((audio) => activeAudioStatuses.has(audio.status ?? ""))) ? 5000 : false;
    },
  });
  const materialQuery = useQuery({ queryKey: ["material-tts", "material", materialId], queryFn: () => getMaterialAudioInfo(materialId), enabled: Boolean(materialId) });
  const pdfFormat = (materialQuery.data?.fileName?.split(".").pop() || materialQuery.data?.materialType || "").toLowerCase() === "pdf";
  const fileQuery = useQuery({ queryKey: ["material-tts", "file", materialId], queryFn: () => getMaterialFileLink(materialId), enabled: Boolean(materialId) && pdfFormat, staleTime: 8 * 60_000, refetchInterval: 8 * 60_000 });
  const optionsQuery = useQuery({ queryKey: ["material-tts", "options"], queryFn: getMaterialTtsOptions });
  const agentsQuery = useQuery({ queryKey: ["material-tts", "agents"], queryFn: getMaterialTtsAgents, refetchInterval: 30_000 });
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
  useExpiredSession(materialQuery.error || slidesQuery.error || optionsQuery.error || batchQuery.error || jobQuery.error || fileQuery.error);

  const slides = useMemo(() => slidesQuery.data ?? [], [slidesQuery.data]);
  const audioVersions = slides.flatMap((slide) => slide.audioVersions ?? []);
  const documentAudioVersion = audioVersions.reduce((latest, audio) => Math.max(latest, audio.version), 0);
  const selectedVersionNumber = selectedDocumentVersion || documentAudioVersion;
  const waitingVersions = audioVersions.filter((audio) => audio.status === "PENDING").length;
  const generatingVersions = audioVersions.filter((audio) => audio.status === "GENERATING" || audio.status === "UPLOADING").length;
  const playablePages = useMemo(() => slides.flatMap((slide) => {
    const audio = slide.audioVersions?.find((version) => version.audioId === slide.publishedAudioId)
      ?? [...(slide.audioVersions ?? [])].reverse().find((version) => version.status === "READY_FOR_REVIEW" || version.status === "APPROVED");
    return audio ? [{ slideId: slide.slideId, audioId: audio.audioId, number: slide.slideNumber, text: audio.textSnapshot ?? "" }] : [];
  }).sort((a, b) => a.number - b.number), [slides]);
  const documentReady = playablePages.length;
  const documentProgress = slides.length ? Math.round(documentReady / slides.length * 100) : 0;
  const audioToApprove = slides.flatMap((slide) => {
    const latestReady = [...(slide.audioVersions ?? [])]
      .filter((audio) => audio.status === "READY_FOR_REVIEW")
      .sort((a, b) => b.version - a.version)[0];
    return latestReady && latestReady.audioId !== slide.publishedAudioId ? [{ slideId: slide.slideId, audioId: latestReady.audioId }] : [];
  });
  const allPagesHaveReviewableAudio = slides.length > 0 && slides.every((slide) =>
    Boolean(slide.publishedAudioId || slide.audioVersions?.some((audio) => audio.status === "READY_FOR_REVIEW")));
  const allPagesApproved = slides.length > 0 && slides.every((slide) => Boolean(slide.publishedAudioId));
  const materialPublished = materialQuery.data?.status?.toLowerCase() === "published";
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    for (const slide of slides) for (const audio of slide.audioVersions ?? []) {
      const before = previousAudioStatuses.current.get(audio.audioId);
      const after = audio.status ?? "";
      if (before && activeAudioStatuses.has(before) && after === "READY_FOR_REVIEW") toast({ title: `Page ${slide.slideNumber} audio is ready`, description: "You can preview and approve this version now.", variant: "success" });
      if (before && activeAudioStatuses.has(before) && after === "FAILED") toast({ title: `Page ${slide.slideNumber} audio failed`, description: "Check the local TTS agent, then try generating it again.", variant: "error" });
      previousAudioStatuses.current.set(audio.audioId, after);
    }
  }, [slides]);
  const format = (materialQuery.data?.fileName?.split(".").pop() || materialQuery.data?.materialType || "").toLowerCase();
  const unit = slides[0]?.unitKind?.toLowerCase() === "slide" ? "slide" : format === "ppt" || format === "pptx" ? "slide" : "page";
  const unitLabel = unit === "slide" ? "Slide" : "Page";
  const supportedFormat = format === "pdf";
  const selected = slides.find((slide) => slide.slideId === selectedId) ?? slides[0];
  const pageSize = 24;
  const pageCount = Math.ceil(slides.length / pageSize);
  const visibleSlides = slides.slice(listPage * pageSize, (listPage + 1) * pageSize);
  const selectSlide = (slideId: string) => {
    setSelectedId(slideId);
    setPagePlayback(null);
  };
  const jumpToPage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requested = Number(pageNumberInput.trim());
    const index = slides.findIndex((slide) => slide.slideNumber === requested);
    if (!Number.isInteger(requested) || index < 0) return;
    setListPage(Math.floor(index / pageSize));
    selectSlide(slides[index].slideId);
    setPageNumberInput("");
  };
  useEffect(() => {
    if (!selectedId && slides[0]) setSelectedId(slides[0].slideId);
  }, [selectedId, slides]);
  useEffect(() => {
    setTtsText(selected?.ttsText ?? selected?.originalText ?? "");
    setPagePlayback(null);
  }, [selected?.slideId, selected?.ttsText, selected?.originalText]);

  const jobs = batchQuery.data?.jobs ?? [];
  const selectedVersionJobs = jobs.filter((job) => job.audioVersion === selectedVersionNumber && isRunning(job.status));
  const jobState = (status?: string | null) => (status ?? "Pending").toLowerCase();
  const succeededJobs = jobs.filter((job) => ["completed", "succeeded", "success", "ready"].includes(jobState(job.status))).length;
  const failedJobs = jobs.filter((job) => jobState(job.status) === "failed" || Boolean(job.errorCode)).length;
  const cancelledJobs = jobs.filter((job) => ["cancelled", "canceled"].includes(jobState(job.status))).length;
  const processingJobs = jobs.filter((job) => ["claimed", "processing", "running", "uploading"].includes(jobState(job.status))).length;
  const pendingJobs = jobs.length - succeededJobs - failedJobs - cancelledJobs - processingJobs;
  const finishedJobs = succeededJobs + failedJobs + cancelledJobs;
  const batchAudioIds = new Set(jobs.map((job) => job.audioId));
  const batchStartedAt = audioVersions
    .filter((audio) => batchAudioIds.has(audio.audioId))
    .map((audio) => audio.createdAt)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
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
      void refreshSlides();
      toast({ title: "Audio generation queued", description: `Keep the local TTS agent running while this ${unit} is processed.`, variant: "success" });
    },
    onError: (error) => toast({ title: "Audio could not be queued", description: describeError(error), variant: "error" }),
  });
  const generateAll = useMutation({
    mutationFn: () => generateMaterialAudio(materialId, { voiceId: defaultVoice, speed: defaultSpeed }),
    onSuccess: (batch) => {
      queryClient.setQueryData(["material-tts", "batch", batch.batchId], batch);
      setBatchId(batch.batchId);
      setSelectedDocumentVersion(0);
      window.sessionStorage.setItem(`material-tts-batch:${materialId}`, batch.batchId);
      void refreshSlides();
      toast({ title: batch.jobs?.length ? "Material audio queued" : "No audio jobs were created", description: batch.jobs?.length ? `${batch.jobs.length} ${unit} jobs were created.` : `No ${unit}s have narration text. Add text to a ${unit} before generating audio.`, variant: batch.jobs?.length ? "success" : "error" });
    },
    onError: (error) => toast({ title: "Material audio could not be queued", description: describeError(error), variant: "error" }),
  });
  const cancelJob = useMutation({
    mutationFn: (id: string) => cancelMaterialTtsJob(id),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["material-tts", "job", jobId] }), queryClient.invalidateQueries({ queryKey: ["material-tts", "batch", batchId] })]);
      toast({ title: "Audio job cancelled", variant: "success" });
    },
    onError: (error) => toast({ title: "Job could not be cancelled", description: describeError(error), variant: "error" }),
  });
  const cancelBatch = useMutation({
    mutationFn: async () => {
      const targets = [...selectedVersionJobs];
      setCancelProgress({ done: 0, total: targets.length });
      let cancelled = 0;
      let alreadyFinished = 0;
      for (const [index, job] of targets.entries()) {
        try {
          await cancelMaterialTtsJob(job.jobId);
          cancelled++;
        } catch (error) {
          if (error instanceof ApiFailure && error.detail.kind === "server" && error.detail.status === 409) alreadyFinished++;
          else throw error;
        }
        setCancelProgress({ done: index + 1, total: targets.length });
        if (index < targets.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 900));
      }
      return { cancelled, alreadyFinished };
    },
    onSuccess: async (result) => {
      const cancelledCount = result.cancelled;
      setShowCancelPending(false);
      setCancelProgress({ done: 0, total: 0 });
      await Promise.all([
        refreshSlides(),
        queryClient.invalidateQueries({ queryKey: ["material-tts", "batch", batchId] }),
        queryClient.invalidateQueries({ queryKey: ["material-tts", "job", jobId] }),
      ]);
      toast({ title: `${cancelledCount} unfinished ${cancelledCount === 1 ? "page" : "pages"} cancelled`, description: `Version ${selectedVersionNumber}: completed audio remains available.${!result.alreadyFinished ? "" : ` ${result.alreadyFinished} pages had already finished.`}`, variant: "success" });
    },
    onError: (error) => {
      setShowCancelPending(false);
      void refreshSlides();
      void queryClient.invalidateQueries({ queryKey: ["material-tts", "batch", batchId] });
      toast({ title: "Selected version was not fully cancelled", description: `${describeError(error)} Refresh the status, then try again to cancel the remaining pages.`, variant: "error" });
    },
  });
  const approve = useMutation({
    mutationFn: (audio: MaterialTtsAudio) => approveSlideAudio(selected!.slideId, audio.audioId),
    onSuccess: async () => {
      await refreshSlides();
      toast({ title: "Audio approved", description: "Students will receive this approved version when the material is published.", variant: "success" });
    },
    onError: (error) => toast({ title: "Audio could not be approved", description: describeError(error), variant: "error" }),
  });
  const approveAll = useMutation({
    mutationFn: async () => {
      for (const audio of audioToApprove) await approveSlideAudio(audio.slideId, audio.audioId);
      return audioToApprove.length;
    },
    onSuccess: async (count) => {
      await refreshSlides();
      toast({ title: `${count} page${count === 1 ? "" : "s"} approved`, description: "The material can be published once every page has approved audio.", variant: "success" });
    },
    onError: async (error) => {
      await refreshSlides();
      toast({ title: "Could not approve every page", description: `${describeError(error)} Completed approvals were kept; review the remaining pages and try again.`, variant: "error" });
    },
  });
  const publishMaterial = useMutation({
    mutationFn: () => publishLearningMaterial(materialId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["material-tts", "material", materialId] }),
        queryClient.invalidateQueries({ queryKey: ["lecturer", "materials"] }),
      ]);
      toast({ title: "Material published", description: "Students can now access this learning material.", variant: "success" });
    },
    onError: (error) => toast({ title: "Material could not be published", description: describeError(error), variant: "error" }),
  });
  const play = useMutation({
    mutationFn: ({ audio, slideId }: { audio: MaterialTtsAudio; slideId: string }) => getSlideAudioPlayback(slideId, audio.audioId),
    onSuccess: (link, { audio, slideId }) => {
      if (!link.url) return toast({ title: "Playback is unavailable", description: "The backend did not provide an audio link.", variant: "error" });
      playbackRun.current += 1;
      wholeAudioRef.current?.pause();
      setWholePlayback(null);
      setPagePlaybackTime({ current: 0, duration: 0 });
      setPagePlayback({ url: link.url, slideId, audio });
    },
    onError: (error) => toast({ title: "Audio could not be opened", description: describeError(error), variant: "error" }),
  });
  const stopWholePlayback = () => {
    playbackRun.current += 1;
    wholeAudioRef.current?.pause();
    setWholePlayback(null);
  };
  const startWholePlayback = async () => {
    if (!playablePages.length) return;
    const run = ++playbackRun.current;
    setWholePlaybackPending(true);
    try {
      const first = playablePages[0];
      const link = await getSlideAudioPlayback(first.slideId, first.audioId);
      if (!link.url) throw new Error("No audio link is available for the first page.");
      if (run === playbackRun.current) {
        setPagePlayback(null);
        setWholePlaybackTime({ current: 0, duration: 0 });
        setWholePlayback({ pages: playablePages, index: 0, url: link.url });
      }
    } catch (error) {
      if (run === playbackRun.current) toast({ title: "Could not play the document", description: describeError(error), variant: "error" });
    } finally {
      if (run === playbackRun.current) setWholePlaybackPending(false);
    }
  };
  const playNextPage = async () => {
    if (!wholePlayback) return;
    const nextIndex = wholePlayback.index + 1;
    if (nextIndex >= wholePlayback.pages.length) {
      stopWholePlayback();
      toast({ title: "Document playback finished", variant: "success" });
      return;
    }
    const run = playbackRun.current;
    const next = wholePlayback.pages[nextIndex];
    try {
      const link = await getSlideAudioPlayback(next.slideId, next.audioId);
      if (!link.url) throw new Error(`No audio link is available for ${unit} ${next.number}.`);
      if (run === playbackRun.current) {
        setWholePlaybackTime({ current: 0, duration: 0 });
        setWholePlayback({ ...wholePlayback, index: nextIndex, url: link.url });
      }
    } catch (error) {
      if (run === playbackRun.current) {
        stopWholePlayback();
        toast({ title: "Playback stopped", description: describeError(error), variant: "error" });
      }
    }
  };
  useEffect(() => {
    if (!wholePlayback?.url) return;
    void wholeAudioRef.current?.play().catch(() => {
      // Browser autoplay may require the lecturer to press Play in the visible controls.
    });
  }, [wholePlayback?.url]);
  useEffect(() => {
    const currentPage = wholePlayback?.pages[wholePlayback.index];
    if (!currentPage) return;
    setSelectedId(currentPage.slideId);
    const index = slides.findIndex((slide) => slide.slideId === currentPage.slideId);
    if (index >= 0) setListPage(Math.floor(index / pageSize));
  // Only follow a newly playing page, not every background refresh of the slide list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wholePlayback?.pages, wholePlayback?.index]);
  const changeNarrationText = (value: string) => {
    wholeAudioRef.current?.pause();
    pageAudioRef.current?.pause();
    setTtsText(value);
  };
  const pauseNarration = () => {
    wholeAudioRef.current?.pause();
    pageAudioRef.current?.pause();
  };
  const mutationError = saveText.error || generateOne.error || generateAll.error || cancelJob.error || cancelBatch.error || approve.error || approveAll.error || publishMaterial.error || play.error;
  useExpiredSession(mutationError);

  return (
    <div className="space-y-6">
      <Breadcrumb parent="Learning Materials" path="/lecturer/materials" current="Audio studio" currentClassName="font-semibold text-primary" />
      <PageHeading title="Material Audio Studio">
        <Button variant="outline" asChild><Link to="/lecturer/materials">Back to materials</Link></Button>
        <Button disabled={!slides.length || !defaultVoice || generateAll.isPending} onClick={() => generateAll.mutate()}>
          {generateAll.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
          Generate all audio
        </Button>
        <Button variant="outline" disabled={!allPagesHaveReviewableAudio || !audioToApprove.length || approveAll.isPending || approve.isPending} onClick={() => approveAll.mutate()}>
          {approveAll.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : <CheckCircle2 aria-hidden />}
          {approveAll.isPending ? "Approving audio…" : "Approve all audio"}
        </Button>
        <Button disabled={!allPagesApproved || materialPublished || publishMaterial.isPending || approveAll.isPending} onClick={() => publishMaterial.mutate()}>
          {publishMaterial.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : <CheckCircle2 aria-hidden />}
          {materialPublished ? "Material published" : publishMaterial.isPending ? "Publishing…" : "Publish material"}
        </Button>
      </PageHeading>
      {slides.length > 0 && <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-xl font-bold text-primary">Whole document audio</CardTitle>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" aria-expanded={isDocumentAudioOpen} aria-controls="document-audio-details" onClick={() => setIsDocumentAudioOpen((open) => !open)}>
              <ChevronDown aria-hidden className={isDocumentAudioOpen ? "rotate-180" : undefined} />
              {isDocumentAudioOpen ? "Collapse" : "Expand"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Audio available for {documentReady} of {slides.length} {unit}s</p><p role="status" className="font-bold text-success-foreground">{documentProgress}%</p></div>
          <Progress value={documentProgress} aria-label={`Whole document audio ready: ${documentProgress} percent`} className="h-2 bg-muted [&_[data-slot=progress-indicator]]:bg-success-border" />
          <p className="text-sm font-medium text-foreground">Approved audio: {slides.filter((slide) => slide.publishedAudioId).length}/{slides.length} {unit}s{materialPublished ? " · Material already published; newly approved audio becomes available without publishing again." : ""}</p>
          {generateAll.isPending && <p role="status" className="flex items-center gap-2 text-sm font-medium text-foreground"><LoaderCircle aria-hidden className="size-4 animate-spin text-success-border" />Creating audio jobs for {slides.length} {unit}s. This may take a while.</p>}
          {(batchStartedAt || generateAll.submittedAt > 0) && <p role="status" className="text-sm font-medium text-foreground">Time since request: {elapsedLabel(generateAll.isPending ? new Date(generateAll.submittedAt).toISOString() : batchStartedAt ?? new Date(generateAll.submittedAt).toISOString(), now)}</p>}
          <div id="document-audio-details" hidden={!isDocumentAudioOpen} className={isDocumentAudioOpen ? "space-y-4" : "hidden"}>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p className="rounded-lg bg-muted px-3 py-2">Document audio versions <strong className="ml-1">{documentAudioVersion}</strong></p>
            <p className="rounded-lg bg-muted px-3 py-2">Pages waiting to start <strong className="ml-1">{waitingVersions}</strong></p>
            <p className="rounded-lg bg-muted px-3 py-2">Pages being created or saved <strong className="ml-1">{generatingVersions}</strong></p>
          </div>
          {documentAudioVersion > 0 && <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
            <div className="min-w-52 space-y-2">
              <Label htmlFor="document-audio-version">Choose document audio version</Label>
              <Select value={String(selectedVersionNumber)} onValueChange={(value) => setSelectedDocumentVersion(Number(value))}>
                <SelectTrigger id="document-audio-version" className="w-full"><SelectValue placeholder="Choose a version" /></SelectTrigger>
                <SelectContent>{Array.from({ length: documentAudioVersion }, (_, index) => index + 1).map((version) => <SelectItem key={version} value={String(version)}>Version {version}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="destructive" disabled={!selectedVersionJobs.length || cancelBatch.isPending} onClick={() => setShowCancelPending(true)}><X aria-hidden />Cancel version {selectedVersionNumber}</Button>
          </div>}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={!documentReady || wholePlaybackPending} onClick={() => void startWholePlayback()}><Play aria-hidden />{documentReady === slides.length ? "Play whole document" : `Play available audio (${documentReady}/${slides.length})`}</Button>
            {wholePlayback && <Button variant="outline" onClick={stopWholePlayback}><X aria-hidden />Stop playback</Button>}
            <Button variant="outline" size="sm" disabled={slidesQuery.isFetching} onClick={() => void slidesQuery.refetch()}><RefreshCw aria-hidden className={slidesQuery.isFetching ? "animate-spin" : undefined} />Refresh progress</Button>
          </div>
          {wholePlayback && <p role="status" className="text-sm font-semibold">Playing {unit} {wholePlayback.pages[wholePlayback.index].number} · {wholePlayback.index + 1}/{wholePlayback.pages.length}. Player and narration are beside the document below.</p>}
          {batchId && <div className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-primary">Audio generation jobs</p><p role="status" className="font-semibold text-foreground">{finishedJobs}/{jobs.length} finished</p></div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <p className="rounded-lg bg-muted px-3 py-2">Waiting <strong>{pendingJobs}</strong></p>
              <p className="rounded-lg bg-accent px-3 py-2">Processing <strong>{processingJobs}</strong></p>
              <p className="rounded-lg bg-muted px-3 py-2">Completed <strong>{succeededJobs}</strong></p>
              <p className="rounded-lg bg-muted px-3 py-2">Failed <strong className="text-destructive">{failedJobs}</strong></p>
            </div>
            {cancelledJobs > 0 && <p className="text-sm text-muted-foreground">Cancelled: {cancelledJobs}</p>}
            {jobs.length > 0 && <div className="max-h-52 space-y-1 overflow-y-auto" aria-label="Audio jobs by page">{jobs.map((job) => {
              const page = slides.find((slide) => slide.slideId === job.slideId);
              return <div key={job.jobId} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><span className="mr-auto font-medium">{unitLabel} {page?.slideNumber ?? job.slideId.slice(0, 8)}</span><StatusBadge value={job.status ?? "Pending"} tone={jobState(job.status) === "completed" ? "success" : undefined} />{job.errorCode && <span className="text-destructive">{job.errorCode}</span>}{isRunning(job.status) && <Button size="sm" variant="ghost" disabled={cancelJob.isPending} onClick={() => cancelJob.mutate(job.jobId)}><X aria-hidden />Cancel</Button>}</div>;
            })}</div>}
            {batchQuery.error && <p role="alert" className="text-sm text-destructive">Could not update progress: {describeError(batchQuery.error)} <Button size="sm" variant="outline" onClick={() => void batchQuery.refetch()}>Retry</Button></p>}
          </div>}
          </div>
        </CardContent>
      </Card>}

      <AlertDialog open={showCancelPending} onOpenChange={setShowCancelPending}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancel audio version {selectedVersionNumber}?</AlertDialogTitle><AlertDialogDescription>This stops {selectedVersionJobs.length} unfinished {selectedVersionJobs.length === 1 ? unit : `${unit}s`} in the tracked generation. Completed audio and other versions remain available.</AlertDialogDescription></AlertDialogHeader>
          {cancelBatch.isPending && cancelProgress.total > 0 && <p role="status" className="text-sm">Cancelling {cancelProgress.done} of {cancelProgress.total} jobs…</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={cancelBatch.isPending}>Keep version</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={cancelBatch.isPending || !selectedVersionJobs.length} onClick={(event) => { event.preventDefault(); cancelBatch.mutate(); }}>{cancelBatch.isPending ? "Cancelling…" : `Cancel version ${selectedVersionNumber}`}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {jobId && jobQuery.data && (
        <Card><CardContent className="flex flex-wrap items-center gap-3"><LoaderCircle aria-hidden className={isRunning(jobQuery.data.status) ? "size-5 animate-spin text-primary" : "size-5 text-success"} /><p className="mr-auto font-bold">Current {unit} job</p><StatusBadge value={jobQuery.data.status ?? "Unknown"} /><p role="status" className="text-sm text-muted-foreground">Attempt {jobQuery.data.attemptCount}</p>{isRunning(jobQuery.data.status) ? <Button variant="outline" disabled={cancelJob.isPending} onClick={() => cancelJob.mutate(jobId)}><X aria-hidden />Cancel job</Button> : null}</CardContent></Card>
      )}

      <ReadState pending={materialQuery.isPending || slidesQuery.isPending || optionsQuery.isPending} error={materialQuery.error || slidesQuery.error || optionsQuery.error} retry={() => { void materialQuery.refetch(); void slidesQuery.refetch(); void optionsQuery.refetch(); }} />
      {!materialQuery.isPending && !materialQuery.error && !slidesQuery.isPending && !slidesQuery.error && !slides.length && (
        <Card><CardContent className="py-12 text-center"><Headphones aria-hidden className="mx-auto size-10 text-muted-foreground" /><p className="mt-4 font-bold">{unitLabel}s are not available yet</p><p className="mt-2 text-sm text-muted-foreground">{supportedFormat ? "This PDF may have been uploaded before page audio was available. Re-upload the same PDF from Edit learning material to extract its pages, then check again." : format ? `${format.toUpperCase()} does not currently support per-${unit} audio. PDF is the supported format.` : "The material format could not be checked. Please try again."}</p><Button className="mt-5" variant="outline" onClick={() => { void slidesQuery.refetch(); void materialQuery.refetch(); }}><RefreshCw aria-hidden />Check again</Button></CardContent></Card>
      )}

      {slides.length > 0 && selected && (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[10rem_minmax(0,1fr)_minmax(17rem,0.9fr)] 2xl:grid-cols-[13rem_minmax(0,1.2fr)_minmax(22rem,0.9fr)]">
          <Card className="min-w-0 lg:sticky lg:top-5">
            <CardHeader><CardTitle className="text-xl font-bold text-primary">{unitLabel}s</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form className="flex gap-2" onSubmit={jumpToPage}>
                <Label htmlFor="audio-page-number" className="sr-only">Go to {unit} number</Label>
                <Input id="audio-page-number" type="number" min={1} placeholder={`Go to ${unit} #`} value={pageNumberInput} onChange={(event) => setPageNumberInput(event.target.value)} />
                <Button type="submit" variant="outline" disabled={!pageNumberInput.trim()}>Go</Button>
              </form>
              <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto lg:max-h-[calc(100vh-15rem)] lg:grid-cols-2 2xl:grid-cols-3" aria-label={`${unitLabel} selection`}>
                {visibleSlides.map((slide) => (
                  <button key={slide.slideId} type="button" onClick={() => selectSlide(slide.slideId)} aria-label={`${unitLabel} ${slide.slideNumber}, ${slide.publishedAudioId ? "audio approved" : slide.extractionStatus ?? "pending"}`} aria-current={selected.slideId === slide.slideId ? "page" : undefined} title={`${unitLabel} ${slide.slideNumber} · ${slide.publishedAudioId ? "Audio approved" : slide.extractionStatus ?? "Pending"}`} className={`flex min-h-11 items-center justify-center gap-1 rounded-lg border text-sm font-semibold ${selected.slideId === slide.slideId ? "border-primary bg-accent text-primary" : "border-border bg-background"}`}>
                    {slide.slideNumber}{slide.publishedAudioId ? <CheckCircle2 aria-hidden className="size-3.5 text-success" /> : null}
                  </button>
                ))}
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-center font-medium text-foreground">Page {listPage + 1} of {pageCount}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" disabled={listPage === 0} onClick={() => setListPage((current) => current - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={listPage >= pageCount - 1} onClick={() => setListPage((current) => current + 1)}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-xl font-bold text-primary">{unitLabel} {selected.slideNumber} · Original</CardTitle>
              {fileQuery.data?.url && <a href={fileQuery.data.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">Open original PDF</a>}
            </CardHeader>
            <CardContent className="space-y-3">
              {supportedFormat && fileQuery.data?.url
                ? <iframe key={`${fileQuery.data.url}-${selected.slideNumber}`} title={`Original PDF page ${selected.slideNumber}`} src={`${fileQuery.data.url}#page=${selected.slideNumber}`} className="h-[min(68vh,54rem)] min-h-96 w-full rounded-lg border border-border bg-background" />
                : <div className="flex min-h-80 items-center justify-center rounded-lg border border-border bg-muted p-4 text-center text-sm text-muted-foreground">{supportedFormat ? "Original PDF preview is not available right now." : "Original file preview is not available for this format."}</div>}
              {supportedFormat && !fileQuery.data?.url && <p role="status" className="text-sm text-muted-foreground">{fileQuery.isPending ? "Loading the original PDF…" : "The original PDF could not be opened. You can still edit the narration text beside it."} {fileQuery.isError && <Button size="sm" variant="outline" onClick={() => void fileQuery.refetch()}>Retry</Button>}</p>}
              <p className="text-xs text-muted-foreground">Compare the original page with the narration text and audio beside it.</p>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-xl font-bold text-primary">Audio and narration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {wholePlayback && <div className="space-y-3">
                  <p className="text-sm font-semibold">Whole document · {unitLabel} {wholePlayback.pages[wholePlayback.index].number} of {wholePlayback.pages.length} playable {unit}s</p>
                  <audio key={wholePlayback.url} ref={wholeAudioRef} className="w-full" controls src={wholePlayback.url} onLoadedMetadata={(event) => setWholePlaybackTime({ current: event.currentTarget.currentTime, duration: event.currentTarget.duration })} onTimeUpdate={(event) => setWholePlaybackTime({ current: event.currentTarget.currentTime, duration: event.currentTarget.duration })} onEnded={() => void playNextPage()} onError={() => { stopWholePlayback(); toast({ title: "Playback stopped", description: "This audio file could not be played. Please try again.", variant: "error" }); }}>Your browser does not support audio playback.</audio>
                </div>}
                {!wholePlayback && pagePlayback?.slideId === selected.slideId && <div className="space-y-3">
                  <Label htmlFor="slide-audio">Audio preview · Version {pagePlayback.audio.version}</Label>
                  <audio key={pagePlayback.url} ref={pageAudioRef} id="slide-audio" className="w-full" controls autoPlay src={pagePlayback.url} onLoadedMetadata={(event) => setPagePlaybackTime({ current: event.currentTarget.currentTime, duration: event.currentTarget.duration })} onTimeUpdate={(event) => setPagePlaybackTime({ current: event.currentTarget.currentTime, duration: event.currentTarget.duration })}>Your browser does not support audio playback.</audio>
                </div>}
                {!wholePlayback && pagePlayback?.slideId !== selected.slideId && <p className="text-sm text-muted-foreground">Choose Preview on an audio version below to listen and follow the text here.</p>}
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <NarrationFollowAlong
                    value={ttsText}
                    audioText={wholePlayback?.pages[wholePlayback.index].text ?? (pagePlayback?.slideId === selected.slideId ? pagePlayback.audio.textSnapshot ?? undefined : undefined)}
                    currentTime={wholePlayback ? wholePlaybackTime.current : pagePlaybackTime.current}
                    duration={wholePlayback ? wholePlaybackTime.duration : pagePlaybackTime.duration}
                    pageLabel={`${unitLabel} ${selected.slideNumber}`}
                    onChange={changeNarrationText}
                    onPause={pauseNarration}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={!ttsText.trim() || saveText.isPending} onClick={() => saveText.mutate()}><Save aria-hidden />{saveText.isPending ? "Saving…" : "Save text"}</Button>
                    <Button disabled={!ttsText.trim() || !defaultVoice || generateOne.isPending} onClick={() => generateOne.mutate()}><Sparkles aria-hidden />{generateOne.isPending ? "Queuing…" : selected.audioVersions?.length ? "Regenerate audio" : "Generate audio"}</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Voice: {defaultVoice || "Not configured by the server"} · Speed: {defaultSpeed}× · Model: {optionsQuery.data?.modelId || "Not reported"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-xl font-bold text-primary">Audio versions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(selected.audioVersions ?? []).map((audio) => {
                  const trackedJob = jobs.find((job) => job.audioId === audio.audioId) ?? (jobQuery.data?.audioId === audio.audioId ? jobQuery.data : undefined);
                  const jobStatus = trackedJob?.status?.toUpperCase();
                  const displayStatus = jobStatus && ["CLAIMED", "PROCESSING", "RUNNING"].includes(jobStatus) ? "GENERATING" : jobStatus === "UPLOADING" ? "UPLOADING" : audio.status;
                  const active = activeAudioStatuses.has(displayStatus ?? "");
                  const stageProgress = displayStatus === "PENDING" ? 0 : displayStatus === "GENERATING" ? 33 : displayStatus === "UPLOADING" ? 67 : displayStatus === "READY_FOR_REVIEW" || displayStatus === "APPROVED" ? 100 : 0;
                  const agentOnline = agentsQuery.data?.some((agent) => !agent.revokedAt && new Date(agent.expiresAt).getTime() > now && now - new Date(agent.lastSeenAt).getTime() < 90_000);
                  return (
                    <div key={audio.audioId} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-center gap-3">
                      <div className="mr-auto min-w-0 flex-1">
                        <p className="font-bold">Version {audio.version}</p>
                        <p role="status" className={`mt-1 text-sm font-semibold ${displayStatus === "FAILED" ? "text-destructive" : displayStatus === "READY_FOR_REVIEW" || displayStatus === "APPROVED" ? "text-success-foreground" : "text-foreground"}`}>{audioStatusLabel(displayStatus)}{audio.durationSeconds ? ` · ${audio.durationSeconds.toFixed(1)} seconds` : ""}</p>
                      </div>
                      <Button variant="outline" disabled={!(["READY_FOR_REVIEW", "APPROVED"].includes(audio.status ?? "")) || play.isPending} onClick={() => play.mutate({ audio, slideId: selected.slideId })}><Play aria-hidden />Preview</Button>
                      <Button disabled={audio.status !== "READY_FOR_REVIEW" || selected.publishedAudioId === audio.audioId || approve.isPending} onClick={() => approve.mutate(audio)}>{selected.publishedAudioId === audio.audioId ? "Approved" : "Approve"}</Button>
                      </div>
                      <details className="group mt-3 border-t border-border pt-3">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">View progress details <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" /></summary>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex justify-between gap-2"><span className="font-medium">Stage progress</span><span role="status" className="font-semibold">{stageProgress}%</span></div>
                          <Progress value={stageProgress} aria-label={`Version ${audio.version} stage progress: ${stageProgress} percent`} className="h-2 bg-muted [&_[data-slot=progress-indicator]]:bg-success-border" />
                          <p className="text-xs text-muted-foreground">Based on completed stages. The audio app does not report progress within the creation stage.</p>
                          <ol className="grid gap-2 sm:grid-cols-3">
                            <li className="font-medium">1. Request queued</li>
                            <li className={stageProgress >= 33 ? "font-medium" : "text-muted-foreground"}>2. Creating audio</li>
                            <li className={stageProgress >= 67 ? "font-medium" : "text-muted-foreground"}>3. Saving audio</li>
                          </ol>
                          <p className="text-muted-foreground">Time since request: {elapsedLabel(audio.createdAt, now)}</p>
                          <p className="text-muted-foreground">Audio app: {agentsQuery.data ? agentOnline ? "Connected" : "Not recently connected" : "Checking connection"}</p>
                          {trackedJob && <p className="text-muted-foreground">Processing attempt: {trackedJob.attemptCount}</p>}
                          {displayStatus === "FAILED" && <p className="text-destructive">Audio could not be created. Check the audio app on your computer, then try again.</p>}
                          {active && <p className="text-muted-foreground">This status updates automatically while audio is being created.</p>}
                        </div>
                      </details>
                    </div>
                  );
                })}
                {!selected.audioVersions?.length && <p className="text-sm text-muted-foreground">No audio version has been generated for this {unit}.</p>}
                <Button variant="outline" size="sm" disabled={slidesQuery.isFetching} onClick={() => void slidesQuery.refetch()}><RefreshCw aria-hidden className={slidesQuery.isFetching ? "animate-spin" : undefined} />Refresh audio status</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
