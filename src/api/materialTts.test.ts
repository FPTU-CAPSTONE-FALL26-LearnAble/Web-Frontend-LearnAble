import {
  approveSlideAudio,
  generateMaterialAudio,
  getMaterialFileLink,
  getMaterialTtsSlides,
  getSlideAudioPlayback,
  updateSlideTtsText,
} from "@/api/materialTts";

const respond = (data: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(data === null ? null : JSON.stringify(data), { status }),
  );

describe("material Local TTS API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads extracted slides from the lecturer material endpoint", async () => {
    respond({ success: true, message: null, errors: null, data: [{
      slideId: "slide-1",
      slideNumber: 1,
      unitKind: "Slide",
      originalText: "Original",
      ttsText: "Spoken",
      extractionStatus: "Completed",
      publishedAudioId: null,
      audioVersions: [],
    }] });
    await expect(getMaterialTtsSlides("material-1")).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/lecturer/materials/material-1/slides"), expect.anything());
  });

  it("sends the corrected text and accepts the backend's empty 200 response", async () => {
    respond(null);
    await expect(updateSlideTtsText("slide-1", "Corrected text")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/lecturer/slides/slide-1/tts-text"), expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ text: "Corrected text" }),
    }));
  });

  it("queues a material batch with the configured voice", async () => {
    respond({ success: true, message: null, errors: null, data: { batchId: "batch-1", jobs: [] } }, 202);
    await expect(generateMaterialAudio("material-1", { voiceId: "voice-en", speed: 1 })).resolves.toMatchObject({ batchId: "batch-1" });
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({ voiceId: "voice-en", speed: 1 });
  });



  it("approves an audio version with an empty successful response", async () => {
    respond(null);
    await expect(approveSlideAudio("slide-1", "audio-1")).resolves.toBeUndefined();
  });

  it("reads the direct playback link returned for lecturer audio", async () => {
    respond({ success: true, data: { url: "https://audio.test/slide.wav", expiresAt: "2026-11-22T00:00:00Z" } });
    await expect(getSlideAudioPlayback("slide-1", "audio-1")).resolves.toMatchObject({ url: "https://audio.test/slide.wav" });
  });

  it("loads the original material file link for the PDF viewer", async () => {
    respond({ success: true, data: { url: "https://files.test/material.pdf", expiresAt: "2026-11-22T00:10:00Z" } });
    await expect(getMaterialFileLink("material-1")).resolves.toMatchObject({ url: "https://files.test/material.pdf" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/LearningMaterials/material-1/file"), expect.anything());
  });
});
