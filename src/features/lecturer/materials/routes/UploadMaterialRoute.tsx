import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getMaterialTtsAgents, getMaterialTtsOptions, registerMaterialTtsAgent, revokeMaterialTtsAgent } from "@/api/materialTts";
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
  const [pairingOpen, setPairingOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [pairing, setPairing] = useState<{ agentId: string; token: string; expiresAt: string } | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!pairing) return;
    const timeout = window.setTimeout(() => setPairing(null), 120_000);
    return () => window.clearTimeout(timeout);
  }, [pairing]);
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
  const ttsOptions = useQuery({ queryKey: ["material-tts", "options"], queryFn: getMaterialTtsOptions });
  const registerDevice = useMutation({
    mutationFn: () => {
      const modelVersion = ttsOptions.data?.modelVersion;
      if (!modelVersion) throw new Error("Không lấy được phiên bản model từ hệ thống.");
      return registerMaterialTtsAgent(deviceName.trim(), modelVersion);
    },
    onSuccess: (registered) => {
      setPairing(registered);
      void queryClient.invalidateQueries({ queryKey: ["material-tts", "agents"] });
    },
    onError: (error) => toast({ title: "Không đăng ký được thiết bị", description: describeError(error) }),
  });
  const revokeDevice = useMutation({
    mutationFn: revokeMaterialTtsAgent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["material-tts", "agents"] });
      toast({ title: "Đã ngắt kết nối máy", description: "Thiết bị này không thể nhận thêm audio mới." });
    },
    onError: (error) => toast({ title: "Không ngắt được kết nối", description: describeError(error) }),
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
                  <h2 id="material-placement-title" className="font-bold text-foreground">Course placement</h2>
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
                      Có thiết bị đã đăng ký
                    </p>
                    <p className="mt-1 text-sm">
                      {activeAgents[0]?.deviceName || "Thiết bị Local TTS"} có token còn hiệu lực. Đăng ký chưa xác nhận ứng dụng đang chạy; hãy tạo một audio ngắn để kiểm tra.
                    </p>
                  </div>
                ) : (
                  <div role="status" className="rounded-xl bg-warning p-4 text-warning-foreground">
                    <p className="flex items-center gap-2 font-bold">
                      <WifiOff aria-hidden className="size-5" />
                      Chưa kết nối Local TTS
                    </p>
                    <p className="mt-1 text-sm">
                      Cài ứng dụng Windows và bộ model do trường cung cấp, sau đó đăng ký máy bên dưới. Bạn vẫn có thể upload tài liệu ngay bây giờ.
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
                <Button variant="outline" onClick={() => setPairingOpen(true)}>
                  Đăng ký máy tạo audio
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
              Nhận bộ cài và model từ trường, sau đó kết nối ứng dụng Windows bằng mã đăng ký một lần.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <ol className="space-y-4">
              {[
                ["Kiểm tra máy", "Máy Windows 10/11 64-bit có GPU NVIDIA và Internet."],
                ["Cài ứng dụng và model", "Nhận LearnAble-TTS-Setup.exe cùng bộ model đầy đủ từ trường. Cài ứng dụng rồi chọn thư mục model trong Settings."],
                ["Kết nối máy", "Chọn Đăng ký máy tạo audio trên web này, sau đó nhập Agent ID, device token và hạn dùng vào Pair Device trong ứng dụng."],
                ["Nghe thử", "Tạo audio cho một trang ngắn, nghe thử và duyệt trước khi tạo cả tài liệu."],
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
      <Dialog open={pairingOpen} onOpenChange={(open) => { setPairingOpen(open); if (!open) setPairing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kết nối máy tạo audio</DialogTitle>
            <DialogDescription>
              Mở LearnAble TTS Agent trên máy, chọn Pair Device. Thông tin đăng ký chỉ hiện trong hai phút.
            </DialogDescription>
          </DialogHeader>
          {pairing ? (
            <div className="space-y-3">
              <div><Label htmlFor="tts-agent-id">Agent ID</Label><Input id="tts-agent-id" className="mt-1" readOnly value={pairing.agentId} /></div>
              <div><Label htmlFor="tts-agent-expiry">Expires at (ISO 8601)</Label><Input id="tts-agent-expiry" className="mt-1" readOnly value={pairing.expiresAt} /></div>
              <div><Label htmlFor="tts-device-token">Device token</Label><Input id="tts-device-token" className="mt-1" type="password" readOnly value={pairing.token} /></div>
              <p className="text-sm text-muted-foreground">Dán cả ba thông tin vào Pair Device. Không gửi token cho người khác; sau khi sao chép, token sẽ ẩn khỏi trang.</p>
              {pairing.token ? <Button onClick={async () => {
                try {
                  await navigator.clipboard.writeText(pairing.token);
                  setPairing({ ...pairing, token: "" });
                  toast({ title: "Đã sao chép token", description: "Dán ngay vào ứng dụng LearnAble TTS Agent." });
                } catch {
                  toast({ title: "Không sao chép được", description: "Cho phép trang truy cập clipboard rồi thử lại." });
                }
              }}>Sao chép token một lần</Button> : <p role="status" className="text-sm text-success-foreground">Đã sao chép token. Hãy dán vào ứng dụng trước khi đóng cửa sổ này.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div><Label htmlFor="tts-device-name">Tên máy</Label><Input id="tts-device-name" className="mt-1" maxLength={100} value={deviceName} onChange={(event) => setDeviceName(event.target.value)} placeholder="Ví dụ: Laptop phòng giảng viên" /></div>
              <p className="text-sm text-muted-foreground">Mã mới chỉ dùng với API mà ứng dụng Windows và trang web này cùng kết nối.</p>
              <Button disabled={!deviceName.trim() || !ttsOptions.data?.modelVersion || registerDevice.isPending} onClick={() => registerDevice.mutate()}>
                {registerDevice.isPending ? "Đang đăng ký…" : "Đăng ký máy"}
              </Button>
              {ttsOptions.error ? <p role="alert" className="text-sm text-destructive">Chưa lấy được cấu hình TTS. Tải lại trang rồi thử lại.</p> : null}
            </div>
          )}
          {activeAgents.length > 0 ? (
            <section className="space-y-2 border-t pt-4" aria-label="Máy đã đăng ký">
              <h3 className="font-semibold">Máy đã đăng ký</h3>
              {activeAgents.map((agent) => (
                <div key={agent.agentId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <span className="text-sm">{agent.deviceName || "Thiết bị Local TTS"}</span>
                  <Button variant="outline" size="sm" disabled={revokeDevice.isPending} onClick={() => revokeDevice.mutate(agent.agentId)}>Ngắt kết nối</Button>
                </div>
              ))}
            </section>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
