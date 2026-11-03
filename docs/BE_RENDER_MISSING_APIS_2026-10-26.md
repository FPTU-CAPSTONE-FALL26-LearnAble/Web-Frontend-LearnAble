# Báo cáo API còn thiếu trên Backend Render

| Thông tin | Giá trị |
|---|---|
| Ngày kiểm tra | 26/10/2026 |
| Backend | `https://backend-learnable.onrender.com` |
| Swagger | `https://backend-learnable.onrender.com/swagger/index.html` |
| Phạm vi | Lecturer và Examiner |

## Các nhóm API còn thiếu

| STT | Nhóm chức năng | API Backend cần bổ sung |
|---:|---|---|
| 1 | Question purpose | Backend đã bổ sung `examTypeId` để tạo và lọc theo loại kỳ thi, nhưng chưa có trường riêng phân biệt mục đích câu hỏi `Exam` và `Practice`. |
| 2 | Import/Export câu hỏi | Import Excel/CSV, kiểm tra lỗi từng dòng và export câu hỏi theo bộ lọc. |
| 3 | Loại câu hỏi nâng cao | Lưu dữ liệu và đáp án chuyên biệt cho Code, Math/LaTeX và Diagram. |
| 4 | Mã thi | Tạo, xem, mở khóa, đóng và thu hồi exam code cho từng ca thi. |
| 5 | Live monitoring | Theo dõi phiên thi, tiến độ làm bài, heartbeat, trạng thái online và trạng thái đồng bộ. |
| 6 | Sự cố ca thi | Tạo, cập nhật, phân loại và xử lý incident trong ca thi. |
| 7 | Bài nộp | Lấy danh sách bài nộp, chi tiết bài làm và trạng thái đồng bộ submission. |
| 8 | Chấm thi | Chấm tự luận, sửa điểm, lưu nhận xét và lịch sử thay đổi điểm. |
| 9 | Công bố kết quả | Xem trước, công bố, thu hồi và xuất kết quả thi. |
| 10 | Proctoring/Integrity | Lưu cờ vi phạm, bằng chứng, recording và quyết định xử lý của Examiner. |
| 11 | Thông báo lịch thi | Gửi thông báo cho sinh viên/giảng viên và theo dõi trạng thái gửi. |
| 12 | Báo cáo | Báo cáo ca thi, điểm số, tỷ lệ hoàn thành, vắng mặt và sự cố. |
| 13 | Hỗ trợ đặc biệt | Thiết lập thêm thời gian hoặc accommodation cho từng sinh viên. |
| 14 | Media của câu hỏi | Upload, thay thế và xóa ảnh/audio đính kèm câu hỏi theo một quy trình thống nhất. |

## Ghi chú

- Backend đã có API cho Exam Subject, Exam Paper, Exam Shift, Exam Schedule, phòng thi, phân công sinh viên/giám thị, sơ đồ ghế và điểm danh; các API đó không nằm trong danh sách thiếu này.
- Cập nhật mới: `POST /api/v1/Questions` đã nhận `examTypeId`; response có `examTypeId`, `examTypeCode`, `examTypeName`; `GET /api/v1/Questions` đã lọc được bằng `ExamTypeId`.
- Dashboard Lecturer và Examiner sẽ được FE tổng hợp từ các API nghiệp vụ hiện có, không yêu cầu một API dashboard tổng hợp riêng.
- Tên endpoint có thể khác đề xuất, miễn bảo đảm đầy đủ chức năng và dữ liệu đầu vào/đầu ra tương ứng.
- FE sẽ giữ các chức năng chưa có API ở trạng thái chưa kết nối và không giả lập thao tác thành công.
