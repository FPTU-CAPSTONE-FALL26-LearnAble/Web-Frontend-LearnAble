# Luồng ngày thi: API đã có và API còn thiếu

**Phạm vi:** Giảng viên check-in → Sinh viên vào màn hình chờ → Giảng viên mở đề → Sinh viên làm bài (bàn phím + NVDA) → Nộp bài → Giảng viên check-out.
**Nguồn:** Swagger server `54.79.78.167:8080` (163 đường dẫn, kiểm tra 12/11/2026). Các quy tắc nghiệp vụ lấy từ code BE bản cũ trên máy, **cần nhóm BE xác nhận trên bản đang chạy**.

## 1. Tóm tắt

Luồng chính **đã có gần đủ API**. Thiếu chủ yếu ở các tình huống ngoại lệ trong buổi thi. Rủi ro lớn nhất: sinh viên mất kết nối sau giờ làm bài khiến giảng viên **không check-out và không đóng phòng được**.

## 2. API đã có theo từng bước

| Bước | API | Ghi chú |
|---|---|---|
| Check-in | `GET lecturer/exam-schedules/{id}/students`, `GET …/seat-map`, `PUT …/enrollments/{id}/check-in`, `DELETE …/check-in` | Lọc theo điểm danh, hoàn tác được |
| Màn hình chờ | `GET me/exam-schedules`, `GET me/exam-schedules/{id}/entry-status` | Trạng thái `NotCheckedIn → WaitingForOpen → ReadyToStart → InProgress → Submitted → CheckedOut`; có giờ server |
| Mở đề | `POST lecturer/exam-schedules/{id}/open` | Kèm `examPaperId` tùy chọn |
| Làm bài | `POST/GET me/exam-schedules/{id}/attempt`, `GET exam-attempts/{id}`, `PUT …/answers/{attemptQuestionId}`, `POST …/operations/status` | Lưu từng đáp án có số phiên bản, kiểm tra lại thao tác khi mất mạng, giờ còn lại từ server, audio từng câu |
| Nộp bài | `POST exam-attempts/{id}/submit` | Biên nhận, lý do `Student` hoặc `Deadline` |
| Check-out, đóng phòng | `PUT …/check-out`, `POST …/close` | Xem mục 3 |
| Phụ trợ | `POST exam-attempts/{id}/time-extensions`, `results/auto-grade`, `results/release`, `me/…/result`, `camera-policy`, `StudentProfiles/me/preferences` | Cộng giờ, chấm, công bố, tùy chọn giọng đọc |

## 3. Chức năng còn thiếu

### Ưu tiên cao: có thể làm kẹt buổi thi

| # | Chức năng đề xuất | Lý do |
|---|---|---|
| 1 | **Chốt bài quá hạn**: tự động khi hết giờ, hoặc `POST lecturer/exam-schedules/{id}/attempts/finalize-expired` (giảng viên trưởng) | Check-out yêu cầu sinh viên đã nộp; đóng phòng yêu cầu không còn bài đang làm. Hiện chỉ chốt khi chính sinh viên gọi API, hoặc khi Examiner bấm chấm tự động |
| 2 | **Nộp thay hoặc hủy bài** một sinh viên, kèm lý do: `POST lecturer/exam-attempts/{id}/force-submit`, `…/cancel` | Máy hỏng, vi phạm. Trạng thái `Cancelled` có trong dữ liệu nhưng không có API đặt |

### Ưu tiên trung bình

| # | Chức năng đề xuất | Lý do |
|---|---|---|
| 3 | **Đánh dấu vắng mặt**: `PUT …/enrollments/{id}/absent` | Trạng thái `Absent` có nhưng không có API đặt |
| 4 | **Đổi ghế từng sinh viên**: `PUT …/enrollments/{id}/seat` | Hiện chỉ xếp chỗ tự động cả phòng |
| 5 | **Cập nhật gần thời gian thực** (SSE, WebSocket) hoặc **heartbeat** của sinh viên | Màn chờ và màn giám sát đang phải hỏi liên tục; giảng viên không biết ai đang chờ hay vừa rớt mạng |
| 6 | **Giám sát camera và gian lận**: tải ảnh hoặc video, ghi sự kiện vi phạm, đánh dấu phiên đáng ngờ | Đã có cấu hình bắt buộc camera và các màn hình Flagged sessions, Integrity review ở FE nhưng chưa có API |

### Ưu tiên thấp

| # | Chức năng đề xuất | Lý do |
|---|---|---|
| 7 | Làm mới link audio của bài đang làm | Link có `expiresAt`; hiện phải gọi lại cả bài |
| 8 | Lưu đánh dấu câu "xem lại" phía server | Hiện chỉ giữ cục bộ trên máy |
| 9 | API đặt thông báo cho màn hình chờ (`announcementText`) | Trường có trong phản hồi nhưng chưa thấy nơi đặt |

## 4. Cần BE xác nhận

- Chỉ **giảng viên trưởng (Chief)** đóng phòng được: có đúng chủ ý không?
- Examiner có đọc được danh sách sinh viên và sơ đồ ghế trong ngày thi không? (Các API này đang nằm trong nhóm `lecturer`.)
- Trạng thái bài làm khi hết giờ được chốt bằng cơ chế nào? (Code cũ chỉ thấy chốt theo yêu cầu, không có tiến trình nền.)

## 5. Phần phía sinh viên (bàn phím và NVDA)

Chủ yếu thuộc FE hoặc app desktop: quản lý focus, vùng thông báo, phím tắt. BE đã cung cấp đủ dữ liệu: câu hỏi theo thứ tự, audio, giờ còn lại từ server, tùy chọn giọng và tốc độ đọc.
