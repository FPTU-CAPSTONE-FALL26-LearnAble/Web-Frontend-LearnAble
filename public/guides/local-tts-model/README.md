# Cài LearnAble TTS Agent trên Windows

[English](README.en.md) · [Mở hướng dẫn từng bước trên web](/guides/local-tts-lecturer-guide.html)

Ứng dụng dùng GPU NVIDIA trên máy giảng viên để tạo audio cho tài liệu và câu hỏi LearnAble. Giảng viên không cần cài Python, CUDA Toolkit, chạy Backend hay huấn luyện model.

## 1. Nhận bộ cài và thông tin từ trường

1. Mở [LearnAble-TTS-Handoff.zip trên Google Drive](https://drive.google.com/file/d/1aeYMl55FAF7NPWPkIkz5XkdX0BImHzIE/view?usp=sharing), chọn biểu tượng **Tải xuống** của Google Drive.
2. Giải nén file ZIP vừa tải. Mở thư mục `LearnAble-TTS-Handoff` bên trong. Nếu Google Drive không cho xem trước do file lớn, vẫn chọn **Tải xuống**; không cần xem nội dung ZIP trên web.

Thư mục `LearnAble-TTS-Handoff` gồm:

- `LearnAble-TTS-Setup.exe`: bộ cài Windows.
- `model-ngoc-huyen-kaggle-20261108.zip`: gói model đầy đủ. Trong ZIP có thư mục `model` chứa `manifest.json` và `manifest.sha256`.
- `model-ngoc-huyen-kaggle-20261108.zip.sha256`: mã kiểm tra ZIP; nhóm triển khai cần đối chiếu mã này trước khi bàn giao.
- `README_GPU_SETUP.md`: hướng dẫn gốc của nhóm BE.

API EC2 để nhập trong ứng dụng là `https://api.learnable.site/api/v1`. Bạn cũng cần URL HTTPS của trang Lecturer **cùng môi trường EC2** và tài khoản Lecturer đang hoạt động. Máy cần Windows 10/11 64-bit, GPU NVIDIA có driver hoạt động, Internet và khoảng 15 GB trống cho ứng dụng, model giải nén và file tạm.

Gói này dùng **cài từ thư mục trên máy**. URL `artifacts.invalid` trong manifest không phải địa chỉ tải model; không cần URL manifest HTTPS khi dùng ZIP đã bàn giao. Manifest ghi “Local evaluation only; redistribution rights not verified”, nên nhóm triển khai cần xác nhận quyền phân phối trước khi phát rộng rãi.

## 2. Cài ứng dụng và model

1. Mở `LearnAble-TTS-Setup.exe`, làm theo các bước cài đặt rồi mở **LearnAble TTS Agent** từ Start Menu.
2. Ứng dụng chạy nền và không mở cửa sổ chính. Ở góc phải taskbar, bấm dấu **^** để xem biểu tượng ẩn; tìm biểu tượng **chiếc loa** có tên **LearnAble TTS Agent** rồi nhấp chuột phải để mở menu. Nếu mở lại từ Start Menu và thấy “already running in the system tray”, hãy dùng biểu tượng đang chạy.
3. Nhấp chuột phải vào biểu tượng, chọn **Settings**. Nhập `API URL (include /api/v1)` và `Web dashboard URL` do nhóm cung cấp. Đặt `Device label` để nhận biết máy. Để trống `Runtime executable (optional)` khi dùng bộ cài đầy đủ.
4. Giải nén `model-ngoc-huyen-kaggle-20261108.zip` vào một nơi cố định, chẳng hạn `C:\LearnAble-TTS-Model`. Sau khi giải nén, mở thư mục `model` bên trong và kiểm tra thấy trực tiếp `manifest.json` cùng `manifest.sha256`.
5. Trong **Settings → Verified model folder**, chọn **thư mục `model`**, không chọn file ZIP hoặc thư mục bao ngoài. Nhấn **OK**. Không đổi tên, di chuyển hoặc chỉnh sửa file trong thư mục model sau đó.

Ứng dụng sẽ xác minh các file model theo manifest khi sử dụng. Nếu báo `MODEL_SETUP_REQUIRED`, kiểm tra lại đường dẫn thư mục `model` và nhờ nhóm triển khai kiểm tra ZIP.

## 3. Kiểm tra và kết nối máy

1. Trong menu ứng dụng, chọn **Check GPU**. Hộp thoại cần hiện GPU NVIDIA, VRAM, phiên bản PyTorch và CUDA. Bước này chỉ kiểm tra khả năng nhận GPU; chưa chứng minh audio sẽ tạo được.
2. Đăng nhập trang Lecturer của **cùng môi trường** với API đã nhập. Chọn **Pair TTS Device** ở sidebar. Nếu trang này chưa có mục đăng ký, nhóm có thể cấp trang BE `/local-tts/` của cùng môi trường.
3. Nhập tên máy và chọn **Đăng ký máy**. Giữ cửa sổ ứng dụng ở màn hình **Pair Device**.
4. Chép `Agent ID` và `Expires at (ISO 8601)` vào ứng dụng; chọn **Sao chép token một lần** rồi dán ngay token vào `Device token`. Thông tin trên web sẽ tự ẩn sau hai phút.
5. Chọn **OK** trong ứng dụng và chờ thông báo kết nối thành công. Không gửi token hoặc ảnh chụp token cho người khác.

Token thiết bị hiện hết hạn sau **8 giờ**. Khi hết hạn, đăng ký thiết bị mới và Pair Device lại. Khi đổi tài khoản, chọn **Unpair Device** trước.

## 4. Tạo audio thử

1. Giữ máy có nguồn điện, mạng và không vào Sleep. Mở một PDF ngắn có chữ trong **Material Audio Studio**.
2. Kiểm tra text đọc, tạo audio cho **một trang** trước. Giữ LearnAble TTS Agent đang chạy.
3. Khi audio sẵn sàng, nghe thử rồi mới **Approve**. Sau đó mới tạo audio cho cả tài liệu.

### Tạo audio cho câu hỏi và đáp án

Trên BE đã cập nhật API Local TTS cho câu hỏi, FE sẽ tự gửi job Local TTS sau khi lưu câu hỏi. Khi mở một câu hỏi đã lưu, chọn **Create with Local TTS** trong phần trạng thái audio để tạo những phần còn thiếu bằng thiết bị đã ghép. Câu hỏi trắc nghiệm tạo riêng audio cho nội dung câu hỏi và từng đáp án. Audio đã sẵn sàng được giữ lại; việc tạo lại toàn bộ cần yêu cầu riêng.

Theo dõi trạng thái ở phần audio của câu hỏi. Local TTS vẫn có thể xử lý khi worker TTS trên BE tắt. Khác với audio tài liệu, audio câu hỏi không có bước Approve trên Material Audio Studio. Để thử tính năng mới, trang Lecturer và ứng dụng cần cùng dùng BE EC2.

Ứng dụng hiển thị trạng thái như `IDLE` (chờ job), `GENERATING` (đang tạo), `UPLOADING` (đang gửi), `PAIRING_REQUIRED` (cần kết nối lại), `MODEL_SETUP_REQUIRED` (cần kiểm tra model) và `ERROR` (xem log). **Pause / Resume** chỉ dừng nhận job mới; job đang chạy vẫn tiếp tục. Lần sau chỉ cần mở ứng dụng từ Start Menu hoặc để ứng dụng tự chạy cùng Windows, kiểm tra trạng thái và kết nối lại nếu token hết hạn.

## Nếu gặp lỗi

- **Báo “already running” nhưng không thấy biểu tượng:** nhấn **Win + B** hoặc bấm dấu **^ cạnh đồng hồ** ở góc phải taskbar; tìm biểu tượng chiếc loa tên **LearnAble TTS Agent**. Nếu vẫn không thấy, vào **Windows Settings → Personalization → Taskbar → Other system tray icons** và bật ứng dụng nếu có. Nếu không có trong danh sách, mở **Task Manager → Details**, kết thúc `LearnAble-TTS-Agent.exe` rồi mở lại từ Start Menu. Nếu lỗi lặp lại, gửi ảnh toàn bộ góc phải taskbar cho nhóm hỗ trợ.
- **Không thấy GPU:** kiểm tra GPU trong Task Manager, cập nhật driver NVIDIA rồi khởi động lại Windows. Gửi tên GPU và lỗi cho nhóm kỹ thuật.
- **Model không hợp lệ:** kiểm tra đã chọn đúng thư mục `model` chứa trực tiếp hai file manifest. Nhờ nhóm triển khai đối chiếu mã SHA-256 của ZIP với file `.zip.sha256` và gửi lại gói nếu cần.
- **Ứng dụng chỉ báo IDLE dù đã tạo job:** kiểm tra ứng dụng và web cùng API/môi trường, đúng tài khoản Lecturer và phiên bản model.
- **Audio chờ lâu hoặc lỗi:** mở **View Logs**, gửi mã lỗi, thời điểm, tên GPU cho nhóm kỹ thuật. Không gửi mật khẩu, token hoặc link upload có chữ ký.

Để gỡ ứng dụng, chọn **Unpair Device** trước rồi gỡ LearnAble TTS Agent trong Windows Settings. Nếu mất mạng, thu hồi thiết bị trên web khi có mạng trở lại.

> Bộ cài, gói model và luồng web → agent → lưu audio → duyệt cần được nhóm triển khai chạy thử trên máy giảng viên trước khi dùng cho tài liệu dài. Bản thử trên RTX 3050 Ti chỉ xác nhận một audio ngắn; không bảo đảm mọi GPU 4 GB đều xử lý được tài liệu dài.
