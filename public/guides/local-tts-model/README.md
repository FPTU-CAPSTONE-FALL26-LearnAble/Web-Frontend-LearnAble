# Cài LearnAble TTS Agent trên Windows

Ứng dụng dùng GPU NVIDIA trên máy giảng viên để tạo audio cho tài liệu LearnAble. Giảng viên không cần cài Python, CUDA Toolkit, chạy Backend hay huấn luyện model.

## 1. Nhận bộ cài và thông tin từ trường

Trước khi bắt đầu, hãy xin nhóm triển khai:

- `LearnAble-TTS-Setup.exe` và **gói model đầy đủ đã xác minh**. Chỉ file LoRA adapter là chưa đủ.
- URL HTTPS của API, kết thúc bằng `/api/v1`, và URL HTTPS của trang giảng viên. Hai địa chỉ phải trỏ tới cùng môi trường LearnAble.
- Tài khoản Lecturer đang hoạt động. Nếu nhóm cấp cách tải model qua ứng dụng, cần thêm URL HTTPS của `manifest.json` và mã SHA-256 được xác nhận.

Hiện chưa có link tải công khai đã xác nhận cho bộ cài và model. Nếu chưa nhận đủ, hãy liên hệ nhóm triển khai. Máy cần Windows 10/11 64-bit, GPU NVIDIA có driver hoạt động, kết nối Internet và dung lượng trống đủ cho model; hỏi nhóm về dung lượng của gói được bàn giao.

## 2. Cài ứng dụng và model

1. Mở `LearnAble-TTS-Setup.exe`, làm theo các bước cài đặt rồi mở **LearnAble TTS Agent** từ Start Menu.
2. Tìm biểu tượng ứng dụng ở khay hệ thống, góc phải thanh taskbar. Có thể biểu tượng nằm trong danh sách ẩn.
3. Nhấp chuột phải vào biểu tượng, chọn **Settings**. Nhập `API URL (include /api/v1)` và `Web dashboard URL` do nhóm cung cấp. Đặt `Device label` để nhận biết máy. Để trống `Runtime executable (optional)` khi dùng bộ cài đầy đủ.
4. Nếu nhận bộ model dạng thư mục/file nén: giải nén, chọn thư mục chứa trực tiếp `manifest.json` và `manifest.sha256` tại `Verified model folder`. Giữ nguyên thư mục này sau khi cấu hình.
5. Nếu nhóm cấp URL tải model: chọn **Check for Updates / Install Package → Model**, dán URL manifest HTTPS và mã SHA-256. Chờ ứng dụng tải và xác minh xong.

Không thay URL manifest bằng link Kaggle hoặc file adapter riêng. Không tắt kiểm tra checksum.

## 3. Kiểm tra và kết nối máy

1. Trong menu ứng dụng, chọn **Check GPU**. Hộp thoại cần hiện GPU NVIDIA, VRAM, phiên bản PyTorch và CUDA. Bước này chỉ kiểm tra khả năng nhận GPU; chưa chứng minh audio sẽ tạo được.
2. Đăng nhập trang Lecturer của **cùng môi trường** với API đã nhập. Vào **Learning Materials → Upload new material → Đăng ký máy tạo audio**. Nếu trang này chưa có mục đăng ký, nhóm có thể cấp trang BE `/local-tts/` của cùng môi trường.
3. Nhập tên máy và chọn **Đăng ký máy**. Giữ cửa sổ ứng dụng ở màn hình **Pair Device**.
4. Chép `Agent ID` và `Expires at (ISO 8601)` vào ứng dụng; chọn **Sao chép token một lần** rồi dán ngay token vào `Device token`. Thông tin trên web sẽ tự ẩn sau hai phút.
5. Chọn **OK** trong ứng dụng và chờ thông báo kết nối thành công. Không gửi token hoặc ảnh chụp token cho người khác.

Token thiết bị hiện hết hạn sau **8 giờ**. Khi hết hạn, đăng ký thiết bị mới và Pair Device lại. Khi đổi tài khoản, chọn **Unpair Device** trước.

## 4. Tạo audio thử

1. Giữ máy có nguồn điện, mạng và không vào Sleep. Mở một PDF ngắn có chữ trong **Material Audio Studio**.
2. Kiểm tra text đọc, tạo audio cho **một trang** trước. Giữ LearnAble TTS Agent đang chạy.
3. Khi audio sẵn sàng, nghe thử rồi mới **Approve**. Sau đó mới tạo audio cho cả tài liệu.

Ứng dụng hiển thị trạng thái như `IDLE` (chờ job), `GENERATING` (đang tạo), `UPLOADING` (đang gửi), `PAIRING_REQUIRED` (cần kết nối lại), `MODEL_SETUP_REQUIRED` (cần kiểm tra model) và `ERROR` (xem log). **Pause / Resume** chỉ dừng nhận job mới; job đang chạy vẫn tiếp tục. Lần sau chỉ cần mở ứng dụng từ Start Menu hoặc để ứng dụng tự chạy cùng Windows, kiểm tra trạng thái và kết nối lại nếu token hết hạn.

## Nếu gặp lỗi

- **Không thấy GPU:** kiểm tra GPU trong Task Manager, cập nhật driver NVIDIA rồi khởi động lại Windows. Gửi tên GPU và lỗi cho nhóm kỹ thuật.
- **Model không hợp lệ:** kiểm tra thư mục chứa manifest hoặc xin lại URL và SHA-256 từ nhóm.
- **Ứng dụng chỉ báo IDLE dù đã tạo job:** kiểm tra ứng dụng và web cùng API/môi trường, đúng tài khoản Lecturer và phiên bản model.
- **Audio chờ lâu hoặc lỗi:** mở **View Logs**, gửi mã lỗi, thời điểm, tên GPU cho nhóm kỹ thuật. Không gửi mật khẩu, token hoặc link upload có chữ ký.

Để gỡ ứng dụng, chọn **Unpair Device** trước rồi gỡ LearnAble TTS Agent trong Windows Settings. Nếu mất mạng, thu hồi thiết bị trên web khi có mạng trở lại.

> Bộ cài, gói model và luồng web → agent → lưu audio → duyệt cần được nhóm triển khai chạy thử trên máy giảng viên trước khi dùng cho tài liệu dài. Bản thử trên RTX 3050 Ti chỉ xác nhận một audio ngắn; không bảo đảm mọi GPU 4 GB đều xử lý được tài liệu dài.
