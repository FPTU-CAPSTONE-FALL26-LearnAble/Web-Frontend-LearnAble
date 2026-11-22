# Báo cáo API còn thiếu – Exam Setup & Scheduling và Question Bank Authoring

| Thông tin | Giá trị |
|---|---|
| Ngày kiểm tra | 01/11/2026 |
| Backend Render | `https://backend-learnable.onrender.com` |
| Backend IP | `http://54.79.78.167:8080` |
| Kết quả đối chiếu | Hai Swagger hiện giống nhau: 96 paths, 156 operations |
| Phạm vi | Examiner – Exam Setup & Scheduling; Lecturer – Question Bank Authoring |

> Tên endpoint dưới đây là đề xuất. Backend có thể dùng tên khác nếu bảo đảm cùng chức năng và dữ liệu.

## 1. Question Bank Authoring

Backend đã có CRUD Questions, QuestionOptions, audio, Subjects, Topics và lọc câu hỏi bằng `ExamTypeId`. Các chức năng còn thiếu:

| Ưu tiên | Chức năng còn thiếu | API đề xuất | Dữ liệu tối thiểu |
|---|---|---|---|
| P0 | Phân biệt câu hỏi dùng cho **Exam** và **Practice** | Mở rộng `POST/PUT/GET /api/v1/Questions` | `purpose` hoặc `purposes`; hỗ trợ query `Purpose=Exam\|Practice` |
| P0 | Kiểm tra file import trước khi lưu | `POST /api/v1/Questions/import/validate` | File Excel/CSV; trả số dòng hợp lệ, lỗi theo dòng/cột và bản xem trước |
| P0 | Import câu hỏi | `POST /api/v1/Questions/import` | File hoặc `importSessionId`; trả danh sách ID đã tạo và các dòng thất bại |
| P1 | Export ngân hàng câu hỏi | `GET /api/v1/Questions/export` | Dùng cùng bộ lọc của API danh sách; trả file Excel/CSV |
| P1 | Thao tác hàng loạt | `PATCH /api/v1/Questions/bulk-status` | `questionIds`, `status`; trả số bản ghi thành công/thất bại |
| P1 | Thống kê mức sử dụng | `GET /api/v1/Questions/{id}/usage` | Số đề thi/practice set đang sử dụng và danh sách tham chiếu |
| P1 | Ảnh đính kèm câu hỏi/đáp án | Media API cho Questions và QuestionOptions | Upload, lấy URL tạm thời, thay thế và xóa ảnh |
| P2 | Dữ liệu chuyên biệt theo loại câu hỏi | Mở rộng Question request/response hoặc endpoint chi tiết | Code: language/test cases; Math: LaTeX; Diagram: cấu trúc/đáp án tương ứng |

### Làm rõ `ExamTypeId`

`ExamTypeId` hiện biểu diễn loại kỳ thi như **Midterm** hoặc **Final**. Trường này không thay thế cho Question Purpose:

| Thuộc tính | Ví dụ | Mục đích |
|---|---|---|
| `examTypeId` | Midterm, Final | Câu hỏi phù hợp loại kỳ thi nào |
| `purpose` | Exam, Practice | Câu hỏi thuộc ngân hàng Exam hay Practice |

## 2. Exam Setup & Scheduling

Backend đã có Exam Subject, Exam Paper, chọn câu hỏi, preview/publish đề, phòng/ghế, ca thi, lịch thi, enrollment, giám thị, kiểm tra conflict, validation và tự động xếp ghế. Các chức năng còn thiếu:

| Ưu tiên | Chức năng còn thiếu | API đề xuất | Dữ liệu tối thiểu |
|---|---|---|---|
| P0 | Gán mã đề cụ thể cho lịch thi | `PUT /api/v1/examschedules/{id}/papers` | `examPaperIds`, quy tắc phân phối; trả các đề đã gán |
| P0 | Phân mã đề cho sinh viên/phòng | `POST /api/v1/examschedules/{id}/papers/auto-assign` | Chế độ random/round-robin; trả enrollment và paper tương ứng |
| P0 | Quản lý exam code | `/api/v1/examschedules/{id}/exam-code` | Tạo, xem trạng thái, mở khóa, đóng và thu hồi mã; không trả mã trước thời điểm được phép |
| P0 | Gửi thông báo lịch thi | `POST /api/v1/examschedules/{id}/notifications` | Nhóm người nhận, template/nội dung; trả kết quả gửi |
| P1 | Theo dõi trạng thái thông báo | `GET /api/v1/examschedules/{id}/notifications` | Trạng thái queued/sent/failed theo người nhận và thời gian gửi |
| P1 | Sinh đề tự động theo ma trận | `POST /api/v1/exampapers/{id}/generate` | Topic, difficulty, question type, số lượng và điểm; trả đề nháp/validation |

### Điểm cần thống nhất với Backend

`ExamScheduleRequestModel` hiện chỉ có `examSubjectId`, `examShiftId`, `entryOpensAt` và `entryClosesAt`; chưa có `examPaperId`. Validation hiện chỉ xác nhận Exam Subject có đề đã publish. Vì vậy cần API gán/phân mã đề rõ ràng khi một môn thi có nhiều đề đã publish.

## 3. Thứ tự triển khai đề nghị

| Giai đoạn | Hạng mục |
|---|---|
| 1 | Question Purpose; import validate/import; gán và phân mã đề cho lịch thi |
| 2 | Exam code; thông báo lịch thi; export và bulk question actions |
| 3 | Usage statistics; image media; loại câu hỏi nâng cao; sinh đề theo ma trận |

## 4. Tiêu chí hoàn thành

- FE lọc độc lập được Exam Questions và Practice Questions mà không suy diễn từ `ExamTypeId`.
- Import trả lỗi chính xác theo từng dòng và không lưu dữ liệu khi validation thất bại.
- Mỗi lịch thi xác định được tập đề và đề được gán cho từng sinh viên/phòng.
- Exam code chỉ được hiển thị/mở trong đúng cửa sổ thời gian và có trạng thái rõ ràng.
- Sau khi publish lịch, hệ thống gửi và truy vấn được trạng thái thông báo.
