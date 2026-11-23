import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { describeError } from "@/app/providers";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  CloudUpload,
  ExternalLink,
  FileText,
  MonitorCog,
  RefreshCw,
  Save,
  Trash2,
  WifiOff,
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { ChoiceField, TextField } from "@/features/lecturer/questions/components/QuestionFields";
import { useAcademicOptions } from "@/features/lecturer/shared/api/useLecturerData";
import {
  Breadcrumb,
  notConnected,
  PageHeading,
  ReadState,
  unavailable,
} from "@/features/lecturer/shared/components/Workbench";
import { UnsavedChangesDialog } from "@/features/lecturer/shared/components/UnsavedChangesDialog";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { formatFileSize } from "./LearningMaterialsRoute";
import { createLearningMaterial } from "@/api/lecturer";
import { toast } from "@/shared/ui/primitives/toast";
import { useExpiredSession } from "@/features/auth/hooks/useExpiredSession";
import { getMaterialTtsAgents } from "@/api/materialTts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";

export const supportedMaterialExtensions = [
  "pdf",
  "ppt",
  "pptx",
  "doc",
  "docx",
  "txt",
  "mp3",
  "wav",
  "png",
  "jpg",
  "jpeg",
  "webp",
];
export function validateMaterialFile(file: File) {
  return supportedMaterialExtensions.includes(
    file.name.split(".").pop()?.toLowerCase() ?? "",
  )
    ? ""
    : "Choose a PDF, PPT, PPTX, DOC, DOCX, text, image, or audio file.";
}
export function UploadMaterialRoute() {
  useRouteAnnouncer("Upload Learning Material", "Upload Learning Material");
  const [file, setFile] = useState<File>();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [language, setLanguage] = useState("English");
  const [objectives, setObjectives] = useState(["", "", ""]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [uploadedMaterialId, setUploadedMaterialId] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    if (uploadedMaterialId) void navigate(`/lecturer/materials/${uploadedMaterialId}/audio`);
  }, [navigate, uploadedMaterialId]);
  const input = useRef<HTMLInputElement>(null);
  const academic = useAcademicOptions(subjectId || undefined);
  const agents = useQuery({
    queryKey: ["material-tts", "agents"],
    queryFn: getMaterialTtsAgents,
    retry: 1,
    refetchInterval: 30_000,
    meta: { silent: true },
  });
  const activeAgents = (agents.data ?? []).filter(
    (agent) => !agent.revokedAt && new Date(agent.expiresAt) > new Date(),
  );
  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No file selected");
      return createLearningMaterial({
        topicId,
        title: title.trim(),
        description: [
          `Language: ${language}`,
          ...objectives.filter(Boolean).map((objective) => `Objective: ${objective}`),
        ].join("\n"),
        file,
      });
    },
    onSuccess: (material) => {
      toast({
        title: "Material uploaded successfully",
        description: "The file was saved. Review the extracted text before generating audio.",
        variant: "success",
      });
      setUploadedMaterialId(material.materialId);
    },
    onError: (uploadError) => toast({
      title: "Material could not be uploaded",
      description: describeError(uploadError),
      variant: "error",
    }),
  });
  useExpiredSession(upload.error);
  const dirty = !uploadedMaterialId && (
    !!file ||
    !!title ||
    !!subjectId ||
    !!topicId ||
    objectives.some(Boolean) ||
    language !== "English");
  const choose = (next?: File) => {
    if (!next) return;
    const problem = validateMaterialFile(next);
    if (problem) {
      toast({ title: "Unsupported material file", description: problem, variant: "error" });
      return;
    }
    setFile(next);
    if (!title)
      setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
  };
  const review = () => {
    if (!file || !title.trim() || !subjectId || !topicId) {
      toast({
        title: "Material information is incomplete",
        description: "Select a file, enter a title, and choose a course and topic before continuing.",
        variant: "error",
      });
      return;
    }
    upload.mutate();
  };
  return (
    <div className="space-y-6">
      <Breadcrumb
        parent="Learning Materials"
        path="/lecturer/materials"
        current="Upload material"
        currentClassName="font-semibold text-primary"
      />
      <PageHeading title="Upload Learning Material">
        <Button variant="outline" asChild>
          <Link to="/lecturer/materials">Back to list</Link>
        </Button>
        <Button variant="outline" onClick={() => notConnected("Save material draft")}>
          <Save aria-hidden />
          Save draft
        </Button>
        <Button disabled={upload.isPending} onClick={review}>
          {upload.isPending ? "Uploading…" : "Upload material"}
          <ArrowRight aria-hidden />
        </Button>
      </PageHeading>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-xl font-extrabold text-primary">
                Material information & file
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                role="presentation"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  choose(event.dataTransfer.files[0]);
                }}
                className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-secondary p-6 text-center"
              >
                <CloudUpload aria-hidden className="size-12 text-primary" />
                <Button onClick={() => input.current?.click()}>
                  <CloudUpload aria-hidden />
                  Choose a file from your computer
                </Button>
                <p className="text-sm text-muted-foreground">
                  Or drag and drop a lecture resource here.
                </p>
                <p className="text-xs font-bold">
                  <span className="text-destructive">PDF</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-chart-4">PPTX</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-primary">IMAGE / AUDIO</span>
                </p>
                <Label htmlFor="material-file" className="sr-only">
                  Material file
                </Label>
                <Input
                  ref={input}
                  id="material-file"
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.mp3,.wav,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  onChange={(event) => choose(event.target.files?.[0])}
                />
              </div>
            </CardContent>
          </Card>
          {file && (
            <section
              aria-label="Selected file"
              className="rounded-2xl border border-border p-5"
            >
              <div className="flex items-start gap-3">
                <FileText
                  aria-hidden
                  className="size-9 shrink-0 text-secondary"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-all font-bold">{file.name}</p>
                  <p
                    role="status"
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    Selected locally · Not uploaded
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove selected file"
                  onClick={() => {
                    setFile(undefined);
                    if (input.current) input.current.value = "";
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">File size</dt>
                  <dd className="mt-1 font-bold">
                    {formatFileSize(file.size)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Page count</dt>
                  <dd className="mt-1 text-sm font-bold">{unavailable}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Upload status
                  </dt>
                  <dd className="mt-1 font-bold">Not started</dd>
                </div>
              </dl>
            </section>
          )}
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-xl font-extrabold text-primary">
                Academic information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-4" aria-labelledby="material-placement-title">
                <div>
                  <h3 id="material-placement-title" className="font-bold text-foreground">Course placement</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Choose where students will find this material.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChoiceField
                    label="Course (required)"
                    value={subjectId}
                    options={(academic.subjects.data?.items ?? []).map((s) => ({
                      value: s.subjectId,
                      label: `${s.subjectCode} · ${s.subjectNameEn ?? unavailable}`,
                    }))}
                    onChange={(value) => {
                      setSubjectId(value);
                      setTopicId("");
                    }}
                  />
                  <ChoiceField
                    label="Topic (required)"
                    value={topicId}
                    options={(academic.topics.data?.items ?? []).map((t) => ({
                      value: t.topicId,
                      label: t.topicName,
                    }))}
                    onChange={setTopicId}
                    disabled={!subjectId}
                  />
                </div>
                <ReadState
                  pending={academic.subjects.isPending || academic.topics.isPending}
                  error={academic.subjects.error || academic.topics.error}
                  retry={() => {
                    void academic.subjects.refetch();
                    void academic.topics.refetch();
                  }}
                />
              </section>
              <section className="space-y-4 border-t border-border pt-5" aria-labelledby="material-details-title">
                <h3 id="material-details-title" className="font-bold text-foreground">Material details</h3>
                <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <TextField label="Material title (required)" value={title} onChange={setTitle} />
                  <ChoiceField
                    label="Material language"
                    value={language}
                    options={["English", "Vietnamese", "Bilingual"]}
                    onChange={setLanguage}
                  />
                </div>
              </section>
              <fieldset className="space-y-4 border-t border-border pt-5">
                <legend className="text-base font-bold">Learning objectives</legend>
                <p className="text-sm text-muted-foreground">Optional. Add up to three goals students should achieve.</p>
                {objectives.map((value, index) => (
                  <TextField
                    key={index}
                    label={`Objective ${index + 1}`}
                    value={value}
                    onChange={(next) =>
                      setObjectives((old) =>
                        old.map((item, position) =>
                          position === index ? next : item,
                        ),
                      )
                    }
                  />
                ))}
              </fieldset>
            </CardContent>
          </Card>
        </div>
        <aside aria-label="Material processing" className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorCog aria-hidden className="size-5 text-primary" />
                Tạo audio bằng máy của bạn
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Local TTS dùng GPU NVIDIA trên máy giảng viên để tạo giọng đọc. Việc upload tài liệu vẫn hoạt động khi chưa cài agent.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.isPending ? (
                  <p role="status" className="flex items-center gap-2 text-sm">
                    <RefreshCw aria-hidden className="size-4 animate-spin text-primary" />
                    Đang kiểm tra ứng dụng Local TTS…
                  </p>
                ) : activeAgents.length > 0 ? (
                  <div role="status" className="rounded-xl bg-success p-4 text-success-foreground">
                    <p className="flex items-center gap-2 font-bold">
                      <CheckCircle2 aria-hidden className="size-5" />
                      Thiết bị đã ghép với LearnAble
                    </p>
                    <p className="mt-1 text-sm">
                      {activeAgents[0]?.deviceName || "Thiết bị Local TTS"} có token còn hiệu lực. Hãy giữ agent chạy và tạo một audio ngắn để kiểm tra model trước khi dùng thật.
                    </p>
                  </div>
                ) : (
                  <div role="status" className="rounded-xl bg-warning p-4 text-warning-foreground">
                    <p className="flex items-center gap-2 font-bold">
                      <WifiOff aria-hidden className="size-5" />
                      Chưa kết nối Local TTS
                    </p>
                    <p className="mt-1 text-sm">
                      Nhờ bộ phận kỹ thuật cài agent, SDK và model, sau đó ghép máy với tài khoản Lecturer. Bạn vẫn có thể upload tài liệu ngay bây giờ.
                    </p>
                  </div>
                )}
                {agents.error ? (
                  <p role="alert" className="text-sm text-destructive">
                    Không thể kiểm tra kết nối lúc này. Hãy tải lại trang hoặc tiếp tục upload tài liệu.
                  </p>
                ) : null}
                <Button variant="outline" onClick={() => setGuideOpen(true)}>
                  <CircleHelp aria-hidden />
                  Hướng dẫn cài đặt
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      <UnsavedChangesDialog dirty={dirty} />
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thiết lập Local TTS trên máy giảng viên</DialogTitle>
            <DialogDescription>
              Hiện cần bộ phận kỹ thuật hỗ trợ cài agent và model. Bạn có thể tiếp tục upload tài liệu trong khi chờ thiết lập.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <ol className="space-y-4">
              {[
                ["Kiểm tra máy", "Agent hiện cần GPU NVIDIA hỗ trợ CUDA; Windows 11 64-bit được khuyến nghị."],
                ["Nhận và tải gói model", "Nhận URL manifest và mã SHA-256 từ trường. Gói model phải có base, adapter đã fine-tune, codec và giọng tham chiếu; một file adapter riêng không đủ."],
                ["Ghép máy", "Kỹ thuật viên chạy lệnh pair bằng tài khoản Lecturer của bạn. Hãy tự nhập mật khẩu vào lời nhắc ẩn; không gửi mật khẩu cho người khác."],
                ["Kiểm tra audio thật", "Chạy agent với model đã cài, upload một tài liệu ngắn, tạo audio và nghe thử trước khi dùng cho tài liệu thật."],
              ].map(([title, description], index) => (
                <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                  <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{index + 1}</span>
                  <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
                </li>
              ))}
            </ol>
            <section aria-labelledby="tts-help-title" className="rounded-xl bg-muted p-4">
              <h3 id="tts-help-title" className="font-bold">Nếu chưa tạo được audio</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Gửi thông báo lỗi và cấu hình GPU cho bộ phận kỹ thuật. Trạng thái thiết bị đã ghép không đảm bảo agent đang chạy hoặc model đã tạo được tiếng.
              </p>
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" asChild>
              <a href="/guides/local-tts-model/README.md" download="README-Local-TTS.md">
                Tải README
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/guides/local-tts-lecturer-guide.html" target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden />
                Mở hướng dẫn đầy đủ
              </a>
            </Button>
            <Button onClick={() => setGuideOpen(false)}>Đã hiểu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
