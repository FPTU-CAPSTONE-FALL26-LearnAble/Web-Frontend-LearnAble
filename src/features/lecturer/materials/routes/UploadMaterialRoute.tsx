import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
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
import { getAgentStatus } from "@/features/lecturer/materials/agentStatus";
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
  const [guideLanguage, setGuideLanguage] = useState<"vi" | "en">("vi");
  const [pairingOpen, setPairingOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
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
  const { registered: activeAgents, online: agentOnline } = getAgentStatus(agents.data ?? []);
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
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
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
                className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-secondary p-6 text-center"
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
        </div>
        <aside aria-label="Material processing" className="min-w-0 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorCog aria-hidden className="size-5 text-primary" />
                Create audio on your computer
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Local TTS uses your NVIDIA GPU to generate speech. You can upload materials even when the agent is not installed.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.isPending ? (
                  <p role="status" className="flex items-center gap-2 text-sm">
                    <RefreshCw aria-hidden className="size-4 animate-spin text-primary" />
                    Checking Local TTS agent…
                  </p>
                ) : agents.isError ? (
                  <div role="status" className="rounded-xl bg-warning p-4 text-warning-foreground">
                    Could not check the audio device status. Refresh the page and try again.
                  </div>
                ) : activeAgents.length > 0 ? (
                  <div role="status" className={agentOnline ? "rounded-xl bg-success p-4 text-success-foreground" : "rounded-xl bg-warning p-4 text-warning-foreground"}>
                    <p className="flex items-center gap-2 font-bold">
                      {agentOnline ? <CheckCircle2 aria-hidden className="size-5" /> : <WifiOff aria-hidden className="size-5" />}
                      {agentOnline ? "Audio device is online" : "Device paired · status unknown"}
                    </p>
                    <p className="mt-1 text-sm">
                      {activeAgents[0]?.deviceName || "Local TTS device"} is still registered. {agentOnline ? "Generate a short audio sample to test it." : "The app has not received a recent device heartbeat. Audio generation may still be running; check the audio job status before pairing again."}
                    </p>
                  </div>
                ) : (
                  <div role="status" className="rounded-xl bg-warning p-4 text-warning-foreground">
                    <p className="flex items-center gap-2 font-bold">
                      <WifiOff aria-hidden className="size-5" />
                      Local TTS is not connected
                    </p>
                    <p className="mt-1 text-sm">
                      Install the Windows app and the model supplied by your school, then pair your device from the sidebar. You can still upload materials now.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => setGuideOpen(true)}>
                    <CircleHelp aria-hidden />
                    Setup guide
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
          <Card className="border-border shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-extrabold text-primary">
                Academic information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="min-w-0 space-y-6">
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
                </div>
                <fieldset className="min-w-0 space-y-4 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
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
              </div>
            </CardContent>
          </Card>
      </div>
      <UnsavedChangesDialog dirty={dirty} />
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
              <DialogTitle variant="accent">{guideLanguage === "en" ? "Set up Local TTS on your computer" : "Cài Local TTS trên máy của bạn"}</DialogTitle>
              <div role="group" aria-label="Guide language" className="flex gap-1">
                <Button size="sm" variant={guideLanguage === "vi" ? "default" : "outline"} aria-pressed={guideLanguage === "vi"} onClick={() => setGuideLanguage("vi")}>Tiếng Việt</Button>
                <Button size="sm" variant={guideLanguage === "en" ? "default" : "outline"} aria-pressed={guideLanguage === "en"} onClick={() => setGuideLanguage("en")}>English</Button>
              </div>
            </div>
            <DialogDescription>
              {guideLanguage === "en" ? "Install the app once, pair your device, and listen to a short sample before generating audio for a whole document." : "Cài ứng dụng một lần, kết nối thiết bị rồi nghe thử trước khi tạo audio cho cả tài liệu."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 border-y py-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <ol className="space-y-4" aria-label={guideLanguage === "en" ? "Four setup steps" : "Bốn bước cài đặt"}>
              {(guideLanguage === "en" ? [
                ["Check your computer", "Windows 10/11 64-bit, an NVIDIA GPU, internet access, and about 15 GB of free space."],
                ["Install the app and model", "Download the handoff package and run LearnAble-TTS-Setup.exe. In Settings, select the extracted model folder."],
                ["Pair your device", "Register your computer on this page. Paste the Agent ID, token, and expiry into Pair Device in the app."],
                ["Listen to a sample", "Generate audio for one short page. Listen and approve it before processing a whole document."],
              ] : [
                ["Kiểm tra máy", "Windows 10/11 64-bit, GPU NVIDIA, Internet và khoảng 15 GB dung lượng trống."],
                ["Cài ứng dụng và model", "Tải gói bàn giao, chạy LearnAble-TTS-Setup.exe. Trong Settings, chọn thư mục model đã giải nén."],
                ["Kết nối máy", "Đăng ký máy trên trang này. Dán Agent ID, token và hạn dùng vào Pair Device trong ứng dụng."],
                ["Nghe thử", "Tạo audio cho một trang ngắn, nghe và duyệt trước khi tạo cả tài liệu."],
              ]).map(([title, description], index) => (
                <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                  <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{index + 1}</span>
                  <div><h3 className="font-bold leading-8">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>
                </li>
              ))}
            </ol>
            <aside className="space-y-4 rounded-xl bg-muted p-4" aria-label={guideLanguage === "en" ? "Settings reference" : "Thông tin cần điền trong ứng dụng"}>
              <div>
                <h3 className="font-bold">{guideLanguage === "en" ? "Enter in Settings" : "Điền trong Settings"}</h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <div><dt className="font-semibold">API URL</dt><dd className="break-all text-muted-foreground">https://api.learnable.site/api/v1</dd></div>
                  <div><dt className="font-semibold">Verified model folder</dt><dd className="text-muted-foreground">{guideLanguage === "en" ? "Choose the model folder containing manifest.json and manifest.sha256." : "Chọn thư mục model có manifest.json và manifest.sha256."}</dd></div>
                  <div><dt className="font-semibold">Web dashboard URL</dt><dd className="text-muted-foreground">{guideLanguage === "en" ? "You can leave this blank when testing on localhost." : "Có thể để trống khi thử trên localhost."}</dd></div>
                </dl>
              </div>
              <p className="border-t pt-3 text-sm text-muted-foreground">{guideLanguage === "en" ? "The app runs in the system tray. Click ^ beside the clock to find LearnAble TTS Agent." : "Ứng dụng chạy ở khay hệ thống. Bấm dấu ^ cạnh đồng hồ để mở biểu tượng LearnAble TTS Agent."}</p>
              <a className="inline-block text-sm font-semibold text-primary underline underline-offset-4" href={guideLanguage === "en" ? "/guides/local-tts-model/README.en.md" : "/guides/local-tts-model/README.md"} download={guideLanguage === "en" ? "README-Local-TTS-English.md" : "README-Local-TTS.md"}>{guideLanguage === "en" ? "Download README for offline use" : "Tải README để xem ngoại tuyến"}</a>
            </aside>
          </div>
          <p className="text-sm text-muted-foreground">{guideLanguage === "en" ? "If audio is not generated, check that the app is running and uses the same Backend as this website. Send the error and GPU name to support." : "Nếu audio chưa tạo được, kiểm tra ứng dụng đang chạy và dùng cùng Backend với trang này. Sau đó gửi thông báo lỗi và tên GPU cho bộ phận kỹ thuật."}</p>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" asChild>
              <a href="https://drive.google.com/file/d/1aeYMl55FAF7NPWPkIkz5XkdX0BImHzIE/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                {guideLanguage === "en" ? "Download installer" : "Tải bộ cài"}
              </a>
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href={guideLanguage === "en" ? "/guides/local-tts-lecturer-guide-en.html" : "/guides/local-tts-lecturer-guide.html"} target="_blank" rel="noreferrer">{guideLanguage === "en" ? "Full guide" : "Hướng dẫn chi tiết"}</a>
              </Button>
              <Button onClick={() => { setGuideOpen(false); setPairingOpen(true); }}>{guideLanguage === "en" ? "Pair device" : "Đăng ký máy"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={pairingOpen || searchParams.get("pair") === "1"} onOpenChange={(open) => {
        setPairingOpen(open);
        if (!open) {
          setPairing(null);
          if (searchParams.has("pair")) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("pair");
            setSearchParams(nextParams, { replace: true });
          }
        }
      }}>
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
