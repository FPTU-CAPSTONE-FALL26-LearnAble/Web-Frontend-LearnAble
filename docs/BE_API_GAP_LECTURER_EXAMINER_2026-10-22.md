# Báo cáo API cho Lecturer và Examiner

| Thuộc tính | Giá trị |
|---|---|
| Ngày lập | 22/10/2026 |
| Phiên bản tài liệu | 1.0 |
| Backend kiểm tra | `https://backend-learnable.onrender.com` |
| Swagger | `https://backend-learnable.onrender.com/swagger/index.html` |
| Phạm vi | Lecturer và Examiner |
| Mục tiêu | Tổng hợp API đã có, mức độ FE đang sử dụng và API Backend còn thiếu |

## 1. Kết luận nhanh

| Role | Mức độ hỗ trợ hiện tại | Kết luận |
|---|---|---|
| Lecturer | Một phần | Đã có API cho Questions, Question Options, Topics và Learning Materials. Chưa đủ cho Question Bank tách Exam/Practice, import file hoàn chỉnh, hồ sơ cá nhân và nghiệp vụ lịch thi/điểm danh. |
| Examiner | Rất hạn chế | Hiện chỉ dùng được các API đọc catalog chung. Chưa có API chuyên biệt để tạo Exam Paper, lập lịch, tạo Exam Session, phân công, tạo mã thi, giám sát hoặc xử lý sự cố. |

> Lưu ý quan trọng: trong source Backend hiện tại không có action nào khai báo riêng `Roles = "Examiner"`. Examiner chỉ truy cập được các endpoint GET dùng chính sách `[Authorize]` chung.

## 2. Cơ chế xác thực và multi-tenancy đã có

| Method | Endpoint | Dữ liệu/chức năng chính | Lecturer | Examiner | FE đã nối |
|---|---|---|:---:|:---:|:---:|
| POST | `/api/v1/auth/login` | `identifier`, `password`; trả token, `universityId`, `isSuperAdmin` | Có | Có | Có |
| POST | `/api/v1/auth/logout` | Thu hồi refresh token | Có | Có | Có |
| POST | `/api/v1/auth/refresh-token` | Làm mới access token | Có | Có | Có |
| GET | `/api/v1/auth/me` | `userId`, `universityId`, `isSuperAdmin`, `fullName`, `email`, `role` | Có | Có | Có |

Backend đã áp dụng tenant isolation dựa trên `university_id` trong JWT. FE Lecturer và Examiner không cần tự gửi `UniversityId` để giới hạn dữ liệu của trường đang đăng nhập.

## 3. API catalog dùng chung đã có

Các endpoint GET dưới đây dùng `[Authorize]`, vì vậy Lecturer và Examiner đều có thể đọc dữ liệu thuộc tenant hiện tại.

| Nhóm | Method | Endpoint | Bộ lọc quan trọng | FE Lecturer | FE Examiner |
|---|---|---|---|:---:|:---:|
| Subjects | GET | `/api/v1/Subjects` | `SearchTerm`, `DepartmentId`, `UniversityId`, `IsActive`, `SortBy`, `PageNumber`, `PageSize` | Đã nối | Đã nối |
| Subjects | GET | `/api/v1/Subjects/{id}` | `id` | Chưa dùng trực tiếp | Chưa dùng trực tiếp |
| Semesters | GET | `/api/v1/Semesters` | `SearchTerm`, `Status`, `AcademicYear`, `UniversityId`, `SortBy`, `PageNumber`, `PageSize` | Chưa dùng chính | Đã nối |
| Semesters | GET | `/api/v1/Semesters/{id}` | `id` | Chưa dùng | Chưa dùng |
| Topics | GET | `/api/v1/Topics` | `SearchTerm`, `SubjectId`, `IsActive`, `SortBy`, `PageNumber`, `PageSize` | Đã nối | Đã nối |
| Topics | GET | `/api/v1/Topics/{id}` | `id` | Chưa dùng trực tiếp | Chưa dùng trực tiếp |
| Questions | GET | `/api/v1/Questions` | `SearchTerm`, `TopicId`, `CreatedBy`, `QuestionType`, `Difficulty`, `Status`, `SortBy`, `PageNumber`, `PageSize` | Chưa dùng cho hai Question Bank | Đã nối tại Question Selection |
| Questions | GET | `/api/v1/Questions/{id}` | `id` | Chưa dùng chính | Đã nối cho Preview |
| Question Options | GET | `/api/v1/QuestionOptions` | Theo các query Swagger cung cấp | Chưa dùng riêng | Có thể nhận qua Question detail |
| Question Options | GET | `/api/v1/QuestionOptions/{id}` | `id` | Chưa dùng | Chưa dùng |
| Learning Materials | GET | `/api/v1/LearningMaterials` | `SearchTerm`, `TopicId`, `UploadedBy`, `MaterialType`, `OcrStatus`, `Status`, phân trang | Đã nối | Chưa dùng |
| Learning Materials | GET | `/api/v1/LearningMaterials/{id}` | `id` | Chưa dùng trực tiếp | Chưa dùng |

Các giá trị enum câu hỏi Backend hiện hỗ trợ:

| Biến | Giá trị hợp lệ |
|---|---|
| `questionType` | `Single`, `Multiple`, `Essay` |
| `difficulty` | `Easy`, `Medium`, `Hard` |
| `status` | `Draft`, `Active`, `Archived` |

## 4. API Lecturer đã có

### 4.1 Questions

| Method | Endpoint | Role cho phép | Mục đích | FE hiện tại |
|---|---|---|---|---|
| GET | `/api/v1/Questions` | Mọi user đã đăng nhập | Tìm kiếm/lọc câu hỏi | Examiner đã dùng; Lecturer Question Bank vẫn dùng mock vì thiếu `purpose` |
| GET | `/api/v1/Questions/{id}` | Mọi user đã đăng nhập | Xem chi tiết câu hỏi | Chưa nối vào Lecturer Studio |
| POST | `/api/v1/Questions` | Lecturer | Tạo câu hỏi | Chưa nối; Create Question đang lưu browser draft |
| PUT | `/api/v1/Questions/{id}` | Lecturer, Admin | Cập nhật câu hỏi | Chưa nối |
| PATCH | `/api/v1/Questions/{id}/archive` | Lecturer, Admin | Archive câu hỏi | Chưa nối |

### 4.2 Question Options

| Method | Endpoint | Role cho phép | Mục đích | FE hiện tại |
|---|---|---|---|---|
| GET | `/api/v1/QuestionOptions` | Mọi user đã đăng nhập | Danh sách đáp án | Chưa gọi riêng |
| GET | `/api/v1/QuestionOptions/{id}` | Mọi user đã đăng nhập | Chi tiết đáp án | Chưa nối |
| POST | `/api/v1/QuestionOptions` | Lecturer, Admin | Tạo đáp án | Chưa nối |
| PUT | `/api/v1/QuestionOptions/{id}` | Lecturer, Admin | Sửa đáp án | Chưa nối |
| DELETE | `/api/v1/QuestionOptions/{id}` | Lecturer, Admin | Xóa đáp án | Chưa nối |

### 4.3 Topics

| Method | Endpoint | Role cho phép | Mục đích | FE hiện tại |
|---|---|---|---|---|
| POST | `/api/v1/Topics` | Lecturer | Tạo topic | Chưa nối |
| PUT | `/api/v1/Topics/{id}` | Lecturer, Admin | Sửa topic | Chưa nối |
| PATCH | `/api/v1/Topics/{id}/activate` | Lecturer, Admin | Kích hoạt topic | Chưa nối |
| PATCH | `/api/v1/Topics/{id}/deactivate` | Lecturer, Admin | Vô hiệu hóa topic | Chưa nối |

### 4.4 Learning Materials

| Method | Endpoint | Role cho phép | Mục đích | FE hiện tại |
|---|---|---|---|---|
| GET | `/api/v1/LearningMaterials` | Mọi user đã đăng nhập | Danh sách tài liệu | Đã nối |
| GET | `/api/v1/LearningMaterials/{id}` | Mọi user đã đăng nhập | Chi tiết tài liệu | Chưa nối |
| POST | `/api/v1/LearningMaterials` | Lecturer | Tạo metadata tài liệu | Chưa nối hoàn chỉnh |
| PUT | `/api/v1/LearningMaterials/{id}` | Lecturer, Admin | Sửa metadata | Chưa nối |
| PATCH | `/api/v1/LearningMaterials/{id}/publish` | Lecturer, Admin | Publish tài liệu | Chưa nối |
| PATCH | `/api/v1/LearningMaterials/{id}/archive` | Lecturer, Admin | Archive tài liệu | Chưa nối |

> Endpoint tạo Learning Material hiện chỉ lưu metadata; file thực tế được mô tả là upload ở nơi khác nhưng Swagger chưa có endpoint upload file tương ứng.

### 4.5 Lecturer Profile

| Method | Endpoint | Role cho phép | Nhận xét |
|---|---|---|---|
| GET | `/api/v1/LecturerProfiles` | Mọi user đã đăng nhập | Có thể lọc theo `UserId`, nhưng chưa có endpoint `/me` |
| GET | `/api/v1/LecturerProfiles/{id}` | Mọi user đã đăng nhập | Đọc theo profile ID |
| POST | `/api/v1/LecturerProfiles` | Admin | Lecturer không tự tạo profile |
| PUT | `/api/v1/LecturerProfiles/{id}` | Admin | Lecturer không tự sửa profile |
| DELETE | `/api/v1/LecturerProfiles/{id}` | Admin | Hợp lý nếu chỉ Admin quản lý |

## 5. API Examiner đã có

Backend chưa có resource chuyên biệt cho Examiner. Examiner hiện chỉ dùng được API đọc catalog chung.

| Nghiệp vụ FE | API hiện dùng | Trạng thái |
|---|---|---|
| Chọn môn học | `GET /api/v1/Subjects` | Đã nối |
| Chọn học kỳ | `GET /api/v1/Semesters` | Đã nối |
| Chọn topic | `GET /api/v1/Topics` | Đã nối |
| Tìm/lọc câu hỏi active | `GET /api/v1/Questions` | Đã nối |
| Preview câu hỏi | `GET /api/v1/Questions/{id}` | Đã nối |
| Exam dashboard | Không có API | Mock |
| Exam Paper Management | Không có API | Mock |
| Exam Setup | Không có API | Mock |
| Scheduling | Không có API | Mock |
| Room Monitoring | Không có API | Mock |
| Incident Management | Không có API | Mock |

## 6. API Backend còn thiếu cho Lecturer

### 6.1 Ưu tiên P0

| API đề xuất | Request/dữ liệu chính | Response mong đợi | Lý do |
|---|---|---|---|
| `POST /api/v1/Questions/with-options` | Question metadata và mảng options | Question hoàn chỉnh | Tránh tạo Question thành công nhưng tạo Options thất bại; cần transaction duy nhất |
| Bổ sung `purpose` cho Question | `Exam` hoặc `Practice` | Trả lại trong Question response và hỗ trợ filter | FE có hai ngân hàng Exam Questions và Practice Questions nhưng BE chưa phân loại được |
| `POST /api/v1/Questions/import` | File Excel/CSV, `subjectId`, `topicId`, `purpose` | Kết quả từng dòng: success/error | FE có Import nhưng chưa thể nối thật |
| `GET /api/v1/Questions/export` | Các filter hiện có và `purpose` | File Excel/CSV | Hỗ trợ Export Question Bank |
| `POST /api/v1/LearningMaterials/upload` | Multipart file và metadata | URL/file metadata đã lưu | UI Upload Material cần upload file thật, không chỉ metadata |

### 6.2 Ưu tiên P1

| API đề xuất | Mục đích |
|---|---|
| `GET /api/v1/LecturerProfiles/me` | Lấy đúng profile của Lecturer đang đăng nhập, không cần query `UserId` thủ công |
| `PUT /api/v1/LecturerProfiles/me` | Cho Lecturer cập nhật các trường được phép như bio, office room |
| `PATCH /api/v1/Questions/bulk-status` | Publish/archive nhiều câu hỏi |
| `GET /api/v1/Questions/summary` | Tổng số, active, draft, used-in-exams/practice |
| `GET /api/v1/LearningMaterials/summary` | Tổng hợp tài liệu theo trạng thái/OCR |
| `PATCH /api/v1/LearningMaterials/bulk-status` | Publish/archive nhiều tài liệu |

## 7. API Backend còn thiếu cho Examiner

### 7.1 P0 — Exam Paper

| Method | API đề xuất | Dữ liệu chính |
|---|---|---|
| GET | `/api/v1/ExamPapers` | Search, subject, semester, status, pagination |
| POST | `/api/v1/ExamPapers` | `subjectId`, `title`, `durationMinutes`, `totalScore`, `shuffleQuestions`, `shuffleOptions`, `proctoringPolicy` |
| GET | `/api/v1/ExamPapers/{id}` | Đề thi, cấu hình và câu hỏi |
| PUT | `/api/v1/ExamPapers/{id}` | Cập nhật cấu hình đề |
| PUT | `/api/v1/ExamPapers/{id}/questions` | Danh sách `questionId`, score, order |
| POST | `/api/v1/ExamPapers/{id}/validate` | Kiểm tra tổng điểm, số câu, đáp án và readiness |
| PATCH | `/api/v1/ExamPapers/{id}/approve` | Chuyển đề sang trạng thái sẵn sàng |
| PATCH | `/api/v1/ExamPapers/{id}/archive` | Đóng/lưu trữ đề |

### 7.2 P0 — Exam Schedule và Session

| Method | API đề xuất | Dữ liệu chính |
|---|---|---|
| GET | `/api/v1/ExamSchedules` | Semester, subject, date, status, pagination |
| POST | `/api/v1/ExamSchedules` | `examPaperId`, `semesterId`, ngày giờ, phòng, sức chứa |
| GET | `/api/v1/ExamSchedules/{id}` | Lịch thi và các session |
| PUT | `/api/v1/ExamSchedules/{id}` | Cập nhật ngày giờ/phòng/cấu hình |
| POST | `/api/v1/ExamSchedules/validate` | Kiểm tra trùng Student, Lecturer, phòng, sức chứa và Exam Paper readiness |
| POST | `/api/v1/ExamSchedules/{id}/sessions` | Tạo session theo từng phòng hoặc ca |
| PUT | `/api/v1/ExamSessions/{id}/students` | Danh sách sinh viên được phân vào session |
| PUT | `/api/v1/ExamSessions/{id}/invigilators` | Lecturer/giám thị được phân công |
| PATCH | `/api/v1/ExamSchedules/{id}/publish` | Công bố lịch thi |
| POST | `/api/v1/ExamSchedules/{id}/notify` | Gửi thông báo lịch thi cho người liên quan |

### 7.3 P0 — Mã thi, sơ đồ chỗ ngồi và điểm danh

| Method | API đề xuất | Dữ liệu/chức năng |
|---|---|---|
| POST | `/api/v1/ExamSessions/{id}/exam-code` | Tạo exam code và thời gian mở |
| PATCH | `/api/v1/ExamSessions/{id}/exam-code/reveal` | Mở/reveal mã thi đúng thời điểm |
| PATCH | `/api/v1/ExamSessions/{id}/exam-code/close` | Đóng mã thi |
| GET | `/api/v1/ExamSessions/{id}/seats` | Sơ đồ chỗ ngồi và trạng thái từng ghế |
| POST | `/api/v1/ExamSessions/{id}/seats/generate` | Xếp chỗ tự động |
| PUT | `/api/v1/ExamSessions/{id}/seats` | Điều chỉnh chỗ ngồi thủ công |
| GET | `/api/v1/ExamSessions/{id}/attendance` | Danh sách điểm danh |
| PATCH | `/api/v1/ExamSessions/{id}/attendance/{studentId}` | `Present`, `Absent`, `NotCheckedIn` và ghi chú |
| PATCH | `/api/v1/ExamSessions/{id}/start` | Bắt đầu ca thi |
| PATCH | `/api/v1/ExamSessions/{id}/finish` | Kết thúc ca thi |

### 7.4 P1 — Live Monitoring và Incident

| Method | API đề xuất | Mục đích |
|---|---|---|
| GET | `/api/v1/ExamSessions/{id}/kiosks` | Trạng thái online/offline và integrity của kiosk |
| GET | `/api/v1/ExamSessions/{id}/candidates/live` | Trạng thái `Started`, `Submitted`, `Disconnected`, `Cheating`, `Incident` |
| GET | `/api/v1/ExamSessions/{id}/submissions` | Theo dõi bài nộp và đồng bộ |
| POST | `/api/v1/ExamSessions/{id}/submissions/sync` | Yêu cầu đồng bộ lại submission |
| GET | `/api/v1/ExamSessions/{id}/incidents` | Danh sách sự cố |
| POST | `/api/v1/ExamSessions/{id}/incidents` | Ghi nhận sự cố |
| PATCH | `/api/v1/Incidents/{id}/resolve` | Xử lý/đóng sự cố |
| GET | `/api/v1/ExamSessions/{id}/audit-logs` | Nhật ký thao tác và thay đổi trạng thái |

## 8. Quy tắc phân quyền đề xuất

| Resource/action | Lecturer | Examiner | Admin |
|---|:---:|:---:|:---:|
| Đọc Subjects/Semesters/Topics | Có | Có | Có |
| Tạo/sửa Questions và Options | Có | Chỉ đọc | Có |
| Tạo/sửa Learning Materials | Có | Chỉ đọc hoặc không truy cập | Có |
| Tạo/sửa Exam Paper | Không | Có | Có |
| Validate/approve Exam Paper | Không | Có | Có |
| Tạo/sửa/publish Exam Schedule | Không | Có | Có |
| Phân công Lecturer và Student | Không | Có | Có |
| Điểm danh tại ca được phân công | Có, chỉ session được phân | Có | Có |
| Live monitoring và incident | Có, chỉ session được phân | Có | Có |
| Quản lý tenant/university | Không | Không | Super Admin |

## 9. Thứ tự triển khai Backend khuyến nghị

| Giai đoạn | Phạm vi | Kết quả FE có thể bỏ mock |
|---|---|---|
| 1 | Exam Paper + Question assignment + validation | Examiner Exam Setup và Question Selection có thể lưu thật |
| 2 | Exam Schedule + conflict validation + Exam Sessions | Examiner Scheduling và danh sách lịch Lecturer có dữ liệu thật |
| 3 | Student/Invigilator assignment + seating + attendance | Lecturer Attendance và Seating Map bỏ mock |
| 4 | Exam code lifecycle + session start/finish | Luồng mở mã và trạng thái ca thi hoạt động thật |
| 5 | Monitoring + incidents + submissions + audit logs | Examiner Live Monitoring bỏ mock |
| 6 | Question purpose/import/export + material file upload | Lecturer Question Bank và Upload Material hoàn thiện |

## 10. Tiêu chí nghiệm thu API mới

1. Tất cả endpoint phải áp dụng tenant isolation từ JWT; không tin `UniversityId` do Lecturer/Examiner tự gửi.
2. Mọi hành động phải kiểm tra đúng role và ownership/assignment, không chỉ kiểm tra đã đăng nhập.
3. Create Exam Paper cùng question assignment phải có transaction hoặc cơ chế rollback rõ ràng.
4. Validate Schedule cần trả lỗi có cấu trúc theo từng loại conflict để FE hiển thị chính xác.
5. Exam code không được trả về trước thời điểm mở; response locked chỉ trả trạng thái khóa.
6. Attendance và monitoring cần audit `performedBy`, thời gian và lý do thay đổi.
7. API danh sách cần hỗ trợ pagination, search, filter và sort thống nhất với convention hiện tại.
8. Swagger cần khai báo request/response schema, enum, role/policy và ví dụ lỗi 400/401/403/404/409.

---

Tài liệu này được lập từ Swagger Render và source authorization policy hiện có ngày 22/10/2026. Đây là báo cáo contract và backlog dành cho Backend developer; không mô tả các endpoint chưa tồn tại như thể chúng đã được triển khai.
