# API Backend còn thiếu cho Staff

**Ngày đối chiếu:** 08/11/2026  
**Nguồn chuẩn:** Swagger BE đang chạy trên Render và EC2 (cùng nội dung), mã `Backend-LearnAble`, và các luồng Staff FE hiện có.

## Kết luận ngắn

BE đã có API cho các nghiệp vụ Staff cốt lõi: tài khoản (đọc/tạo/sửa/vô hiệu hóa), hồ sơ Student/Lecturer, khoa, ngành, môn học, chương trình đào tạo, phòng thi và ghế.

Còn **5 API/nhóm API cần thiết để hoàn thành các acceptance criteria Staff**, cùng **1 API nên bổ sung** để Staff có thể sửa hồ sơ học vụ Student sau khi tạo.

## API cần bổ sung

| Ưu tiên | Nghiệp vụ Staff bị thiếu | API đề xuất | Lý do / ảnh hưởng FE |
|---|---|---|---|
| P0 | Kích hoạt lại tài khoản | `PATCH /api/v1/Users/{id}/activate` | Swagger hiện chỉ có `deactivate`. Sau khi Staff khóa nhầm một Student/Lecturer/Examiner, FE không thể mở lại tài khoản. Nút **Reactivate** đang bị khóa đúng theo contract. |
| P0 | Đặt lại mật khẩu cho tài khoản | `POST /api/v1/Users/{id}/reset-password` | Cần cho quy trình cấp lại quyền đăng nhập. Request nên nhận mật khẩu tạm hoặc BE tạo mật khẩu tạm/mã reset; response không được trả mật khẩu dạng rõ. Nút **Reset password** đang bị khóa. |
| P1 | Đổi role của tài khoản | `PATCH /api/v1/Users/{id}/role` | `PUT /Users/{id}` chỉ sửa thông tin cá nhân, không nhận `role`. Staff không thể chuyển Student ↔ Lecturer ↔ Examiner khi có thay đổi nghiệp vụ. BE cần công bố quy tắc đồng bộ/tạo-xóa profile tương ứng. |
| P1 | Chính sách thi mặc định theo trường | `GET /api/v1/universities/{universityId}/default-exam-policy`<br>`PUT /api/v1/universities/{universityId}/default-exam-policy` | Thiếu nơi lưu các mặc định như thời lượng, shuffle question/option, scoring, camera policy. Workspace **Default Exam Policy** trên FE hiện chỉ là UI và không lưu giả. |
| P1 | Gắn môn học vào chương trình đào tạo | `GET /api/v1/Curriculums/{id}/subjects`<br>`PUT /api/v1/Curriculums/{id}/subjects` | CRUD Curriculum đã có nhưng chưa có quan hệ `Curriculum ↔ Subject`. FE chưa thể triển khai thật thao tác **Manage subjects** của Curriculum. `PUT` có thể nhận danh sách `subjectIds` đầy đủ để thay thế atomically. |
| P2 | Sửa hồ sơ học vụ của Student sau khi tạo | `PUT /api/v1/StudentProfiles/{userId}` hoặc `PATCH /api/v1/StudentProfiles/{userId}` | Hiện có tạo, đổi `enrollment-status` và xóa, nhưng không có API chỉnh `majorId`, `curriculumId`, `intakeYear`. Cần khi Student đổi ngành/chương trình hoặc nhập sai dữ liệu. Đây là cải tiến cần thiết để CRUD hồ sơ Student đầy đủ, không phải blocker cho tạo mới. |

## Contract khuyến nghị

### 1. Kích hoạt lại tài khoản

```http
PATCH /api/v1/Users/{id}/activate
Authorization: Bearer <staff-token>
```

- Chỉ Staff quản lý cùng trường và Admin được thực hiện.
- Trả lại `UserResponseModel` hoặc `204 No Content`.
- Trả `409 Conflict` nếu trạng thái hiện tại không thể kích hoạt; `403` nếu khác trường/role không được phép.

### 2. Đặt lại mật khẩu

```http
POST /api/v1/Users/{id}/reset-password
Content-Type: application/json

{ "temporaryPassword": "..." }
```

- Không trả password trong response, log hoặc notification.
- BE phải validate password policy, hash password, và nên đặt cờ `mustChangePassword` nếu mô hình dữ liệu hỗ trợ.
- Có thể thay thế bằng cơ chế reset-token gửi email; cần chốt một contract duy nhất trước khi FE nối API.

### 3. Đổi role

```http
PATCH /api/v1/Users/{id}/role
Content-Type: application/json

{ "role": "Lecturer" }
```

- BE cần từ chối role Staff/Admin nếu Staff không được phép quản lý chúng.
- Cần quy tắc rõ ràng cho profile phụ thuộc: ví dụ không cho đổi khi còn `StudentProfile`, hoặc thực hiện transaction tạo/xóa profile cùng lúc. Không nên để FE tự gọi nhiều API để xử lý role.

### 4. Default Exam Policy

Ví dụ body nên có version/revision để tránh ghi đè đồng thời:

```json
{
  "defaultDurationMinutes": 90,
  "shuffleQuestions": true,
  "shuffleOptions": true,
  "scoringPolicy": "AllOrNothing",
  "cameraPolicy": "Required",
  "revision": "..."
}
```

### 5. Curriculum subjects

```json
{ "subjectIds": ["<subject-guid>"] }
```

- `PUT` nên validate: subject cùng `universityId`, đang active, không trùng lặp.
- Trả quan hệ đã lưu hoặc curriculum detail có danh sách môn học.

## Không phải API thiếu

| Vấn đề | Trạng thái thực tế |
|---|---|
| Tạo phòng thi | **Đã có** `POST /api/v1/examrooms`; body bắt buộc `universityId`, `roomCode`, `name` và các trường tùy chọn. |
| Quản lý ghế | **Đã có** `GET/POST/PUT/DELETE /api/v1/examrooms/{roomId}/seats`. |
| CRUD khoa, ngành, môn học, curriculum | **Đã có**; các endpoint activate/deactivate/approve/archive cũng đã công bố. |
| Tạo và quản lý Semester | **Đã có** API Staff nhưng chưa nằm trong menu Staff hiện tại; đây là khoảng trống UI/ưu tiên sản phẩm, không phải thiếu BE API. |
| `universityId` của Staff | `/auth/me` đã có trường `universityId`. Nếu Staff không nhận được giá trị này, cần kiểm tra seed/database và mapping claim/profile của tài khoản, không cần tạo endpoint phòng mới. |

## Thứ tự BE nên làm

1. `Users/{id}/activate` và `Users/{id}/reset-password`.
2. Read/write **default exam policy**.
3. Read/write quan hệ **Curriculum–Subject**.
4. Đổi role có transaction/profile rule rõ ràng.
5. Cập nhật StudentProfile.

## Phạm vi không đề xuất trong báo cáo này

- Bulk import tài khoản/student, sơ đồ phòng phức tạp, và phân công Student/Lecturer vào môn học chưa có acceptance criteria Staff đang hoạt động hoặc đã bị hủy trên Jira.
- Không đề xuất endpoint mới cho phòng thi/ghế vì Swagger đã đáp ứng đầy đủ nghiệp vụ FE hiện tại.

