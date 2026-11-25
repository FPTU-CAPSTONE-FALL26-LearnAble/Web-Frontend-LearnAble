# Set up LearnAble TTS Agent on Windows

[Tiếng Việt](README.md) · [Open the step-by-step web guide](/guides/local-tts-lecturer-guide-en.html)

LearnAble TTS Agent uses the lecturer's NVIDIA GPU to create audio for learning materials and questions. You do not need to install Python or the CUDA Toolkit, run the Backend, or train a model.

## 1. Get the installation package

1. Open the [LearnAble-TTS-Handoff ZIP on Google Drive](https://drive.google.com/file/d/1aeYMl55FAF7NPWPkIkz5XkdX0BImHzIE/view?usp=sharing) and download it. If Drive cannot preview the large file, download it anyway.
2. Extract the downloaded ZIP and open the `LearnAble-TTS-Handoff` folder inside it.

The folder should contain:

- `LearnAble-TTS-Setup.exe` — the Windows installer.
- `model-ngoc-huyen-kaggle-20261108.zip` — the complete model package. Inside is a `model` folder containing `manifest.json` and `manifest.sha256`.
- `model-ngoc-huyen-kaggle-20261108.zip.sha256` — the checksum that the deployment team should verify before handing out the model.
- `README_GPU_SETUP.md` — the Backend team's original setup notes.

Your computer needs Windows 10/11 64-bit, a working NVIDIA GPU and driver, internet access, and about 15 GB of free space. You also need an active Lecturer account and a Lecturer website connected to the **same Backend environment** as the agent. The API URL used in this setup is `https://api.learnable.site/api/v1`.

This package is installed from a local folder. `artifacts.invalid` in the manifest is not a download link. The deployment team must confirm the model's redistribution rights before distributing it widely.

## 2. Install the app and model

1. Run `LearnAble-TTS-Setup.exe`, follow the installer, and open **LearnAble TTS Agent** from the Start Menu.
2. The app runs in the system tray without a main window. Click **^** near the Windows clock, find the speaker icon named **LearnAble TTS Agent**, and right-click it. If starting it again says “already running in the system tray,” use the existing tray icon.
3. Select **Settings**. Enter `https://api.learnable.site/api/v1` in **API URL (include /api/v1)**. Enter the HTTPS Lecturer website URL supplied for the same environment in **Web dashboard URL**, or leave it blank when testing on localhost. Set a recognizable **Device label**. Leave **Runtime executable (optional)** blank for the complete installer.
4. Extract `model-ngoc-huyen-kaggle-20261108.zip` to a permanent location, such as `C:\LearnAble-TTS-Model`. Open its inner `model` folder and confirm that `manifest.json` and `manifest.sha256` are directly inside it.
5. In **Settings → Verified model folder**, select that inner `model` folder, then click **OK**. Do not select the ZIP or its outer folder, and do not move the model afterward.

If the app shows `MODEL_SETUP_REQUIRED`, check the folder selection. Ask the deployment team to verify the package checksum if needed.

## 3. Check and pair the device

1. From the tray menu, select **Check GPU**. The result should show your NVIDIA GPU, VRAM, PyTorch, and CUDA. This check does not yet prove that audio can be generated.
2. Sign in to the Lecturer website for the same Backend environment. Click **Pair TTS Device** in the sidebar. Enter a device name and select **Đăng ký máy** (Register device). The web page returns **Agent ID**, **Expires at (ISO 8601)**, and a one-time device token.
3. Select **Pair Device** in the Windows agent. Paste all three values into the matching fields, then click **OK**. The web page hides the token after two minutes. Never share your token or a screenshot of it.

The device credential expires after about **eight hours**. Pair again when it expires. To change Lecturer accounts, choose **Unpair Device** first. Unpairing while offline may leave an old registration on the server; use **Pair TTS Device → Ngắt kết nối** (Disconnect) on the website to revoke it.

## 4. Generate a short sample

1. Keep the laptop plugged in, connected to the internet, and awake. Open a short text-based PDF in **Material Audio Studio**.
2. Review the text to be spoken and generate audio for **one page** first. Keep the Windows agent running.
3. When audio is ready, listen with **Preview** and select **Approve** only if it sounds right. Then generate audio for the full document.

For a saved question, open its audio status and select **Create with Local TTS** for missing parts. Multiple-choice questions can have separate audio for the question and each answer. The agent and Lecturer website must use the same EC2 Backend to receive these jobs.

The tray may show `IDLE` (waiting), `GENERATING`, `UPLOADING`, `PAIRING_REQUIRED`, `MODEL_SETUP_REQUIRED`, or `ERROR`. **Pause / Resume** only stops accepting new jobs. On later days, simply start the app again or let it start with Windows; reinstalling is unnecessary.

## Troubleshooting

- **“Already running,” but no icon:** press **Win + B** or click **^** by the clock. Look for LearnAble TTS Agent. If it is not listed, check **Windows Settings → Personalization → Taskbar → Other system tray icons**. If necessary, end `LearnAble-TTS-Agent.exe` in **Task Manager → Details** and start it again.
- **No NVIDIA GPU:** check Task Manager and the NVIDIA driver, then restart Windows after updating the driver.
- **Invalid model:** select the inner `model` folder containing both manifest files and ask the deployment team to verify the ZIP checksum.
- **Agent is IDLE while jobs wait:** confirm that the website and agent use the same API environment, Lecturer account, and compatible model version.
- **Audio waits too long or fails:** select **View Logs**. Send the error code, time, and GPU name to support. Never send passwords, device tokens, or signed upload links.
- **OFFLINE — NETWORK_UNAVAILABLE:** check the API URL and network. A successful registration only confirms that the device credential exists; it does not prove that the agent is receiving jobs. Ask the Backend team to inspect the heartbeat and job-claim endpoints if the issue continues.

Before uninstalling or switching accounts, choose **Unpair Device**. If the agent was offline, also revoke the old device on the website when connectivity returns.

> The deployment team should test the complete installer, model, web → agent → audio upload → approval flow on a lecturer machine before using it for long documents. One short successful sample does not guarantee that every 4 GB GPU can handle a long document.
