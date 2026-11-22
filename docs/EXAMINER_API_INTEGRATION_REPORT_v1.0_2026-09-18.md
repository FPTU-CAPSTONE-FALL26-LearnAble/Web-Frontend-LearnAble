# Báo cáo tích hợp API khu vực Examiner

**Phiên bản:** 1.0  
**Ngày:** 18/09/2026 (Asia/Saigon)  
**Frontend:** `Web-Frontend-LearnAble`, có thay đổi local chưa commit  
**Nguồn contract duy nhất:** [Swagger Render](https://backend-learnable.onrender.com/swagger/index.html)  
**OpenAPI kiểm tra lại:** LearnAble API v1 — 59 path, 92 operation, 17 nhóm controller

> Báo cáo này phản ánh trạng thái sau đợt tích hợp API đọc dùng chung vào khu vực Examiner. Không sử dụng Backend local, không chỉnh sửa Backend và không gọi API ghi.

## 1. Kết luận

Khu vực Examiner đã được nối với các API thật có ý nghĩa nghiệp vụ trên Backend hiện tại:

- Subjects và Semesters cho bước Exam Setup.
- Questions, Question detail/options và Topics cho bước Question Selection.
- Subjects và Semesters cho bước Schedule Details.
- Auth/role guard tiếp tục dùng luồng xác thực chung hiện có.

Backend chưa có resource Exam Paper, Exam Shift, Exam Room assignment, Candidate roster, Attendance hoặc Monitoring. Vì vậy các màn hình tương ứng vẫn dùng fixture hoặc state trong trình duyệt và được ghi rõ là simulation. Frontend không dùng Question để giả làm Exam Paper và không dùng StudentProfile để giả làm Candidate của một ca thi.

## 2. Endpoint đã nối

| Endpoint Render          | Phương thức | Route Examiner sử dụng           | Mục đích                                        | Trạng thái |
| ------------------------ | ----------- | -------------------------------- | ----------------------------------------------- | ---------- |
| `/api/v1/Subjects`       | GET         | `/examiner/exams/new/setup`      | Danh sách môn học hoạt động                     | Đã nối     |
| `/api/v1/Semesters`      | GET         | `/examiner/exams/new/setup`      | Danh sách học kỳ                                | Đã nối     |
| `/api/v1/Questions`      | GET         | `/examiner/exams/new/questions`  | Câu hỏi Active, search/filter/paging            | Đã nối     |
| `/api/v1/Questions/{id}` | GET         | `/examiner/exams/new/questions`  | Preview nội dung, độ khó, điểm, loại và options | Đã nối     |
| `/api/v1/Topics`         | GET         | `/examiner/exams/new/questions`  | Bộ lọc topic, có thể giới hạn theo Subject      | Đã nối     |
| `/api/v1/Subjects`       | GET         | `/examiner/schedule/new/details` | Catalog môn cho chi tiết lịch                   | Đã nối     |
| `/api/v1/Semesters`      | GET         | `/examiner/schedule/new/details` | Catalog học kỳ cho chi tiết lịch                | Đã nối     |

Frontend giữ đúng tên query PascalCase từ Swagger:

- Questions: `SearchTerm`, `TopicId`, `QuestionType`, `Difficulty`, `Status`, `PageNumber`, `PageSize`, `SortBy`.
- Topics: `SubjectId`, `IsActive`.
- Subjects: `IsActive`.

Question Selection luôn gửi `Status=Active`. Search, topic, loại câu hỏi, độ khó và pagination chạy bằng query thật lên Backend. Nút Preview gọi riêng Question detail và hiển thị options trả về từ API.

## 3. Kiến trúc và xử lý contract

API catalog dùng chung được đặt tại `src/api/catalog.ts`; `src/api/lecturer.ts` tái xuất lớp này để Lecturer và Examiner không nhân đôi contract.

| Nội dung             | Cách xử lý                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Schema dây truyền BE | Chấp nhận các field nullable theo OpenAPI                                                           |
| Model hiển thị       | Adapter đổi null thành `Not available`                                                              |
| Phân trang           | Giữ `items`, `pageNumber`, `pageSize`, `totalCount`, `totalPages`, `hasPreviousPage`, `hasNextPage` |
| Lỗi API              | Phân biệt network, parse, HTTP/server và `success:false` qua API client chung                       |
| 401                  | Dùng cơ chế hết phiên hiện có, xóa session và chuyển về `/login`                                    |
| UI trạng thái        | Có loading, empty, error và Retry                                                                   |
| Draft tạo đề         | Subject, Semester và ID câu hỏi đã chọn được giữ trong `sessionStorage`                             |
| Ghi dữ liệu          | Không gọi POST/PUT/PATCH/DELETE                                                                     |

## 4. Màn hình vẫn dùng fixture hoặc local state

| Màn hình/năng lực                  | Trạng thái      | Lý do                                                   |
| ---------------------------------- | --------------- | ------------------------------------------------------- |
| Examiner Dashboard                 | Fixture         | Không có API dashboard/operations summary               |
| Exam Paper Bank                    | Fixture         | Không có resource ExamPaper                             |
| Metadata đề ngoài Subject/Semester | Local state     | Không có ExamPaper create/update contract               |
| Ma trận và selection vào đề        | Session state   | Không có ExamPaperQuestions/blueprint API               |
| Operations và Readiness            | Fixture/local   | Không có cấu hình vận hành, validation hoặc release API |
| Schedule cockpit                   | Fixture         | Không có ExamShift API                                  |
| Schedule Details ngoài catalog     | Local state     | Không có ExamShift create/update API                    |
| Rooms và workstation readiness     | Fixture/session | Không có ExamRoom/Workstation API                       |
| Candidates và seating              | Fixture/session | StudentProfile không phải roster của ca thi             |
| Attendance                         | Fixture         | Không có attendance window/check-in/audit API           |
| Live Monitoring                    | Fixture         | Không có session telemetry, incident hoặc realtime API  |

Các vùng này tiếp tục hiển thị thông báo simulation/not connected. CTA chưa nối không gửi request ghi và không báo thành công giả.

## 5. API Swagger đã có nhưng Examiner chưa dùng

| Nhóm API                                    | Lý do chưa dùng trong Examiner                                     |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Questions create/update/archive             | Đợt này chỉ đọc; chưa có ExamPaper để gắn câu hỏi                  |
| QuestionOptions CRUD                        | Preview đã đọc options lồng trong Question detail; không chỉnh sửa |
| LearningMaterials                           | Không thuộc luồng Examiner hiện tại                                |
| CourseSections                              | Không đồng nghĩa với ExamShift hoặc Candidate roster               |
| StudentProfiles                             | Không đồng nghĩa với Candidate của một ca thi cụ thể               |
| LecturerProfiles                            | Không thuộc nghiệp vụ Examiner hiện tại                            |
| Users, Departments, Majors, Specializations | Thuộc quản trị/catalog khác                                        |
| Curriculums, Syllabi                        | Chưa có yêu cầu sử dụng trong luồng tạo đề                         |
| Auth refresh-token/logout                   | Vẫn là khoảng trống chung của vòng đời token                       |

## 6. Chênh lệch contract còn lại

1. Swagger chưa có domain ExamPaper, nên FE chưa thể lưu metadata đề, version, blueprint, trạng thái, approval hoặc release.
2. Swagger chưa có quan hệ ExamPaper–Question, nên selection và thứ tự câu hỏi chỉ giữ trong phiên.
3. Question response không có Bloom level; FE không suy đoán Bloom từ dữ liệu khác.
4. Swagger chưa có ExamShift, Room assignment, Invigilator assignment, Candidate roster hoặc Seat assignment.
5. Swagger chưa có Attendance, ExamSession, Submission, Incident hoặc Monitoring stream.
6. Một số response catalog cho phép null; adapter FE đã phòng vệ nhưng BE nên cân nhắc required/non-null cho mã và tên cốt lõi.
7. Các GET catalog hiện trả dữ liệu qua proxy khi dùng token QA không hợp lệ; cần chốt rõ endpoint nào public và endpoint nào bắt buộc Bearer để tránh lộ dữ liệu.

## 7. API Backend cần bổ sung cho Examiner

### P1 — tạo và phát hành đề

- `ExamPapers`: CRUD metadata, version, status, approval và release.
- `ExamPaperQuestions`: thêm/xóa/sắp xếp câu hỏi, điểm và validation tổng.
- `ExamBlueprints`: phân bố topic, difficulty, score và quy tắc ma trận.

### P1 — lịch và nguồn lực

- `ExamShifts`: môn, semester, thời gian, campus, trạng thái và lifecycle.
- `ExamRooms`/`Workstations`: sức chứa, thiết bị, readiness và secure-browser state.
- `InvigilatorAssignments`: phân công, vai trò, xung đột và coverage.
- `ExamCandidates`/`SeatAssignments`: eligibility, roster, phòng, ghế và conflict.

### P1 — vận hành ca thi

- `Attendance`: cửa sổ mở trước giờ thi, check-in, bulk action và audit log.
- `ExamSessions`: start/pause/resume/submit và thời gian còn lại.
- `Monitoring`: heartbeat/telemetry qua SSE hoặc WebSocket.
- `Incidents`/`IntegrityEvents`: mức độ, bằng chứng, xử lý và lịch sử.
- `Submissions`: trạng thái nộp bài và reconciliation.
- `Readiness`: blocker do server tính và điều kiện release.

Backend phải thực thi các luật theo thời gian và quyền, ví dụ chỉ mở Attendance trước ca thi 30 phút; không tin vào trạng thái nút ở FE.

## 8. Kết quả kiểm thử

| Kiểm tra                                | Kết quả                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| TypeScript                              | Đạt                                                                          |
| ESLint toàn dự án                       | Đạt                                                                          |
| Vitest toàn dự án                       | 17 file, 62 test đạt                                                         |
| Test API/Examiner mục tiêu              | 2 file, 16 test đạt                                                          |
| Production build                        | Đạt, 2.116 module được build                                                 |
| Contrast checker                        | Đạt toàn bộ cặp token                                                        |
| Color whitelist                         | Đạt                                                                          |
| Smoke test Vite proxy → Render Subjects | HTTP 200, nhận envelope thật                                                 |
| Browser desktop 1600px                  | Setup và Question Selection hiển thị catalog/câu hỏi thật, không lỗi console |
| Browser mobile 390px                    | Question Selection không tràn ngang (`scrollWidth = clientWidth = 390`)      |
| Auth guard                              | Vẫn hoạt động; role Examiner mới vào được workspace Examiner                 |

Vitest có log cảnh báo quen thuộc của JSDOM về `HTMLCanvasElement.getContext` khi axe-core kiểm tra contrast. Đây là giới hạn môi trường test, không làm test thất bại và không phải lỗi runtime của trang Examiner.

Production build có cảnh báo bundle chính lớn hơn 500 kB; đây là hạng mục tối ưu hiệu năng riêng, không ảnh hưởng kết quả tích hợp API.

## 9. Phạm vi thay đổi

- Không chỉnh sửa Backend.
- Không dùng Backend local.
- Không commit hoặc push.
- Không gọi API ghi.
- Không thay fixture bằng dữ liệu sai nghĩa nghiệp vụ.
