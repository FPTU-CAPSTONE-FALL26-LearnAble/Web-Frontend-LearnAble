# Bàn giao: Exam Preparation (LearnAble Web)

**Ngày:** 09/11/2026
**Phạm vi:** luồng từ Lecturer tạo câu hỏi đến Examiner tạo lịch thi và gửi thông báo cho sinh viên/lecturer.
**Nguồn chuẩn khi có mâu thuẫn:** Swagger đang chạy → code FE hiện tại. Bỏ qua các tài liệu cũ (`api_summary_13092026.txt`, `PRODUCT.md` phần Render/fixture, README BE ghi SQL Server).

> Tài liệu này tóm tắt một phiên làm việc. Phần "Chưa kiểm chứng" là những điều **chưa** được thử trên server thật.

## 1. Hệ thống backend

- **Server thật FE gọi:** `http://54.79.78.167:8080` (EC2). Vite proxy `/api` về đây (`vite.config.ts`), `VITE_API_BASE_URL=/api/v1`, `VITE_USE_MSW=false`.
- **Server thứ hai:** `https://backend-learnable.onrender.com`, chỉ dùng đối chiếu Swagger.
- **Swagger mới nhất** đã lưu trên máy: `C:\Capstone2026\ec2-swagger-staff-latest.json` và `render-swagger-staff-latest.json`. Hai file có cùng SHA-256 (`f88a7e9645ad…341d62`), 147 path.
- Code BE trên máy là bản cũ, **không** dùng làm căn cứ.
- Môi trường cloud của Claude không gọi được EC2 (từ chối kết nối) và Render (proxy chặn). Mọi đối chiếu dựa trên file Swagger đã lưu, không gọi trực tiếp server.

## 2. Backend đã có đủ API chưa

| Bước | API | Trạng thái FE |
|---|---|---|
| Lecturer tạo topic, câu hỏi, đáp án | `Topics`, `Questions`, `QuestionOptions` | Đã nối |
| Import câu hỏi Excel | `subjects/{id}/questions/import`, `/validate`, `/template` | Đã nối |
| Audio câu hỏi/đáp án | `PUT/GET/DELETE …/audio` (MP3, tối đa 10 MB, link đọc hạn 10 phút) | Đã nối |
| Học liệu | `LearningMaterials` (+ upload file, publish) | Đã nối |
| Examiner tạo đề | `examsubjects`, `…/papers`, `exampapers/{id}/questions` (If-Match), `/available-questions`, `/preview`, `/publish` | Đã nối |
| Kỳ đăng ký giám thị | `invigilation-periods` (+ slots, open/close/cancel, registrations, candidates), `lecturer/invigilation-periods` | Đã nối |
| Lập lịch | `examshifts`, `examrooms`, `examschedules` (lẻ và `/bulk`, `/bulk/preview`, `/check-conflicts`) | Đã nối |
| Gán sinh viên/giám thị/chỗ ngồi | `…/enrollments`, `…/invigilators`, `…/seating/auto-assign` | Đã nối |
| Import danh sách sinh viên | `examsubjects/{id}/student-import/validate`, `/template` | Đã nối (trong `api/invigilation.ts`) |
| Validate và publish lịch | `…/validation`, `…/publish` | Đã nối |
| Camera policy | `examsubjects/{id}/camera-policy` (GET/PUT, If-Match) | Mới thêm hàm API, **chưa có màn hình** |
| Thông báo | `notifications` (tạo, sửa, publish, recipients), `me/notifications` | Đã nối; mới nối vào bước publish lịch (xem mục 4) |

### Text-to-speech
Backend **không có API tạo giọng đọc**. Chỉ có upload/lấy/xóa MP3. Học liệu có cờ `isTtsReady` nhưng không có endpoint sinh ra nó. Student preferences có `voiceCode`, `speechRate` (nhiều khả năng TTS chạy ở client). Chưa kiểm tra phần FE đọc to bằng trình duyệt.

### Thông báo
- Là thông báo **trong ứng dụng**, không thấy trường/endpoint nào cho email trong Swagger.
- Đối tượng nhận: `Users`, `Roles`, `University`, `System`. Loại: `GeneralAnnouncement`, `SystemMaintenance`, `ExamSchedulePublished`.
- Swagger **không nói** việc publish lịch thi có tự tạo thông báo hay không.
- Web chỉ có trang thông báo cho Lecturer (`/lecturer/notifications`) và Examiner (`/examiner/notifications`, `/manage`). **Không thấy trang thông báo cho Student** trong router.

## 3. Thiếu API nếu không có thông báo thì sao
Tạo, gán, xếp chỗ, validate và publish lịch thi **không phụ thuộc** thông báo. Sinh viên vẫn thấy lịch ở `GET /me/exam-schedules`, chỉ là không có tin báo.

## 4. Thay đổi code đã thực hiện (đã ghi vào `src/`)

**Nối thông báo sau khi publish lịch**
- `src/features/examiner/workflow/publishNotification.ts` (mới): sau khi publish các lịch, lấy enrollments và invigilators (bỏ người đã hủy, loại trùng), tạo thông báo `ExamSchedulePublished` với audience `Users`, rồi publish. Trả `sent` / `skipped` / `failed`, không ném lỗi vì lịch đã publish.
- `src/features/examiner/routes/ScheduleReadinessRoute.tsx`: gọi hàm trên và báo kết quả trong toast (gửi được N người / chỉ X trên Y / không gửi được / không có ai để gửi).
- `src/api/notifications.ts`: thêm `ManagedNotificationCreateInput` để `createManagedNotification` nhận loại `ExamSchedulePublished`.
- Test mới: `publishNotification.test.ts`.

**Camera policy (chỉ lớp API)**
- `src/api/exams.ts`: `getExamCameraPolicy`, `updateExamCameraPolicy` (If-Match).
- Test mới: `src/api/exams.cameraPolicy.test.ts`.

**Hiển thị trạng thái lỗi/rỗng**
- `src/features/lecturer/exams/routes/InvigilationAvailabilityRoute.tsx`: có trạng thái đang tải, lỗi kèm lý do và nút Try again, danh sách rỗng kèm hướng dẫn; dropdown khóa khi đang tải/lỗi/rỗng; lưu thất bại có toast. Test mới: `InvigilationAvailabilityRoute.test.tsx`.
- `src/features/examiner/routes/InvigilationPeriodsRoute.tsx`: hiện khung lỗi kèm lý do BE cho thao tác tạo/sửa kỳ, đổi trạng thái, thêm/sửa slot, xóa. Nguyên nhân gốc: `providers.tsx` chỉ có `QueryCache` bắt lỗi truy vấn đọc, không có `MutationCache` nên lỗi thao tác ghi im lặng.
- Hai màn trên import `describeError` từ `@/app/providers`. Nếu lint/kiến trúc phàn nàn, chuyển hàm này sang file riêng.

**Chưa chạy** `npm run lint`, `npm run test`, `npm run build`, `npm run check:ui` (không có shell trên máy người dùng). Mới kiểm tra cú pháp. Chưa commit gì.

## 5. Điều chưa kiểm chứng (cần thử trên server thật)

1. **Thông báo có bị trùng không.** Nếu BE đã tự tạo thông báo khi publish lịch, sinh viên sẽ nhận hai tin. Kiểm tra: publish thử một lịch rồi xem `GET /me/notifications` của một sinh viên.
2. **`studentId`/`lecturerId` có phải user ID không.** Với sinh viên khá chắc (FE chọn bằng `userId`). Với giám thị chưa chắc. Nếu sai, `recipientCount` sẽ thấp hơn dự kiến và toast hiện "X of Y".
3. **Quyền Examiner tạo thông báo.** Swagger chỉ khai báo Bearer chung, không ghi role từng endpoint. Nếu bị từ chối sẽ hiện toast "could not be sent".
4. **If-Match của thông báo.** FE tự ghép ETag dạng `"{id}-{revision}"` (không dấu gạch). Nếu server dùng định dạng khác, sửa/publish/xóa thông báo sẽ lỗi.
5. **Student web** chưa có nơi xem thông báo. Kiểm tra phía sinh viên qua Swagger (`GET /me/notifications`, `GET /me/exam-schedules`) hoặc desktop app.
6. **Chính xác lý do 400** khi tạo kỳ đăng ký (xem mục 6).

## 6. Lỗi đã gặp khi test tay

- **`POST /invigilation-periods` trả 400.** Payload FE khớp schema `InvigilationPeriodRequestModel` (ngày `yyyy-MM-dd`, giờ ISO). Nhiều khả năng do quy tắc kiểm tra ở BE (giờ mở đăng ký ở quá khứ, giờ đóng trước giờ mở, ngày thi ngoài học kỳ hoặc trước giờ đóng đăng ký), nhưng đây chỉ là suy đoán. Sau khi sửa FE, khung lỗi đỏ trên màn sẽ hiện lý do BE trả về. Nếu vẫn chưa rõ, lấy tab Network → Response của request đó.
- **`GET` trả 500** cho `invigilation-periods`, `me/notifications/unread-count`, `Semesters`. Nhiều endpoint khác nhau, kể cả endpoint không tham số, nên lỗi ở phía BE (có thể là database hoặc lỗi dùng chung). Chưa kết luận BE sập hẳn, vì trước đó server vẫn trả được 400. Kiểm tra: mở `/health`, gọi `GET /api/v1/Semesters` trong Swagger, xem log container `learnable-api` (`docker logs learnable-api --tail 100`).
- **Lecturer không chọn được kỳ đăng ký** (dropdown trống): danh sách kỳ rỗng. Điều kiện cần: Examiner tạo kỳ, thêm ít nhất 1 slot, mở đăng ký (`Draft` → `Open`); kỳ cùng trường/học kỳ với lecturer; lecturer có hồ sơ giảng viên đang hoạt động. Ô chọn slot bị khóa khi `canRegister` là false (kỳ chưa Open hoặc ngoài khoảng thời gian đăng ký).

## 7. Điều kiện nền trước khi lập lịch

1. Staff (`/staff/exam-rooms`): có phòng thi kèm ghế, đủ chỗ.
2. Examiner (`/examiner/invigilation-periods`): tạo kỳ, thêm slot, **Open**.
3. Lecturer (`/lecturer/invigilation-availability`): đăng ký slot.
4. Có sinh viên (Student profile) cùng trường.
5. Chế độ dữ liệu demo đã được gỡ khỏi FE (không còn nút bật/tắt và không còn dữ liệu giả); mọi màn đều dùng dữ liệu thật từ BE.

## 8. Các route chính

- Lecturer: `/lecturer/questions/new`, `/lecturer/questions/import`, `/lecturer/invigilation-availability`, `/lecturer/notifications`
- Examiner tạo đề: `/examiner/exams/new/setup` → `.../questions` → `.../operations`
- Examiner lập lịch: `/examiner/schedule/new/details` → `.../candidates` → `.../readiness`
- Examiner khác: `/examiner/invigilation-periods`, `/examiner/notifications`, `/examiner/notifications/manage`

## 9. Các nhận định đã sửa trong phiên (tránh hiểu nhầm)

- Ban đầu kết luận BE **chưa có** API exam/lịch/thông báo là **sai** (dựa trên tài liệu cũ và bản upload thiếu `src/`). Thực tế Swagger mới đã có đủ.
- Ban đầu nói FE chưa gọi import danh sách sinh viên là **sai**: đã nối trong `api/invigilation.ts`.
- Quy tắc dự án quan trọng: không báo thành công khi chưa có thao tác backend; không dùng fixture thay API lỗi; `src/shared/` không import `@/api`, `@/app`, `@/features`, `@/lib`, `@/mocks`, `@/styles`; target tương tác tối thiểu 44×44 px; không `outline: none`; không màu hex cứng.

## 10. Việc tiếp theo (theo thứ tự)

1. Chạy `npm run lint`, `npm run test`, `npm run build`, `npm run check:ui`; sửa lỗi nếu có.
2. Xác nhận BE khỏe (`/health`, Swagger), rồi tạo lại kỳ đăng ký; đọc lý do 400 nếu còn.
3. Chạy trọn luồng ở mục 7–8 và kiểm tra 6 điểm ở mục 5, đặc biệt thông báo trùng.
4. Nếu BE tự gửi thông báo khi publish lịch, bỏ phần FE tự gửi (`publishNotification.ts`).
5. Quyết định có làm màn thông báo cho Student trên web hay chỉ dùng desktop.
6. Nếu cần TTS ở server, yêu cầu nhóm BE bổ sung API; hiện chỉ có upload MP3.
7. Chỉ khi cần: thêm giao diện chỉnh camera policy cho exam đã tạo.
