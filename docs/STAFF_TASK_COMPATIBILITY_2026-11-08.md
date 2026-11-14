# Báo cáo 11 task Staff của Tài

**Ngày kiểm tra:** 08/11/2026  
**Thứ tự ưu tiên đánh giá:** Jira → Swagger BE đang chạy → FE  
**BE được kiểm tra:**

- Render: `https://backend-learnable.onrender.com/swagger/v1/swagger.json`
- EC2: `http://54.79.78.167:8080/swagger/v1/swagger.json`
- Hai tài liệu Swagger có cùng SHA-256: `F88A7E9645ADD2610E225EDB5D8188A59BE14AA2F207CBCAB4DB364898341D62`

## Kết quả

| Jira | Yêu cầu chính | FE hiện tại | API BE hiện tại | Mức tương thích |
|---|---|---|---|---|
| FFCB-16 | Quản lý Student/Lecturer/Examiner, hồ sơ khoa-ngành, activate/deactivate, reset password | Đã có danh sách/search/filter/page; tạo tài khoản và tạo tiếp Student/Lecturer Profile; khóa Admin/Staff; UI deactivate, reactivate và reset password | Có Users CRUD một phần, deactivate, StudentProfiles, LecturerProfiles; thiếu đổi role, activate và reset password | Khớp các endpoint đã có; ba hành động thiếu API được khóa, không báo thành công giả |
| FFCB-17 | CRUD môn học và chính sách mặc định trường | CRUD Subject thật; có workspace cấu hình duration/proctoring/camera | Có Subjects CRUD + activate/deactivate; không có university default-policy API | Subject khớp; policy chờ API |
| FFCB-192 | CRUD curriculum và gắn môn học vào curriculum | CRUD/approve/archive Curriculum thật; có affordance Manage subjects | Có Curriculums CRUD/status; không có curriculum-subject relationship API | Curriculum khớp; gắn môn chờ API |
| FFCB-193 | CRUD phòng, vị trí ghế, availability, không xóa ghế đang dùng | Đã có CRUD phòng và ghế, equipment/availability, xác nhận xóa và pending state | Có đầy đủ ExamRooms và RoomSeats; BE chịu trách nhiệm từ chối xóa khi đang tham chiếu | Khớp |
| FFCB-200 | Màn hình Curriculum cho Staff | Route, menu, dashboard và workspace hoàn chỉnh | Dùng Curriculums API thật | Khớp |
| FFCB-202 | Màn hình phòng thi/sơ đồ ghế cho Staff | Route, danh sách phòng, inventory ghế, responsive table | Dùng ExamRooms/RoomSeats API thật | Khớp |
| FFCB-253 | CRUD khoa/ngành và xem lecturer theo khoa | CRUD/activate/deactivate khoa-ngành; Lecturer Records lọc theo Department | Có Departments, Majors và LecturerProfiles filter DepartmentId | Khớp; ràng buộc không deactivate khi còn tham chiếu do BE kiểm soát |
| FFCB-255 | Chuyển account management sang Staff | Đã chuyển route/menu; chỉ quản lý ba role cùng university | Users hỗ trợ UniversityId filter | Khớp trong phạm vi API hiện có |
| FFCB-256 | Chuyển Subject và default policy sang Staff | Đã chuyển Subject; có Default Exam Policy workspace | Subject có API, policy chưa có | Một phần chờ policy API |
| FFCB-259 | Màn hình khoa/ngành Staff | Route/menu/dashboard và CRUD hoàn chỉnh | Departments/Majors API thật | Khớp |
| FFCB-260 | `[HỦY]` phân công Student/Lecturer vào môn | Không triển khai theo tiêu đề Jira | Không có API | Đúng quyết định hủy; Jira vẫn đang Backlog nên cần PM cập nhật workflow |

## API BE còn thiếu so với acceptance criteria Jira

1. `PATCH /api/v1/Users/{id}/activate`
2. Endpoint reset mật khẩu người dùng bởi Staff.
3. Endpoint đổi role giữa Student/Lecturer/Examiner hoặc quy tắc thay thế được BE công bố.
4. Read/write university default exam policy.
5. Read/write quan hệ Subject ↔ Curriculum.

FE đã dựng đúng điểm vào cho các chức năng trên nhưng giữ nút lưu/hành động ở trạng thái không khả dụng cho đến khi Swagger công bố API. FE không lưu giả và không gửi request tự suy đoán.

## Route Staff

- `/staff/dashboard`
- `/staff/users`
- `/staff/student-profiles`
- `/staff/lecturer-profiles`
- `/staff/departments`
- `/staff/majors`
- `/staff/subjects`
- `/staff/curriculums`
- `/staff/default-policy`
- `/staff/exam-rooms`

## Kiểm thử

- TypeScript build: đạt.
- Production build: đạt.
- Contract/role/admin catalog tests: 13/13 đạt.
- Staff files ESLint: đạt.
- FE local: `http://127.0.0.1:5173/`.
