import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import {
  downloadProctoringSegmentContent,
  getAttemptRecordings,
  getProctoringPlayback,
} from "@/api/proctoring";
import { describeError } from "@/app/providers";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { toast } from "@/shared/ui/primitives/toast";

export function AttemptRecordingsPanel({ attemptId }: { attemptId: string }) {
  const recordings = useQuery({
    queryKey: ["attempt-recordings", attemptId],
    queryFn: () => getAttemptRecordings(attemptId),
  });
  const [playing, setPlaying] = useState<{ key: string; url: string } | null>(
    null,
  );
  useEffect(
    () => () => {
      if (playing?.url.startsWith("blob:")) URL.revokeObjectURL(playing.url);
    },
    [playing],
  );
  const play = async (recordingId: string, sequenceNumber: number) => {
    try {
      const playback = await getProctoringPlayback(recordingId, sequenceNumber);
      let url = playback.url ?? "";
      if (playback.requiresAuthentication || !url) {
        const content = await downloadProctoringSegmentContent(
          recordingId,
          sequenceNumber,
        );
        url = URL.createObjectURL(content.blob);
      }
      if (!url) throw new Error("The Backend did not return a playback URL.");
      setPlaying({ key: `${recordingId}-${sequenceNumber}`, url });
    } catch (error) {
      toast({
        title: "Recording could not be played",
        description: describeError(error),
        variant: "error",
      });
    }
  };
  return (
    <section className="space-y-4 rounded-xl border border-border p-5">
      <div className="flex items-center gap-2">
        <Camera className="size-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">Proctoring recordings</h2>
      </div>
      {recordings.isPending ? (
        <div
          role="status"
          aria-label="Loading recordings"
          className="h-20 animate-pulse rounded-lg bg-muted"
        />
      ) : null}
      {recordings.isError ? (
        <p role="alert" className="text-sm text-destructive">
          The recordings could not be loaded. {describeError(recordings.error)}
        </p>
      ) : null}
      {recordings.isSuccess && !recordings.data.items.length ? (
        <p className="text-sm text-muted-foreground">
          No recording has been uploaded for this attempt.
        </p>
      ) : null}
      <ul className="space-y-3">
        {(recordings.data?.items ?? []).map((recording) => (
          <li
            key={recording.recordingId}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                Started {new Date(recording.startedAt).toLocaleString()}
              </p>
              <Badge variant="outline">{recording.status ?? "Unknown"}</Badge>
            </div>
            {recording.missingSequenceNumbers.length ? (
              <p className="mt-2 text-sm text-warning-foreground">
                Missing segments: {recording.missingSequenceNumbers.join(", ")}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {(recording.segments?.items ?? []).map((segment) => (
                <Button
                  key={segment.sequenceNumber}
                  size="sm"
                  variant="outline"
                  disabled={
                    segment.status !== "Ready" && !segment.canDeleteLocalFile
                  }
                  onClick={() =>
                    void play(recording.recordingId, segment.sequenceNumber)
                  }
                >
                  Play segment {segment.sequenceNumber}
                </Button>
              ))}
            </div>
            {playing?.key.startsWith(`${recording.recordingId}-`) ? (
              <video
                className="mt-4 aspect-video w-full rounded-lg bg-foreground"
                controls
                playsInline
                src={playing.url}
              >
                <track
                  kind="captions"
                  src="data:text/vtt,WEBVTT"
                  srcLang="en"
                  label="No captions available"
                  default
                />
                Your browser cannot play this proctoring video.
              </video>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
