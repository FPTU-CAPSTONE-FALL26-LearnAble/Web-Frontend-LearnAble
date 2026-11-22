# Báo cáo so sánh API Frontend–Backend LearnAble

**Phiên bản:** 1.0  
**Ngày kiểm tra:** 18/09/2026 (Asia/Saigon)  
**Frontend:** nhánh `develop`, revision `4a215d0`, package `0.1.0`, có thay đổi local chưa commit  
**Nguồn Backend chính thức:** [Swagger Render](https://backend-learnable.onrender.com/swagger/index.html)  
**OpenAPI:** `LearnAble API v1` — 59 path, 92 operation, 17 nhóm controller  
**SHA-256 OpenAPI:** `63BE6F6337FD8C175218E316FEF2D99B466C0EA597813DFD89620A0B1DD6A28A`

> Báo cáo dùng Swagger đang triển khai trên Render làm nguồn contract. Code Backend local không được dùng vì có thể cũ hơn phiên bản đang chạy.

## 1. Kết luận tổng quan

Frontend hiện **chưa kết nối đầy đủ** với Backend.

| Hạng mục | Kết quả | Đánh giá |
|---|---|---|
| Backend | `/health` trả HTTP 200 ngày 18/09/2026 | Đang hoạt động |
| FE local → BE | Vite proxy `/api` sang Render | Hoạt động trên localhost |
| CORS | Preflight từ `http://localhost:5173` trả 204, `Access-Control-Allow-Origin: *` | Localhost được phép truy cập |
| Xác thực | Luồng thật `login → /auth/me` thành công với tài khoản Lecturer đã cung cấp | Đã kết nối |
| Role | BE: `Student`, `Lecturer`, `Examiner`, `Admin`; FE so sánh không phân biệt hoa thường | Đồng nhất |
| Lecturer | Đọc Questions, Materials, Subjects, Topics từ API thật | Kết nối một phần |
| Examiner | 14 màn hình dùng fixture/session state | Chưa kết nối API nghiệp vụ |
| Student | FE khai báo nhiều endpoint không có trong Swagger | Lệch contract |
| Production | `.env` dùng `VITE_API_BASE_URL=/api/v1` | Phải có reverse proxy production |

FE production hiện chỉ gọi **6/92 operation**: login, current user, danh sách Questions, Learning Materials, Subjects và Topics. Tỷ lệ 6,5% chỉ thể hiện độ phủ operation API, không phải phần trăm hoàn thành sản phẩm.

## 2. Phương pháp kiểm tra

- Quét `src/api`, router, React Query hooks, toàn bộ route Lecturer/Examiner, fixture và handler “not connected”.
- Tải OpenAPI live từ `https://backend-learnable.onrender.com/swagger/v1/swagger.json`.
- Gọi trực tiếp `/health`, Questions, LearningMaterials, Subjects và Topics trên Render.
- Kiểm tra CORS preflight và luồng thật `POST /auth/login` → `GET /auth/me`.
- So sánh Zod schema/query key của FE với schema, enum và response live của BE.
- Không ghi tài khoản, mật khẩu hoặc token vào báo cáo.
- ESLint chạy thành công. Lần kiểm tra đầy đủ gần nhất trước audit đạt build thành công và 59/59 test; lần chạy lại trong audit bị command runner desktop hết thời gian trước khi ghi nhận kết quả hoàn chỉnh.

## 3. Danh mục Backend hiện tại

| Controller | Số operation | FE đang dùng |
|---|---:|---|
| Auth | 4 | Login, current user |
| CourseSections | 7 | Chưa dùng |
| Curriculums | 6 | Chưa dùng |
| Departments | 6 | Chưa dùng |
| Health | 1 | Kiểm tra vận hành thủ công |
| LearningMaterials | 6 | Chỉ danh sách |
| LecturerProfiles | 5 | Chưa dùng |
| Majors | 6 | Chưa dùng |
| QuestionOptions | 5 | Không gọi trực tiếp; đọc lồng trong Question |
| Questions | 5 | Chỉ danh sách |
| Semesters | 6 | Chưa dùng |
| Specializations | 6 | Chưa dùng |
| StudentProfiles | 6 | Chưa dùng |
| Subjects | 6 | Chỉ danh sách |
| Syllabi | 6 | Chưa dùng |
| Topics | 6 | Chỉ danh sách |
| Users | 5 | Chưa dùng |
| **Tổng** | **92** | **6 operation, gồm Auth** |

## 4. Ma trận kết nối endpoint

### 4.1 Đã kết nối và kiểm chứng

| Chức năng FE | Request FE | Swagger | Biến | Kết quả |
|---|---|---|---|---|
| Login | `POST /auth/login` | `POST /api/v1/auth/login` | `identifier`, `password` | Đã test live |
| Current user | `GET /auth/me` | `GET /api/v1/auth/me` | Bearer token | Đã test live |
| Question Bank | `GET /Questions` | `GET /api/v1/Questions` | `CreatedBy`, `SearchTerm`, `TopicId`, `QuestionType`, `Status`, paging, `SortBy` | Đã nối |
| Learning Materials | `GET /LearningMaterials` | `GET /api/v1/LearningMaterials` | `UploadedBy`, `SearchTerm`, `TopicId`, `MaterialType`, `Status`, paging, `SortBy` | Đã nối |
| Subjects | `GET /Subjects` | `GET /api/v1/Subjects` | `IsActive`, paging | Đã nối |
| Topics | `GET /Topics` | `GET /api/v1/Topics` | `SubjectId`, paging | Đã nối |

Với `.env` local, API client ghép `/Questions` với `/api/v1`; Vite proxy chuyển request sang Render nên khớp Swagger.

### 4.2 BE đã có nhưng FE chưa dùng

| Năng lực BE | Endpoint/operation có sẵn | Trạng thái FE | Khoảng trống |
|---|---|---|---|
| Vòng đời token | refresh-token, logout | Chỉ lưu/xóa token local | Không tự refresh; không thu hồi refresh token khi sign-out |
| Questions | create, detail, update, archive | Studio dùng local draft | Chưa ghi dữ liệu |
| QuestionOptions | CRUD | Đáp án chỉ ở state local | Chưa lưu option/transaction question + options |
| LearningMaterials | create, detail, update, publish, archive | Upload chỉ giữ `File` local | Chưa upload/ghi dữ liệu |
| LecturerProfiles | CRUD | Profile dùng fixture | Chưa dùng API có sẵn |
| CourseSections | CRUD, open/close/cancel | FE đang dùng Subject làm “Course” | Chưa nối lớp học phần/phân công |
| Semesters | CRUD/start/close | Sidebar/lịch dùng fixture | Chưa dùng API có sẵn |
| Users/Departments/Majors/Specializations | API quản trị | Chưa có workspace Admin | Chưa có FE |
| Curriculums/Syllabi | API học thuật | Chưa có màn hình quản lý | Chưa có FE |

### 4.3 FE có client nhưng Swagger không có endpoint

| Module FE | Endpoint FE mong đợi | Swagger |
|---|---|---|
| Danh sách Practice | `GET /api/v1/practice-sets` | Không có |
| Chi tiết Practice | `GET /api/v1/practice-sets/{setId}` | Không có |
| Tiến độ luyện tập | `GET /api/v1/students/me/practice-progress` | Không có |
| Danh sách kết quả | `GET /api/v1/students/me/exam-results` | Không có |
| Chi tiết kết quả | `GET /api/v1/students/me/exam-results/{sessionId}` | Không có |
| Trợ lý | `POST /api/v1/assistant/chat` | Không có |
| Đọc accessibility profile | `GET /api/v1/students/me/accessibility-profile` | Không có |
| Cập nhật accessibility profile | `PUT /api/v1/students/me/accessibility-profile` | Không có |

## 5. So sánh tên biến và contract

### 5.1 Authentication và role

| Khái niệm | FE | BE | Trạng thái |
|---|---|---|---|
| Tài khoản | `identifier` | `identifier` | Khớp |
| Mật khẩu | `password` | `password` | Khớp |
| Access token | `accessToken` | `accessToken` | Khớp |
| Refresh token | `refreshToken` | `refreshToken` | Khớp nhưng chưa dùng sau login |
| Hết hạn | `accessTokenExpiresAt` | `accessTokenExpiresAt` | Khớp |
| ID người dùng | FE đổi `userId` thành `id` | `userId` | Adapter có chủ đích |
| Họ tên/email | `fullName`, `email` | `fullName`, `email` | Khớp |
| Role | string được trim/lowercase | enum `Student/Lecturer/Examiner/Admin` | Khớp |
| Lecturer guard | `lecturer` | Live trả `Lecturer` | Khớp |
| Examiner guard | `examiner` | Enum có `Examiner` | Contract khớp; chưa test login Examiner |
| Admin | Rơi về `/practice` | Enum có `Admin` | Thiếu route/guard Admin |

`getPostLoginDestination` ưu tiên `requestedPath` trước khi kiểm tra role. Guard vẫn ngăn truy cập sai role, nhưng nên xác thực requested path theo role để tránh chuyển hướng vòng.

### 5.2 Question

| Field | FE | BE Swagger | Trạng thái |
|---|---|---|---|
| `questionId` | string | string/UUID | Khớp |
| `topicId`, `createdBy` | nullable string | string | FE rộng hơn |
| `content` | string bắt buộc | nullable string | **BE trả null làm FE parse lỗi** |
| `questionType` | string bắt buộc | response nullable; request enum | Có nguy cơ lệch |
| `difficulty` | string bắt buộc | response nullable; `Easy/Medium/Hard` | Có nguy cơ lệch |
| `defaultScore` | number | double | Khớp |
| `status` | string bắt buộc | nullable; `Draft/Active/Archived` | Có nguy cơ lệch |
| `createdAt` | string | date-time string | Khớp |
| `updatedAt` | optional nullable | date-time string | FE rộng hơn |
| `options` | optional array | nullable array | Khớp trong response hiện tại |

**Lệch lớn:** FE hỗ trợ `Single Choice`, `Multiple Choice`, `Essay`, `Write Code`, `MathML/LaTeX`, `Diagram/Sonification`; BE chỉ nhận `Single` và `Multiple`. Bốn loại còn lại chưa thể submit.

Draft FE dùng `course`, `topic`, `prompt`, field riêng theo loại, rubric và object URL ảnh/audio. BE create dùng `topicId`, `content`, `questionType`, `difficulty`, `audioHintText`, `defaultScore`, `sourceType`. Cần mapper chính thức và contract lưu dữ liệu theo loại.

### 5.3 Learning Material

| Field | FE | BE Swagger | Trạng thái |
|---|---|---|---|
| ID/topic/uploader | Có | Có | Khớp |
| `title` | bắt buộc | nullable | Có nguy cơ parse lỗi |
| `materialType` | bắt buộc | nullable response, enum khi ghi | Có nguy cơ lệch |
| File metadata | nullable | nullable | Khớp |
| `ocrStatus`, `status` | bắt buộc | nullable | Có nguy cơ parse lỗi |
| `uploadedAt` | string | date-time string | Khớp |

**Lệch lớn:** UI nhận `PDF`, `DOCX`, `PPTX`, `MP3`, `MP4`, `EPUB`; BE chỉ nhận `PDF`, `DOCX`, `IMAGE`, `TEXT`, `AUDIO`. `PPTX`, `MP4`, `EPUB` chưa có mapping.

BE nhận metadata và `fileUrl`, nhưng Swagger chưa có multipart upload, presigned URL, finalize object storage, checksum, progress, OCR job hoặc event trạng thái. FE chưa thể biến file local thành `fileUrl` bền vững.

### 5.4 Subject, Topic và query

| Field | FE | BE | Trạng thái |
|---|---|---|---|
| `subjectId`, `topicId`, Topic `subjectId` | string | string | Khớp |
| `subjectCode` | bắt buộc | nullable | Có nguy cơ parse lỗi |
| `subjectNameEn` | nullable | nullable | Khớp |
| `topicName` | bắt buộc | nullable | Có nguy cơ parse lỗi |
| `topicCode` | optional nullable | nullable | Khớp |

Dữ liệu seed live hiện đầy đủ nên UI đang chạy, nhưng OpenAPI cho phép null mà Zod FE từ chối.

FE dùng đúng query PascalCase của Swagger: `CreatedBy`, `UploadedBy`, `SearchTerm`, `TopicId`, `SubjectId`, `PageNumber`, `PageSize`, `SortBy`.

## 6. Tiến độ Lecturer

| Route | UI | API | Việc còn lại |
|---|---|---|---|
| `/lecturer/dashboard` | Hoàn chỉnh bằng fixture | Không có dashboard API | Thêm endpoint tổng hợp |
| `/lecturer/questions` | Hoàn chỉnh | Đọc Questions/Subjects/Topics thật | Nối detail/edit/archive/bulk/import/export/usage |
| `/lecturer/questions/new` | Studio 6 loại, local draft | Chỉ đọc academic options | Chốt type, map payload, lưu question/options |
| `/lecturer/materials` | Hoàn chỉnh | Đọc Materials/Subjects/Topics thật | Nối detail/publish/archive/bulk/thống kê |
| `/lecturer/materials/new` | File local và metadata | Chỉ đọc academic options | Thêm storage upload và create/finalize |
| `/lecturer/exams` | Fixture hoàn chỉnh | Không có API lịch/phân công | Thêm API lịch Lecturer |
| `/lecturer/exams/:examId/attendance` | Fixture hoàn chỉnh | Không có attendance API | Thêm roster/check-in/write |
| `/lecturer/profile` | Fixture hoàn chỉnh | LecturerProfiles đã có | Nối theo `UserId`/self-profile |

Lecturer hiện **chỉ tích hợp đọc một phần**. Question Bank và Learning Materials là hai màn hình role-specific lấy danh sách thật.

## 7. Tiến độ Examiner

Cả 14 route Examiner đã có UI nhưng dữ liệu đến từ fixture hoặc browser session state.

| Năng lực | UI | API Swagger | Trạng thái |
|---|---|---|---|
| Dashboard/điều hành | Có | Không có | Fixture |
| Ngân hàng đề | Có | Không có ExamPaper | Fixture |
| Thiết lập đề | Có | Không có | Local |
| Chọn câu hỏi/ma trận | Có | Không có API gán câu hỏi vào đề | Fixture/local |
| Cấu hình bảo mật | Có | Không có | Local |
| Readiness/phát hành đề | Có | Không có | Local |
| Schedule cockpit | Có | Không có | Fixture |
| Chi tiết ca thi | Có | Không có | Local |
| Phòng/giám thị | Có | Không có | Session state |
| Thí sinh/chỗ ngồi | Có | StudentProfiles không thay thế roster/seating | Fixture/local |
| Readiness/phát hành lịch | Có | Không có | Session state, release bị khóa |
| Live/Room/Candidate monitoring | Có | Không có | Fixture |

Tên role Examiner tương thích với Auth, nhưng **độ phủ API nghiệp vụ Examiner là 0%**.

## 8. API cần bổ sung theo logic dự án

Đây là đề xuất domain suy ra từ UI; BE/BA cần chốt tên và payload.

### P0 — xác thực và production

1. Nối `POST /auth/refresh-token` với single-flight refresh và retry một lần.
2. Nối `POST /auth/logout` trước khi xóa token local.
3. Chọn reverse proxy `/api/v1` hoặc đặt production base URL đầy đủ tới Render.
4. Kiểm tra authorization: Questions, Learning Materials, Subjects, Topics đang trả HTTP 200 không cần Bearer dù Swagger khai báo Bearer toàn cục. Questions/material thuộc Lecturer không nên bị liệt kê ẩn danh nếu không có yêu cầu rõ ràng.

### P1 — Lecturer

1. Lưu nguyên tử question cùng options/payload theo loại.
2. Thống nhất 6 question type FE với 2 type BE.
3. Thêm presigned/init upload, object upload, finalize/create material và processing status.
4. Thống nhất định dạng material, đặc biệt PPTX, MP4, EPUB.
5. Nối LecturerProfiles và Semesters.
6. Thêm lịch/phân công Lecturer, roster và API ghi attendance.
7. Thêm endpoint summary cho dashboard/stat card.

### P1 — Examiner

- `ExamPapers`: metadata, blueprint, version, status, approval/release, mã hóa.
- `ExamPaperQuestions`: gán/thứ tự câu hỏi, điểm, validation tổng.
- `ExamShifts`: môn, semester, thời gian, campus, status, lifecycle.
- `ExamRooms`, `Workstations`: sức chứa, readiness, network/secure browser.
- `InvigilatorAssignments`: role, phòng, conflict, coverage.
- `ExamCandidates`, `SeatAssignments`: eligibility, phòng, ghế, import, conflict.
- `Attendance`: cửa sổ check-in, trạng thái, bulk mark, audit log.
- `ExamSessions`: start/pause/resume/submit, thời gian và tiến độ.
- `Monitoring`: heartbeat, telemetry, SSE/WebSocket.
- `Incidents`, `IntegrityEvents`: mức độ, bằng chứng, xử lý.
- `Submissions`: reconciliation và audit trail.
- `Readiness`: blocker do server tính và điều kiện release.

Backend phải quyết định các quyền theo thời gian, ví dụ chỉ mở attendance trước giờ thi 30 phút, không tin vào trạng thái nút ở FE.

### P2 — Student/Assistant/Accessibility

Bổ sung tám endpoint ở mục 4.3 hoặc tạm ẩn/xóa route cho đến khi contract tồn tại. Client trỏ đến path không tồn tại sẽ lỗi runtime khi MSW tắt.

## 9. Rủi ro tích hợp

| Mức độ | Rủi ro | Ảnh hưởng | Khuyến nghị |
|---|---|---|---|
| Nghiêm trọng | Base URL production tương đối, chưa xác nhận reverse proxy | FE deploy có thể gọi chính host FE và nhận 404 | Cấu hình theo environment và smoke test |
| Nghiêm trọng | Swagger khai báo Bearer nhưng API danh sách đọc được ẩn danh | Nguy cơ lộ dữ liệu | Chốt public/private và enforce server-side |
| Cao | Chưa nối refresh/logout | Hết session đột ngột; refresh token không bị thu hồi | Hoàn thiện token lifecycle |
| Cao | 6 question type FE và 2 type BE | Bốn Studio mode không lưu được | Thống nhất payload mở rộng |
| Cao | Format upload và contract file lệch | Không thể lưu file | Thiết kế storage/enum contract |
| Cao | Examiner không có domain API | Toàn bộ chỉ là mô phỏng | Triển khai nhóm resource Examiner P1 |
| Trung bình | Nullability Swagger và Zod FE lệch | Response hợp lệ có thể thành `api:parse` | Đồng nhất hoặc normalize trong adapter |
| Trung bình | Admin không có destination | Admin rơi vào Student practice | Thêm route/guard Admin |
| Trung bình | Client không có timeout/request correlation | Cold start có thể chờ lâu | Thêm AbortSignal timeout/request ID |
| Trung bình | FE bỏ error body từ server | Không hiển thị lỗi validation/conflict cụ thể | Parse error envelope chuẩn |

## 10. Thứ tự triển khai khuyến nghị

1. Sửa base URL/reverse proxy production và nối refresh/logout.
2. Chốt contract có version cho question type, material format, file upload.
3. Nối LecturerProfiles, Semesters và API ghi Questions/Materials đã có.
4. Xây Examiner domain từ ExamPapers, ExamShifts, assignments, candidates/seats, readiness.
5. Bổ sung Attendance và Monitoring với thời gian do server kiểm soát và audit history.
6. Chốt phạm vi Student; thêm endpoint hoặc bỏ client/route chưa hoạt động.
7. Sinh TypeScript type từ OpenAPI hoặc thêm contract test theo Swagger snapshot để ngăn lệch tên/nullability.

## 11. Kết luận cuối

- FE và BE đã kết nối thành công cho Authentication và bốn resource đọc của Lecturer.
- Lecturer mới tích hợp một phần; luồng ghi và vận hành vẫn dùng local/fixture.
- Examiner có UI prototype hoàn chỉnh nhưng chưa có API nghiệp vụ.
- Role Lecturer và Examiner đồng nhất.
- Blocker lớn nhất là routing production, vòng đời token, chính sách truy cập ẩn danh, lệch contract question/material và thiếu toàn bộ domain Examiner.

Báo cáo phản ánh Swagger deploy và workspace Frontend tại ngày 18/09/2026. Cần audit lại khi Swagger Render hoặc lớp API FE thay đổi.
