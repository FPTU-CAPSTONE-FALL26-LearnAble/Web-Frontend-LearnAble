import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
  Keyboard,
  Lock,
  RotateCcw,
  ShieldAlert,
  Volume2,
  Square,
  Check,
  Send,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { Progress } from "@/shared/ui/primitives/progress";
import { Separator } from "@/shared/ui/primitives/separator";
import { BrandIdentity } from "@/components/BrandIdentity";
import { announce } from "@/shared/a11y/announcer";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { toast } from "@/shared/ui/primitives/sonner";

interface Question {
  id: number;
  text: string;
  options: { id: number; text: string }[];
  explanation: string;
}

const mockQuestions: Question[] = [
  {
    id: 1,
    text: "Trong kiến trúc microservices, cơ chế nào sau đây thường được sử dụng để phân tán tải và định tuyến yêu cầu người dùng đến các service phù hợp?",
    options: [
      { id: 1, text: "API Gateway" },
      { id: 2, text: "Database Sharding" },
      { id: 3, text: "Continuous Integration" },
      { id: 4, text: "Single Sign-On (SSO)" },
    ],
    explanation:
      "API Gateway đóng vai trò là điểm truy cập duy nhất, xử lý định tuyến, phân tán tải và xác thực yêu cầu.",
  },
  {
    id: 2,
    text: "Mô hình thiết kế (Design Pattern) nào thuộc nhóm Creational cho phép đảm bảo một lớp chỉ có duy nhất một thể hiện (instance) trong suốt vòng đời ứng dụng?",
    options: [
      { id: 1, text: "Observer Pattern" },
      { id: 2, text: "Singleton Pattern" },
      { id: 3, text: "Adapter Pattern" },
      { id: 4, text: "Factory Method Pattern" },
    ],
    explanation:
      "Singleton Pattern đảm bảo một lớp chỉ có một instance duy nhất và cung cấp một điểm truy cập toàn cục tới instance đó.",
  },
  {
    id: 3,
    text: "Trong hệ quản trị cơ sở dữ liệu quan hệ, thuộc tính ACID nào đảm bảo một giao dịch (transaction) được thực hiện trọn vẹn hoặc hoàn toàn không xảy ra?",
    options: [
      { id: 1, text: "Atomicity (Tính nguyên tố)" },
      { id: 2, text: "Consistency (Tính nhất quán)" },
      { id: 3, text: "Isolation (Tính cô lập)" },
      { id: 4, text: "Durability (Tính bền vững)" },
    ],
    explanation:
      "Atomicity (Tính nguyên tố) đảm bảo tất cả các thao tác trong transaction thành công hoặc bị hủy toàn bộ nếu có lỗi.",
  },
  {
    id: 4,
    text: "Trong giao thức HTTP/2, tính năng nào cho phép gửi đồng thời nhiều yêu cầu và phản hồi qua một kết nối TCP duy nhất mà không bị nghẽn?",
    options: [
      { id: 1, text: "Head-of-Line Blocking" },
      { id: 2, text: "Multiplexing" },
      { id: 3, text: "Chunked Transfer Encoding" },
      { id: 4, text: "Domain Sharding" },
    ],
    explanation:
      "Multiplexing cho phép lồng ghép nhiều luồng yêu cầu/phản hồi dữ liệu qua cùng một kết nối TCP.",
  },
  {
    id: 5,
    text: "Trong quy trình phát triển phần mềm Agile/Scrum, sự kiện Daily Standup meeting có mục đích chính là gì?",
    options: [
      {
        id: 1,
        text: "Báo cáo tiến độ chi tiết từng giờ làm việc cho cấp quản lý cấp cao và khách hàng kiểm duyệt.",
      },
      {
        id: 2,
        text: "Đồng bộ hóa công việc nhóm trong 15 phút, rà soát trở ngại kỹ thuật và lập kế hoạch ngày tiếp theo của Sprint.",
      },
      {
        id: 3,
        text: "Đánh giá chất lượng cá nhân và bình bầu khen thưởng hoặc trừ điểm hiệu suất hàng ngày.",
      },
      {
        id: 4,
        text: "Thuyết trình chi tiết toàn bộ tính năng sản phẩm cho Product Owner nghiệm thu trước khi Release.",
      },
    ],
    explanation:
      "Daily Standup là cuộc họp ngắn 15 phút đầu ngày để cả nhóm đồng bộ tiến độ, phát hiện chướng ngại và lên kế hoạch ngày.",
  },
];

export function ExamDemoRoute() {
  useRouteAnnouncer(
    "Bài Thi Trắc Nghiệm Trực Tuyến — LearnAble Secure Client",
    "Phòng thi SWE301c",
  );
  const navigate = useNavigate();

  const totalQuestions = 20;
  const [currentQIndex, setCurrentQIndex] = useState(4); // 0-based, Q5 active
  const [answers, setAnswers] = useState<Record<number, number>>({
    0: 1,
    1: 2,
    2: 1,
    3: 2,
    4: 2, // Q5 selected option 2
    5: 1,
    6: 3,
    8: 2,
    9: 4,
    11: 1,
    12: 2,
    13: 3,
    14: 1,
    16: 4,
    18: 2,
  });
  const [flags, setFlags] = useState<Record<number, boolean>>({
    2: true, // Q3 flagged
  });

  const [secondsRemaining, setSecondsRemaining] = useState(2538); // 42m 18s
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = mockQuestions[currentQIndex % mockQuestions.length];
  const qNum = currentQIndex + 1;
  const isFlagged = Boolean(flags[currentQIndex]);
  const selectedOption = answers[currentQIndex];

  const handleSelectOption = (optionId: number) => {
    setAnswers((prev) => ({ ...prev, [currentQIndex]: optionId }));
    announce(`Đã chọn phương án ${optionId} cho câu hỏi ${qNum}.`);
  };

  const toggleFlag = () => {
    const nextFlag = !isFlagged;
    setFlags((prev) => ({ ...prev, [currentQIndex]: nextFlag }));
    announce(
      nextFlag
        ? `Đã gắn cờ xem lại cho câu hỏi ${qNum}.`
        : `Đã bỏ cờ xem lại cho câu hỏi ${qNum}.`,
    );
    toast(nextFlag ? "Đã đánh dấu xem lại câu hỏi này" : "Đã bỏ đánh dấu");
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
      announce(`Chuyển về câu hỏi số ${currentQIndex}.`);
    }
  };

  const handleNext = () => {
    if (currentQIndex < totalQuestions - 1) {
      setCurrentQIndex((prev) => prev + 1);
      announce(`Chuyển sang câu hỏi số ${currentQIndex + 2}.`);
    }
  };

  // Speech narration
  const speakCurrentQuestion = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const text = `Câu hỏi số ${qNum}: ${currentQuestion.text}. Lựa chọn 1: ${currentQuestion.options[0]?.text}. Lựa chọn 2: ${currentQuestion.options[1]?.text}. Lựa chọn 3: ${currentQuestion.options[2]?.text}. Lựa chọn 4: ${currentQuestion.options[3]?.text}. ${
        selectedOption
          ? `Bạn đang chọn phương án ${selectedOption}.`
          : "Bạn chưa chọn đáp án."
      }`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = playbackRate;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      announce("Đang phát âm thanh đọc câu hỏi và các phương án.");
    } else {
      toast.info("Trình duyệt không hỗ trợ tổng hợp giọng nói.");
    }
  }, [currentQuestion, playbackRate, qNum, selectedOption]);

  const stopSpeech = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      announce("Đã dừng phát âm thanh.");
    }
  }, []);

  const handleFinalSubmit = () => {
    setShowSubmitModal(false);
    toast.success("Bài thi đã được nộp thành công!");
    navigate("/demo/result");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (isSpeaking) {
          stopSpeech();
        } else {
          speakCurrentQuestion();
        }
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        handleSelectOption(parseInt(e.key, 10));
      }
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleNext();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFlag();
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setShowExplanationModal(true);
      }
      if (e.key === "F1") {
        e.preventDefault();
        setShowSupervisorModal(true);
      }
      if (e.key === "End") {
        e.preventDefault();
        setShowSubmitModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQIndex, isSpeaking, speakCurrentQuestion, stopSpeech]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* 1. TOP KIOSK TITLEBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 px-4 py-2.5 backdrop-blur-md print:hidden sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandIdentity compact />
            <Separator orientation="vertical" className="hidden sm:block" />
            <div className="flex items-center gap-2">
              <Badge variant="outline">Client v4.2.9</Badge>
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 sm:inline-flex">
                <Lock aria-hidden className="size-3.5" />
                Kiosk Lockdown Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-sm text-muted-foreground md:flex">
              <span className="font-mono">Môn: SWE301c</span>
              <span className="text-border">•</span>
              <span className="font-mono">Thí sinh: SE180291</span>
            </div>

            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowSupervisorModal(true)}
              aria-label="Báo sự cố cho giám thị phòng thi (Phím tắt F1)"
            >
              <ShieldAlert aria-hidden />
              <span>Báo giám thị (F1)</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. EXAM ACTION & COUNTDOWN TOOLBAR */}
      <section
        aria-label="Thanh công cụ làm bài và đếm ngược thời gian"
        className="sticky top-[53px] z-40 w-full border-b border-border/80 bg-card/95 px-4 py-2 shadow-xs backdrop-blur-md sm:px-6"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* Left: Audio narration controls */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isSpeaking ? "secondary" : "default"}
              onClick={speakCurrentQuestion}
              aria-label="Bấm phím Space để nghe toàn bộ nội dung câu hỏi và các lựa chọn"
            >
              <Volume2 aria-hidden />
              <span>
                {isSpeaking
                  ? "Đang đọc câu hỏi…"
                  : "Đọc câu hỏi & đáp án (Space)"}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopSpeech();
                speakCurrentQuestion();
              }}
              aria-label="Đọc lại câu hỏi (Phím tắt R)"
            >
              <RotateCcw aria-hidden />
              <span className="hidden sm:inline">Đọc lại (R)</span>
            </Button>

            {isSpeaking ? (
              <Button
                type="button"
                variant="ghost"
                onClick={stopSpeech}
                aria-label="Dừng phát âm thanh"
              >
                <Square aria-hidden className="fill-current" />
                <span>Dừng</span>
              </Button>
            ) : null}

            <div
              aria-label="Tốc độ đọc"
              className="hidden items-center gap-0.5 rounded-md border border-border bg-background p-1 text-sm sm:flex"
            >
              <span className="px-1 text-sm font-medium text-muted-foreground">
                Tốc độ:
              </span>
              {[1.0, 1.25].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  aria-pressed={playbackRate === rate}
                  className={`rounded px-1.5 py-0.5 font-mono text-sm font-medium transition-colors ${
                    playbackRate === rate
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Right: Countdown timer card */}
          <div className="flex items-center gap-2">
            <div
              aria-label={`Thời gian còn lại: ${formatTime(secondsRemaining)} trên 60 phút`}
              aria-live="polite"
              className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-primary shadow-xs"
            >
              <Clock
                aria-hidden
                className="size-4 animate-pulse text-primary"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground leading-none">
                  Thời gian còn lại
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-mono text-xl font-semibold tabular-nums tracking-tight text-primary leading-tight">
                    {formatTime(secondsRemaining)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    / 60:00
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE: BALANCED 2-COLUMN SPLIT */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-10">
        {/* LEFT COLUMN: QUESTION CONTENT (7 cols) */}
        <section
          aria-labelledby="question-heading"
          className="flex flex-col gap-4 lg:col-span-7"
        >
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Badge>
                    CÂU HỎI {qNum.toString().padStart(2, "0")} /{" "}
                    {totalQuestions}
                  </Badge>
                  <span className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-sm font-medium text-muted-foreground">
                    0.5 điểm • Một đáp án đúng
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowExplanationModal(true)}
                    aria-label="Giải nghĩa thuật ngữ chuyên ngành (Phím tắt E)"
                  >
                    <HelpCircle aria-hidden className="text-primary" />
                    <span>Thuật ngữ (E)</span>
                  </Button>

                  <Button
                    type="button"
                    variant={isFlagged ? "secondary" : "outline"}
                    onClick={toggleFlag}
                    aria-label="Đánh dấu xem lại câu hỏi này (Phím tắt F)"
                  >
                    {isFlagged ? (
                      <BookmarkCheck aria-hidden className="text-amber-600" />
                    ) : (
                      <Bookmark aria-hidden />
                    )}
                    <span>
                      {isFlagged ? "Đã đánh dấu (F)" : "Đánh dấu (F)"}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2 pt-1">
                <CardTitle
                  id="question-heading"
                  className="text-xl sm:text-2xl"
                >
                  {currentQuestion.text}
                </CardTitle>
                <CardDescription>
                  Gợi ý trợ năng: Sử dụng các phím số{" "}
                  <strong className="font-semibold text-foreground">
                    1, 2, 3, 4
                  </strong>{" "}
                  trên bàn phím để chọn đáp án tương ứng.
                </CardDescription>
              </div>
            </CardHeader>

            {/* 4 MULTIPLE CHOICE OPTIONS */}
            <CardContent>
              <div
                aria-label={`Các phương án trả lời cho câu hỏi ${qNum}`}
                role="radiogroup"
                className="space-y-3"
              >
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOption === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectOption(option.id);
                        }
                      }}
                      tabIndex={0}
                      role="radio"
                      aria-checked={isSelected}
                      className={`group flex min-h-[52px] cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                          : "border-border/70 bg-card hover:border-border hover:bg-secondary/40"
                      }`}
                    >
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-secondary/50 text-foreground group-hover:border-primary/60 group-hover:text-primary"
                        }`}
                      >
                        {option.id}
                      </div>

                      <div className="flex-1 pt-0.5">
                        <p
                          className={`text-base leading-relaxed ${
                            isSelected
                              ? "font-semibold text-foreground"
                              : "font-normal text-foreground/90"
                          }`}
                        >
                          {option.text}
                        </p>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-1.5">
                            <CheckCircle2 aria-hidden className="size-4" />
                            <span>Phương án đang chọn</span>
                          </span>
                        ) : null}
                      </div>

                      <div
                        className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-transparent"
                        }`}
                      >
                        {isSelected ? (
                          <Check aria-hidden className="size-3 stroke-[3]" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Question bottom navigation bar */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentQIndex === 0}
              aria-label="Quay lại câu hỏi trước (Phím tắt P)"
            >
              <ArrowLeft aria-hidden />
              <span>Câu trước (P)</span>
            </Button>

            <div className="hidden items-center gap-1.5 font-mono text-sm text-muted-foreground sm:flex">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Đã lưu tự động: 14:18:02 (Đồng bộ)</span>
            </div>

            <Button
              type="button"
              onClick={handleNext}
              disabled={currentQIndex === totalQuestions - 1}
              aria-label="Chuyển sang câu tiếp theo (Phím tắt N)"
            >
              <span>Câu tiếp theo (N)</span>
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </section>

        {/* RIGHT COLUMN: QUESTION MATRIX & FINAL SUBMIT (3 cols) */}
        <aside
          aria-label="Ma trận điều hướng 20 câu hỏi"
          className="flex flex-col gap-4 lg:col-span-3"
        >
          <Card className="justify-between">
            <CardContent>
              <div className="space-y-3.5">
                {/* Header */}
                <div className="border-b border-border/60 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-base text-foreground">
                      Bảng câu hỏi ({totalQuestions} câu)
                    </h3>
                    <Badge variant="outline">
                      Đã làm: {answeredCount}/{totalQuestions}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nhấn trực tiếp hoặc dùng phím{" "}
                    <strong className="text-foreground">P / N</strong> để điều
                    hướng.
                  </p>
                </div>

                {/* Status Legend */}
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-secondary/40 p-2.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="size-4 rounded bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <span>Đã làm ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-4 rounded border-2 border-primary bg-primary/20" />
                    <span className="font-semibold text-foreground">
                      Đang xem ({qNum.toString().padStart(2, "0")})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-4 rounded border border-border bg-card" />
                    <span>Chưa làm ({totalQuestions - answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-4 rounded border border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
                      ⚑
                    </span>
                    <span>
                      Có cờ (
                      {
                        Object.keys(flags).filter((k) => flags[Number(k)])
                          .length
                      }
                      )
                    </span>
                  </div>
                </div>

                {/* 4x5 MATRIX BUTTONS */}
                <div
                  className="grid grid-cols-4 gap-2 pt-1"
                  role="navigation"
                  aria-label="Danh sách câu hỏi"
                >
                  {Array.from({ length: totalQuestions }, (_, i) => {
                    const num = i + 1;
                    const isCurrent = i === currentQIndex;
                    const isAnswered = Boolean(answers[i]);
                    const hasFlag = Boolean(flags[i]);

                    let btnClass =
                      "border border-border/70 bg-card text-foreground hover:bg-secondary/60";
                    if (isAnswered) {
                      btnClass =
                        "bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-2xs";
                    }
                    if (isCurrent) {
                      btnClass =
                        "border-2 border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/30";
                    }

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setCurrentQIndex(i);
                          announce(`Chuyển đến câu hỏi số ${num}.`);
                        }}
                        aria-current={isCurrent ? "step" : undefined}
                        aria-label={`Câu ${num}: ${isAnswered ? "Đã làm" : "Chưa làm"}${hasFlag ? ", có gắn cờ" : ""}`}
                        className={`relative flex h-11 w-full items-center justify-center rounded-lg font-mono text-sm font-semibold tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${btnClass}`}
                      >
                        <span>{num.toString().padStart(2, "0")}</span>
                        {hasFlag ? (
                          <span
                            aria-hidden="true"
                            className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs"
                          >
                            ⚑
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Final Submit Box */}
              <div className="mt-4 space-y-3 border-t border-border/60 pt-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Tiến độ hoàn thành:</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {answeredCount} / {totalQuestions} câu ({progressPercent}
                      %)
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    aria-label="Tiến độ hoàn thành bài thi"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full"
                  aria-label="Nộp bài thi chính thức (Phím tắt End)"
                >
                  <Send aria-hidden />
                  <span>Nộp bài thi (End)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* 4. ACCESSIBILITY SHORTCUTS FOOTER DOCK */}
      <footer className="w-full border-t border-border/80 bg-background py-2.5 px-4 print:hidden sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2.5 text-sm text-muted-foreground sm:flex-row">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Keyboard aria-hidden className="size-4 text-primary" /> Phím tắt:
            </span>
            <kbd className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
              Space: Đọc
            </kbd>
            <kbd className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
              1-4: Chọn đáp án
            </kbd>
            <kbd className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
              P: Câu trước
            </kbd>
            <kbd className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
              N: Câu tiếp
            </kbd>
            <kbd className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
              F: Gắn cờ
            </kbd>
            <kbd className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
              E: Thuật ngữ
            </kbd>
            <kbd className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
              F1: Giám thị
            </kbd>
            <kbd className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
              End: Nộp bài
            </kbd>
          </div>

          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Phòng: FPTU-EXAM-902 • WCAG 2.2 AAA</span>
          </div>
        </div>
      </footer>

      {/* CONFIRM SUBMIT DIALOG */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận nộp bài thi</DialogTitle>
            <DialogDescription>
              Bạn đã hoàn thành{" "}
              <strong className="font-semibold text-foreground">
                {answeredCount}/{totalQuestions} câu hỏi
              </strong>{" "}
              ({progressPercent}%). Sau khi nộp, bạn sẽ không thể thay đổi câu
              trả lời.
            </DialogDescription>
          </DialogHeader>

          {totalQuestions - answeredCount > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              Lưu ý: Bạn vẫn còn{" "}
              <strong>{totalQuestions - answeredCount} câu chưa làm</strong>.
              Bạn có chắc chắn muốn nộp bài ngay bây giờ?
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSubmitModal(false)}
            >
              Tiếp tục làm bài
            </Button>
            <Button type="button" onClick={handleFinalSubmit}>
              <Check aria-hidden />
              <span>Xác nhận nộp bài</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EXPLANATION / TERMINOLOGY MODAL */}
      <Dialog
        open={showExplanationModal}
        onOpenChange={setShowExplanationModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle aria-hidden className="text-primary" />
              <span>Giải nghĩa thuật ngữ chuyên ngành</span>
            </DialogTitle>
            <DialogDescription>
              Hỗ trợ trợ năng giải thích thuật ngữ trong Câu {qNum}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm leading-relaxed">
            <div className="rounded-lg border border-border bg-secondary/40 p-3.5">
              <p className="font-semibold text-foreground">
                Daily Standup (Scrum Meeting):
              </p>
              <p className="mt-1 text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowExplanationModal(false)}
            >
              Đóng (Escape)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CALL SUPERVISOR MODAL */}
      <Dialog open={showSupervisorModal} onOpenChange={setShowSupervisorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert aria-hidden />
              <span>Báo sự cố cho Giám thị phòng thi</span>
            </DialogTitle>
            <DialogDescription>
              Phát tín hiệu khẩn cấp đến bàn giám sát phòng thi FPTU-EXAM-902.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground space-y-1">
            <p>
              • Mã thí sinh:{" "}
              <strong className="text-foreground font-mono">SE180291</strong>
            </p>
            <p>
              • Máy thi số:{" "}
              <strong className="text-foreground font-mono">WS-08</strong>
            </p>
            <p>• Trạng thái: Đã gửi tín hiệu hỗ trợ tại chỗ.</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setShowSupervisorModal(false);
                toast.success("Đã phát tín hiệu yêu cầu giám thị hỗ trợ!");
              }}
            >
              Đã hiểu &amp; Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
