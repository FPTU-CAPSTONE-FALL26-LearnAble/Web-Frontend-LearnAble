# Cài Local TTS trên máy giảng viên

Tài liệu này đi cùng **gói model LearnAble đã fine-tune**. Làm theo thứ tự bên dưới. Nếu trường chưa cung cấp một mục trong phần chuẩn bị, hãy liên hệ bộ phận kỹ thuật trước khi tiếp tục.

## 1. Nhận đủ thông tin từ trường

- Tài khoản Lecturer đang hoạt động và địa chỉ API **HTTPS** kết thúc bằng `/api/v1`.
- Đường dẫn tải **gói model đầy đủ** (`manifest.json`) và mã SHA-256 của manifest do trường xác nhận. Gói này phải có base model, LoRA adapter đã fine-tune, tokenizer, giọng tham chiếu và codec. **Chỉ tải `adapter_model.safetensors` là chưa đủ.**
- Hai thư mục đã được nhóm kỹ thuật chuẩn bị trên máy: `C:\LearnAble\Backend-LearnAble` (có `tts-agent`) và `C:\LearnAble\VieNue-LoRA` (SDK 3.3.0 và môi trường Python `.venv` tương thích).
- Máy Windows có GPU NVIDIA được PyTorch nhận diện. Nên có SSD còn khoảng 20 GB và RAM 16 GB. GPU 6–8 GB VRAM là mức chuẩn bị đề xuất; cần chạy thử trên máy thật.

Giảng viên **không cần cài hoặc chạy Backend, PostgreSQL hay Docker**. Nếu trường đặt các thư mục ở vị trí khác, thay đường dẫn trong lệnh bên dưới bằng vị trí được cung cấp.

## 2. Mở PowerShell và kiểm tra máy

Nhấn phím Windows, gõ **PowerShell** và mở ứng dụng. Chạy:

```powershell
nvidia-smi
$ttsBackendRoot = 'C:\LearnAble\Backend-LearnAble'
$ttsSdkRoot = 'C:\LearnAble\VieNue-LoRA'
$ttsPython = Join-Path $ttsSdkRoot '.venv\Scripts\python.exe'
Test-Path (Join-Path $ttsBackendRoot 'tts-agent')
Test-Path $ttsPython
```

Hai dòng `Test-Path` phải hiện `True`. Nếu có `False` hoặc `nvidia-smi` không thấy GPU, gửi ảnh màn hình cho bộ phận kỹ thuật.

## 3. Cài agent và tải model

```powershell
Set-Location $ttsBackendRoot
& $ttsPython -m pip install -e ./tts-agent
$env:LEARNABLE_VIENEU_PATH = $ttsSdkRoot
& $ttsPython -m learnable_tts_agent.cli doctor
```

`doctor` phải thấy CUDA. Nếu môi trường Python báo không có `pip`, nhờ kỹ thuật viên cài agent bằng `uv`; đừng tự thay bản PyTorch hoặc SDK.

Nhập **URL manifest** và **SHA-256** nhận từ trường khi được hỏi:

```powershell
$ttsManifestUrl = Read-Host 'Dan URL manifest HTTPS'
$ttsManifestSha = Read-Host 'Dan SHA-256 cua manifest'
& $ttsPython -m learnable_tts_agent.cli download-model --manifest-url $ttsManifestUrl --manifest-sha256 $ttsManifestSha
```

Lệnh tải sẽ kiểm tra từng file. Khi hoàn tất, sao chép đường dẫn thư mục model mà PowerShell in ra, rồi nhập:

```powershell
$ttsModelDir = Read-Host 'Dan duong dan thu muc model vua tai'
Test-Path (Join-Path $ttsModelDir 'manifest.json')
```

Kết quả cuối phải là `True`. Nếu mã SHA-256 không khớp, dừng lại và xin trường xác nhận lại gói model. Không bỏ qua bước kiểm tra.

## 4. Ghép máy với LearnAble

```powershell
$env:LEARNABLE_API_URL = (Read-Host 'Dan URL API HTTPS ket thuc bang /api/v1').TrimEnd('/')
$ttsIdentifier = Read-Host 'Nhap ten dang nhap Lecturer'
& $ttsPython -m learnable_tts_agent.cli pair --identifier $ttsIdentifier --device-name "$env:COMPUTERNAME-TTS"
```

Nhập mật khẩu khi PowerShell hỏi. Mật khẩu **không hiện ký tự khi gõ**; đây là bình thường. Kết quả thành công có dòng `Paired until ...`. Không gửi mật khẩu hoặc token cho người khác. Token thiết bị hiện hết hạn sau 8 giờ; khi hết hạn, chạy lại lệnh `pair`.

## 5. Chạy Local TTS và nghe thử

```powershell
& $ttsPython -m learnable_tts_agent.cli run --model-dir $ttsModelDir
```

Giữ cửa sổ PowerShell mở. Trên LearnAble, vào **Learning Materials → Upload new material**, tải một PDF ngắn có chữ, mở **Material Audio Studio**, kiểm tra lời đọc rồi chọn **Generate audio** cho một trang. Khi hoàn tất, chọn **Preview** để nghe. Chỉ duyệt khi audio có tiếng và đọc đúng.

Những lần dùng sau, mở PowerShell, đặt lại `$ttsSdkRoot`, `$ttsPython`, `LEARNABLE_VIENEU_PATH`, `LEARNABLE_API_URL` và `$ttsModelDir`, rồi chạy lại lệnh `run`. Các biến PowerShell không được giữ lại sau khi đóng cửa sổ. Nếu agent báo hết hạn ghép máy, chạy lại `pair` trước.

### Chạy lại trên máy đã cài bằng adapter LoRA

Máy thử nghiệm dùng adapter thay cho gói model có `manifest.json`. Mỗi lần mở PowerShell mới, chạy các lệnh sau. Thay đường dẫn nếu bạn đã cài ở nơi khác; không cần cài lại Python hay agent.

```powershell
$ttsSdkRoot = 'C:\Capstone2026\VieNue-LoRA'
$ttsPython = Join-Path $ttsSdkRoot '.venv\Scripts\python.exe'
$ttsAdapter = Join-Path $ttsSdkRoot 'finetune\output\kaggle\vieneu-lora\ngoc_huyen-full-20261108-1234-s42\best_adapter'
$env:LEARNABLE_VIENEU_PATH = $ttsSdkRoot
$env:LEARNABLE_API_URL = 'https://backend-learnable.onrender.com/api/v1'
Set-Location 'C:\Capstone2026\Backend-LearnAble-TTS'
& $ttsPython -m learnable_tts_agent.cli run --adapter-dir $ttsAdapter --adapter-sha256 'ff93e9d4d599873a2db3636220a31fe7771d884f5fe0583e7314cca9280bd745' --preset-voice ngoc_huyen
```

Nếu báo hết hạn ghép máy, chạy lệnh sau trong cùng cửa sổ PowerShell, nhập mật khẩu Lecturer (không hiện ký tự khi gõ), rồi chạy lại dòng `run` ở trên:

```powershell
& $ttsPython -m learnable_tts_agent.cli pair --identifier 'LEC0001' --device-name "$env:COMPUTERNAME-TTS"
```

Giữ cửa sổ agent mở khi tạo audio; nhấn `Ctrl+C` để dừng. Agent nhận job cũ nhất đang chờ của cùng tài khoản Lecturer. Vì vậy, nếu còn job của tài liệu cũ, chạy lại agent sẽ tiếp tục xử lý chúng trước tài liệu mới. Cần hủy các job cũ trên hệ thống trước khi chạy lại nếu muốn chuyển sang tài liệu khác.

## Khi gặp lỗi

- **Không thấy CUDA:** nhờ kỹ thuật viên kiểm tra GPU, driver và bản PyTorch trong đúng môi trường `.venv`.
- **Tải model lỗi:** kiểm tra URL manifest và SHA-256 trường đã cấp; không tự tải một model khác thay thế.
- **Ghép máy lỗi:** kiểm tra tài khoản Lecturer, URL API HTTPS và trạng thái đổi mật khẩu lần đầu.
- **Audio chờ lâu:** kiểm tra cửa sổ agent còn chạy và máy không ngủ. Gửi ảnh lỗi cùng thời điểm xảy ra cho bộ phận kỹ thuật. Không gửi mật khẩu, token hoặc URL upload có chữ ký.

Hướng dẫn có hình và từng bước: mở trang `/guides/local-tts-lecturer-guide.html` trên website LearnAble.
