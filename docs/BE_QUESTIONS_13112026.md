# API còn thiếu: tạo đề, lên lịch thi, thi

**Ngày:** 14/11/2026 · **Nguồn:** Swagger EC2 (186 đường dẫn, 265 thao tác, không đổi so với 13/11), code BE nhánh `main` (`6a3518e`), backlog Jira FFCB Sprint 4
**Quy ước:** FE chỉ nối API đã có. Mục "Thiếu" là thứ Swagger chưa có; mục "Cần xác nhận" là điều FE đang làm theo suy luận.

## 1. Tạo đề (Lecturer)

**Thiếu**

| Chức năng | Còn thiếu | Task |
|---|---|---|
| Câu code | Loại câu `Code`, mã mẫu, test case, cờ test ẩn. `QuestionType` chỉ có Single, Multiple, Essay | FFCB-295 (chưa có task BE) |
| Tự luận | Phân loại Writing hoặc PlantUML | FFCB-294 (chưa có task BE) |
| Hình trong câu hỏi | Không có API tải ảnh và không có trường mô tả hình. Form có ô tải ảnh nhưng không lưu được | FFCB-309 |
| Kiểm tra media trước niêm phong | Không có endpoint. FFCB-308 báo Done nhưng chưa thấy trong Swagger. FE tự kiểm tra audio từng câu | FFCB-308 |
| TTS chạy máy giảng viên | Hợp đồng dịch vụ: địa chỉ, endpoint, định dạng vào và ra | FFCB-311 Backlog, FFCB-312 |
| Audio học liệu | `LearningMaterials` chỉ có file, publish, archive; chưa có API nhận PDF và audio đã chốt; STT local | FFCB-320, 322 Backlog, FFCB-321 |
| Hàng đợi OCR, embedding | Chưa có | FFCB-92 Backlog |
| Xem trước accessible | API accessible payload (FE đã làm thứ tự đọc phía client) | FFCB-98 Backlog |

**Cần xác nhận**
1. Audio chuyển sang tạo ở máy giảng viên: các bản ghi tạo audio cũ (Pending, Failed) trên server có tự dọn không? Hiện chúng chặn kích hoạt câu hỏi.
2. `gradingCriteria` của câu tự luận có bắt buộc không? FE không gửi nữa theo AC.
3. **Gói đề lỗi (FR-56):** thu hồi, mở bản nháp, sửa rồi niêm phong lại (đề xuất; API `withdraw` và `versions/{id}/draft` đã có) hay chỉ gửi lại gói cũ? FE chờ quyết định để làm nút Rebuild.

## 2. Lên lịch thi (Examiner)

**Thiếu**

| Chức năng | Còn thiếu |
|---|---|
| Chia người vào ca chung | **`examschedules/bulk/preview` không dùng lại được.** API này tính cả ca chung vừa tạo là trùng phòng (`ROOM_OVERLAP`) nên luôn trả kế hoạch không hợp lệ, và không có tham số bỏ qua ca đang xét. Cần API preview cho ca chung, hoặc thêm `examShiftId` vào `bulk/preview` để loại trừ ca đó. FE đang tự chia, chỉ tính ghế còn dùng được, có máy, và có camera khi môn chặn thiếu camera |
| Import danh sách giảng viên (Examiner) | Có `student-import` (template, validate) theo môn; **không có tương đương cho giảng viên coi thi**. Hiện FE chọn từ `LecturerProfiles` |

**Cần xác nhận**
1. Luồng tạo lịch cũ (`examshifts`, `examschedules/bulk`) còn mở cho môn `RequiresSealing` không? FE đã bỏ luồng cũ, chỉ tạo ca chung.
2. Examiner có quyền đọc `LecturerProfiles` để chọn giám thị không? FE đang dùng API này.
3. Thông báo "Exam schedule published" của BE gắn `actionUrl = /exam-schedules/{id}`, không phải đường dẫn của FE. Nên trả đường dẫn theo vai trò hoặc chỉ trả mã lịch.

## 3. Thi và vận hành

**Lecturer**

| Chức năng | Còn thiếu | Task |
|---|---|---|
| Chấm câu code, PlantUML | Sơ đồ đã render, kết quả test mẫu và test ẩn, điểm gợi ý | FFCB-263 |
| Cập nhật trực tiếp | Không có kênh đẩy; màn điểm danh chỉ có dữ liệu khi tải lại | Chưa có task |

**Examiner**

| Chức năng | Còn thiếu | Task |
|---|---|---|
| Giám sát trực tiếp | Chỉ có danh sách lịch và phòng. Thiếu trạng thái từng thí sinh (kết nối, camera, tiến độ), sự cố, thao tác khẩn cấp (tạm dừng, kết thúc) | Chưa có task |
| Phiên gắn cờ | Danh sách, lý do, mức độ, quyết định (chấp nhận, hủy, thi lại), log | FFCB-146 (chưa có task BE) |
| Phát lại video, review toàn vẹn | Lưu và lấy video (chỉ hình), log tương tác đồng bộ, người review | FFCB-143 Backlog, FFCB-144 |
| Báo cáo kỳ thi | Thống kê, phổ điểm, phiên gắn cờ, xuất Excel hoặc CSV | FFCB-147 Backlog, FFCB-148, 44 |

**Cần xác nhận:** hết ca BE tự đánh vắng sinh viên chưa check-in; `absenceRecordedAutomatically` phản ánh đúng điều này không?
