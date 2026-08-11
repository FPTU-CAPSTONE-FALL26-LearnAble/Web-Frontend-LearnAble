/**
 * Toàn bộ copy tiếng Việt của LearnAble — một file duy nhất, không string literal trong JSX.
 * Câu thông báo (announcements) là "đầu ra chính" của app với sinh viên khiếm thị:
 * ngắn, từ mang nghĩa đứng đầu câu ("Đã lưu" thay vì "Câu trả lời của bạn đã được lưu…").
 * File này nằm trong cây sync (§5) — copy sang desktop nguyên vẹn.
 */
export const vi = {
  app: {
    name: "LearnAble",
    skipToMain: "Bỏ qua, đến nội dung chính",
  },

  common: {
    loading: "Đang tải…",
    retry: "Thử lại",
    save: "Lưu",
    cancel: "Hủy",
    close: "Đóng",
    back: "Quay lại",
    next: "Tiếp",
    previous: "Trước",
    confirm: "Xác nhận",
    logout: "Đăng xuất",
    error: "Có lỗi xảy ra",
    empty: "Chưa có dữ liệu",
    required: "Trường này là bắt buộc",
  },

  announce: {
    /** Đọc khi đổi route — useRouteAnnouncer ghép: `${title}` */
    pageLoaded: (title: string) => `${title}`,
    saved: "Đã lưu",
    saving: "Đang lưu",
    offlineSaving: "Mất kết nối — câu trả lời đang được lưu trên máy",
    saveFailed: "Lưu thất bại — sẽ tự thử lại",
    answerSelected: (label: string) => `Đã chọn ${label}`,
    answerCleared: "Đã bỏ chọn",
    questionChanged: (index: number, total: number) => `Câu ${index} trên ${total}`,
    timeRemaining: (minutes: number) => `Còn ${minutes} phút`,
    examSubmitted: "Đã nộp bài",
    connectionRestored: "Đã kết nối lại — đang đồng bộ câu trả lời",
  },

  auth: {
    title: "Đăng nhập",
    pageTitle: "Đăng nhập — LearnAble",
    email: "Email",
    password: "Mật khẩu",
    submit: "Đăng nhập",
    submitting: "Đang đăng nhập…",
    errInvalid: "Email hoặc mật khẩu không đúng",
    errEmailFormat: "Email không hợp lệ",
    errPasswordRequired: "Nhập mật khẩu",
    errNetwork: "Không kết nối được máy chủ — kiểm tra mạng rồi thử lại",
    loggedInAs: (name: string) => `Đang đăng nhập: ${name}`,
  },

  a11ySettings: {
    title: "Cài đặt trợ năng",
    pageTitle: "Cài đặt trợ năng — LearnAble",
    intro:
      "Giao diện tương phản cao, chữ lớn luôn bật sẵn cho mọi sinh viên. Các cài đặt dưới đây chỉ tinh chỉnh thêm.",
    ttsSection: "Giọng đọc (TTS)",
    ttsVoice: "Giọng đọc",
    ttsRate: "Tốc độ đọc",
    ttsRateValue: (rate: string) => `${rate} lần tốc độ thường`,
    ttsPreview: "Nghe thử",
    ttsPreviewText: "Đây là giọng đọc bạn đã chọn.",
    noViVoice:
      "Máy này chưa cài giọng đọc tiếng Việt. Ứng dụng sẽ không tự đổi sang giọng tiếng Anh — hãy cài giọng tiếng Việt trong phần cài đặt hệ điều hành.",
    noViVoiceHelp: "Hướng dẫn cài giọng tiếng Việt",
    saved: "Đã lưu cài đặt",
  },

  exam: {
    /** SCR-03 (desktop) và SCR-04 (web, chế độ luyện tập) dùng chung */
    pageTitle: (name: string) => `${name} — LearnAble`,
    question: (index: number, total: number) => `Câu ${index}/${total}`,
    questionListLabel: "Danh sách câu hỏi",
    answerOptionsLabel: "Các phương án trả lời",
    flagQuestion: "Đánh dấu xem lại",
    unflagQuestion: "Bỏ đánh dấu",
    flagged: "Đã đánh dấu",
    timerLabel: "Thời gian còn lại",
    submit: "Nộp bài",
    submitConfirmTitle: "Nộp bài?",
    submitConfirmBody: (answered: number, total: number) =>
      `Bạn đã trả lời ${answered}/${total} câu. Sau khi nộp sẽ không sửa được.`,
    submitConfirmYes: "Nộp bài",
    submitConfirmNo: "Tiếp tục làm bài",
    unanswered: "Chưa trả lời",
    answered: "Đã trả lời",
    saveStatus: {
      saved: "Đã lưu",
      saving: "Đang lưu",
      offline: "Mất kết nối — đang lưu trên máy",
      error: "Lưu thất bại — đang thử lại",
    },
    gesture: {
      modeLabel: "Chế độ nhập",
      keyboard: "Bàn phím",
      gesture: "Cử chỉ",
      cameraOn: "Camera đang bật",
      cameraOff: "Camera đang tắt",
      notAvailable: "Không nhận diện được camera — dùng bàn phím",
    },
    proctoring: {
      consentTitle: "Giám sát thi",
      consentBody:
        "Buổi thi này được giám sát qua camera và micro theo quy chế thi. Dữ liệu chỉ dùng cho mục đích coi thi.",
      consentAccept: "Đồng ý và vào thi",
      consentDecline: "Không đồng ý",
      declined: "Bạn cần đồng ý giám sát để vào thi. Liên hệ giám thị nếu cần hỗ trợ.",
    },
  },

  practice: {
    title: "Luyện tập",
    pageTitle: "Luyện tập — LearnAble",
    listLabel: "Danh sách bộ đề luyện tập",
    questionsCount: (n: number) => `${n} câu hỏi`,
    start: "Bắt đầu luyện tập",
    localOnlyNote:
      "Kết quả luyện tập hiện lưu trên máy của bạn (đang chờ chốt API phía máy chủ).",
    finish: "Kết thúc lượt luyện tập",
    resultTitle: "Kết quả luyện tập",
    score: (correct: number, total: number) => `Đúng ${correct}/${total} câu`,
    explanation: "Giải thích",
    correct: "Đúng",
    incorrect: "Sai",
    yourAnswer: "Bạn chọn",
    correctAnswer: "Đáp án đúng",
    tryAgain: "Luyện lại bộ đề này",
    backToList: "Về danh sách bộ đề",
  },

  assistant: {
    title: "Trợ lý học tập AI",
    pageTitle: "Trợ lý học tập AI — LearnAble",
    inputLabel: "Câu hỏi của bạn",
    inputPlaceholder: "Nhập câu hỏi về nội dung môn học…",
    send: "Gửi",
    sending: "Đang trả lời…",
    chatLogLabel: "Cuộc trò chuyện",
    you: "Bạn",
    bot: "Trợ lý",
    sources: "Nguồn trích dẫn",
    ungrounded:
      "Câu trả lời này không tìm được nguồn trong tài liệu môn học — hãy kiểm chứng với giảng viên.",
    errFailed: "Trợ lý không trả lời được — thử lại",
  },

  progress: {
    title: "Tiến độ luyện tập",
    pageTitle: "Tiến độ luyện tập — LearnAble",
    summaryLabel: "Tổng quan",
    attempts: (n: number) => `${n} lượt luyện tập`,
    avgScore: (pct: number) => `Điểm trung bình ${pct}%`,
    weakTopics: "Chủ đề cần ôn thêm",
    noWeakTopics: "Chưa phát hiện chủ đề yếu",
    historyLabel: "Lịch sử luyện tập",
    noHistory: "Bạn chưa luyện tập lần nào",
  },

  results: {
    title: "Kết quả thi",
    pageTitle: "Kết quả thi — LearnAble",
    listLabel: "Danh sách kết quả",
    noResults: "Chưa có kết quả thi nào",
    score: (score: number, max: number) => `${score}/${max} điểm`,
    status: {
      passed: "Đạt",
      failed: "Không đạt",
      pending: "Chờ chấm",
      flagged: "Đang xem xét",
    },
    flaggedNote:
      "Bài thi này đang được giám thị xem xét. Điểm hiển thị là điểm tạm thời.",
    detail: "Xem chi tiết",
    submittedAt: (date: string) => `Nộp lúc ${date}`,
    duration: (minutes: number) => `Làm bài ${minutes} phút`,
  },

  errors: {
    /** Mọi lỗi đều phải announce — lỗi im lặng là vô hình với sinh viên khiếm thị. */
    network: "Mất kết nối máy chủ",
    unauthorized: "Phiên đăng nhập hết hạn — đăng nhập lại",
    notFound: "Không tìm thấy dữ liệu",
    server: "Máy chủ gặp lỗi — thử lại sau",
    unknown: "Lỗi không xác định",
  },
} as const;

export type ViStrings = typeof vi;
