import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  KeyRound,
  Keyboard,
  LogOut,
  Printer,
  Square,
  UserCheck,
  Volume2,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Separator } from "@/shared/ui/primitives/separator";
import { BrandIdentity } from "@/components/BrandIdentity";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { toast } from "@/shared/ui/primitives/sonner";

export function ResultReceiptDemoRoute() {
  useRouteAnnouncer(
    "Xác nhận Nộp bài Thành công — LearnAble Secure Client",
    "Bài thi đã được nộp thành công",
  );
  const navigate = useNavigate();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [copied, setCopied] = useState(false);

  const receiptCode = "FPT-EXAM-SWE201-984A-21C0-8D3E-SHA256";
  const receiptText =
    "Thông báo: Bạn đã nộp bài thi thành công. Bài thi môn SWE201 Kiến trúc phần mềm của thí sinh Lê Nguyễn Nam Kha, mã số sinh viên SE180291, phòng FPTU-EXAM-902 đã được mã hóa an toàn và gửi về Hội đồng Khảo thí Đại học FPT lúc 10 giờ 24 phút 18 giây. Tổng thời gian làm bài là 38 phút 20 giây trên 60 phút quy định. Bạn đã hoàn tất 20 trên 20 câu hỏi. Nhấn phím Enter để đăng xuất an toàn.";

  const speakReceipt = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(receiptText);
      utterance.lang = "vi-VN";
      utterance.rate = playbackRate;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      announce("Đang phát âm thanh biên nhận nộp bài.");
    } else {
      toast.info("Trình duyệt không hỗ trợ tổng hợp giọng nói.");
    }
  }, [playbackRate, receiptText]);

  const stopSpeech = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      announce("Đã dừng đọc biên nhận.");
    }
  }, []);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(receiptCode);
    setCopied(true);
    toast.success("Đã sao chép mã biên lai điện tử vào clipboard!");
    announce("Đã sao chép mã biên lai điện tử.");
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExit = useCallback(() => {
    stopSpeech();
    announce("Đang tiến hành đăng xuất an toàn và thoát khỏi phần mềm.");
    toast.success("Đã đăng xuất an toàn khỏi chế độ khảo thí!");
    setTimeout(() => {
      navigate("/login");
    }, 1200);
  }, [navigate, stopSpeech]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (isSpeaking) {
          stopSpeech();
        } else {
          speakReceipt();
        }
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleExit();
      }
      if (e.ctrlKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking, speakReceipt, stopSpeech, handleExit]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* 1. GEIST-STYLE MINIMAL HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 px-4 py-2.5 backdrop-blur-md print:hidden sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandIdentity compact />
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-border/60 bg-muted/50 px-2.5 py-0.5 font-mono text-sm font-semibold text-muted-foreground"
              >
                Kiosk Lock v4.2
              </Badge>
              <span className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground sm:inline-flex">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Đã kết thúc bài thi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm font-medium text-muted-foreground">
            <span className="font-semibold text-foreground">Lê Nguyễn Nam Kha</span>
            <span className="text-border">•</span>
            <span className="font-mono">SE180291</span>
            <span className="text-border">•</span>
            <span className="font-mono">FPTU-EXAM-902</span>
          </div>
        </div>
      </header>

      {/* 2. GEIST AUDIO ASSISTIVE TOOLBAR */}
      <section
        aria-label="Bảng điều khiển giọng đọc trợ năng"
        className="w-full border-b border-border/60 bg-muted/20 px-4 py-2 text-sm print:hidden sm:px-6"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isSpeaking ? "secondary" : "default"}
              size="sm"
              onClick={speakReceipt}
              className="h-9 gap-2 rounded-md font-medium text-sm shadow-xs"
              aria-label="Phát âm thanh đọc toàn bộ biên nhận nộp bài thi (Phím tắt Space)"
            >
              <Volume2 aria-hidden className="size-4" />
              <span>{isSpeaking ? "Đang phát âm thanh…" : "Phát âm thanh đọc toàn bộ biên nhận (Space)"}</span>
            </Button>

            {isSpeaking ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={stopSpeech}
                className="h-9 gap-1 rounded-md text-sm font-medium"
                aria-label="Dừng phát âm thanh biên nhận"
              >
                <Square aria-hidden className="size-3.5 fill-current" />
                <span>Dừng đọc</span>
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div
              aria-label="Tốc độ đọc giọng nói trợ năng"
              className="flex items-center gap-0.5 rounded-md border border-border/80 bg-background p-1 text-sm"
              role="group"
            >
              <span className="px-1.5 font-medium text-muted-foreground">Tốc độ:</span>
              {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  aria-pressed={playbackRate === rate}
                  className={`rounded px-1.5 py-0.5 font-mono font-medium transition-all ${
                    playbackRate === rate
                      ? "bg-foreground text-background shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sẵn sàng</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN GEIST RECEIPT CARD */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center p-4 py-8 sm:p-6 sm:py-10">
        <Card className="w-full overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all print:border print:border-black print:shadow-none">
          {/* TOP STATUS STRIP */}
          <CardHeader className="border-b border-border/60 bg-secondary/20 px-6 py-8 text-center sm:px-8">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs">
              <CheckCircle2 aria-hidden className="size-7" />
            </div>

            <div className="flex justify-center mb-3">
              <Badge
                variant="outline"
                className="rounded-full border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-sm font-semibold uppercase text-emerald-800 dark:text-emerald-300"
              >
                ✓ Xác nhận nộp bài hoàn tất
              </Badge>
            </div>

            <CardTitle className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              Bài thi đã được nộp thành công
            </CardTitle>

            <CardDescription className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Bài thi của bạn đã được mã hóa an toàn (SHA-256) và gửi bảo mật về cơ sở dữ liệu{" "}
              <strong className="font-semibold text-foreground">Hội đồng Khảo thí Đại học FPT</strong>.
            </CardDescription>

            <div className="mx-auto mt-4 inline-flex max-w-lg items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-3.5 py-2 text-left text-sm text-muted-foreground">
              <Lock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="leading-normal">
                <strong className="font-semibold text-foreground">Quy chế bảo mật:</strong> Điểm thi chính thức sẽ được Phòng Khảo thí công bố sau khi hoàn tất đối soát &amp; phúc khảo.
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6 sm:p-8">
            {/* 2-COLUMN METRICS GRID */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* BLOCK 1: TIME & SESSION */}
              <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-secondary/30 p-4 transition-colors hover:border-border">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2.5 text-sm font-semibold uppercase text-muted-foreground">
                  <Clock aria-hidden className="size-4 text-primary" />
                  <span>Thời gian &amp; Ca thi</span>
                </div>

                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Học phần / Môn thi</span>
                    <p className="font-semibold text-foreground text-base">SWE201 – Kiến Trúc Phần Mềm</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Giờ nộp chính xác</span>
                      <p className="font-mono text-base font-semibold tabular-nums text-foreground">10:24:18 AM</p>
                      <span className="text-sm text-muted-foreground">24/10/2024</span>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Thời gian làm bài</span>
                      <p className="font-mono text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        38:20
                      </p>
                      <span className="text-sm text-muted-foreground">Quy định: 60 phút</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5 text-sm">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium text-sm">
                    ✓ Nộp đúng hạn
                  </Badge>
                </div>
              </div>

              {/* BLOCK 2: CANDIDATE & PROGRESS */}
              <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-secondary/30 p-4 transition-colors hover:border-border">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2.5 text-sm font-semibold uppercase text-muted-foreground">
                  <UserCheck aria-hidden className="size-4 text-primary" />
                  <span>Thí sinh &amp; Tiến độ câu hỏi</span>
                </div>

                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Thí sinh</span>
                    <p className="font-semibold text-foreground text-base">
                      Lê Nguyễn Nam Kha <span className="font-mono font-semibold text-primary">(SE180291)</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Phòng thi</span>
                      <p className="font-mono text-base font-semibold tabular-nums text-foreground">FPTU-EXAM-902</p>
                      <span className="text-sm text-muted-foreground">Hòa Lạc Campus</span>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Tiến độ hoàn tất</span>
                      <p className="font-mono text-base font-semibold tabular-nums text-foreground">20 / 20 câu</p>
                      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">100% hoàn thành</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2.5 text-sm">
                  <span className="text-muted-foreground">Cán bộ coi thi:</span>
                  <span className="font-mono font-medium text-foreground">CBCT-01, CBCT-02</span>
                </div>
              </div>
            </div>

            {/* BLOCK 3: CRYPTOGRAPHIC VERIFICATION BOX */}
            <div className="rounded-lg border border-border/80 bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                  <KeyRound aria-hidden className="size-4 text-primary" />
                  <span>Mã biên lai điện tử bảo mật (SHA-256 Hash)</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyHash}
                  className="h-8 gap-1.5 px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check aria-hidden className="size-3.5 text-emerald-600" /> : <Copy aria-hidden className="size-3.5" />}
                  <span>{copied ? "Đã sao chép" : "Sao chép mã"}</span>
                </Button>
              </div>

              <div className="rounded-md border border-border/70 bg-secondary/50 p-3 font-mono text-sm font-semibold text-foreground break-all">
                {receiptCode}
              </div>
            </div>

            {/* BLOCK 4: KEYBOARD SHORTCUTS BAR */}
            <div
              aria-label="Gợi ý phím tắt"
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm text-muted-foreground print:hidden"
            >
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Keyboard aria-hidden className="size-4 text-primary" /> Phím tắt:
              </span>
              <kbd className="rounded border border-border bg-background px-2 py-0.5 font-mono text-sm font-semibold text-foreground shadow-2xs">
                Space
              </kbd>
              <span>Đọc biên nhận</span>
              <span className="text-border">•</span>
              <kbd className="rounded border border-border bg-background px-2 py-0.5 font-mono text-sm font-semibold text-foreground shadow-2xs">
                Ctrl + P
              </kbd>
              <span>In biên lai</span>
              <span className="text-border">•</span>
              <kbd className="rounded border border-border bg-background px-2 py-0.5 font-mono text-sm font-semibold text-foreground shadow-2xs">
                Enter
              </kbd>
              <span>Đăng xuất an toàn</span>
            </div>

            {/* BLOCK 5: ACTION BUTTONS */}
            <div className="flex flex-col items-center justify-between gap-3 pt-2 print:hidden sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrint}
                className="h-11 min-h-[44px] w-full gap-2 rounded-lg font-semibold text-sm sm:w-auto"
              >
                <Printer aria-hidden className="size-4" />
                <span>In / Lưu biên lai điện tử (Ctrl + P)</span>
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={handleExit}
                className="h-11 min-h-[44px] w-full gap-2 rounded-lg font-semibold text-sm shadow-xs sm:w-auto"
                aria-label="Bấm phím Enter hoặc nhấp vào đây để Đăng xuất an toàn"
              >
                <span>Đăng xuất an toàn (Enter)</span>
                <LogOut aria-hidden className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 4. FOOTER */}
      <footer className="w-full border-t border-border/80 bg-background py-3.5 px-6 text-center text-sm text-muted-foreground font-medium print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <div>
            © 2024 Trường Đại học FPT — Hệ thống Khảo thí LearnAble.
          </div>
          <div className="flex items-center gap-1.5 font-mono text-sm">
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Audit log recorded at 10:24:18 AM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
