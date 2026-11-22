import { getAccessibilityProfile, updateAccessibilityProfile } from "./accessibility";

const preferences = {
  voiceCode: "vi-VN-voice",
  speechRate: 1.25,
  fontSize: 18,
  zoomPercent: 125,
  contrastTheme: "HighContrast",
  preferredInputMethod: "Voice",
  audioFeedbackEnabled: false,
  userId: "11111111-1111-4111-8111-111111111111",
};
const reply = (data: unknown, success = true) =>
  new Response(JSON.stringify({ success, message: success ? null : "Refused.", data, errors: null }));

describe("student accessibility preferences API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the TTS voice and rate from /StudentProfiles/me/preferences", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(preferences));
    expect(await getAccessibilityProfile()).toEqual({ ttsVoiceUri: "vi-VN-voice", ttsRate: 1.25 });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/StudentProfiles\/me\/preferences$/);
  });

  it("falls back to no voice at normal speed and keeps the rate inside 0.5–2", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply({ voiceCode: null }));
    expect(await getAccessibilityProfile()).toEqual({ ttsVoiceUri: null, ttsRate: 1 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(reply({ voiceCode: "", speechRate: 3 }));
    expect(await getAccessibilityProfile()).toEqual({ ttsVoiceUri: null, ttsRate: 2 });
  });

  it("saves the voice and rate without resetting the other preferences", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(preferences))
      .mockResolvedValueOnce(reply({ ...preferences, voiceCode: null, speechRate: 0.75 }));
    expect(await updateAccessibilityProfile({ ttsVoiceUri: null, ttsRate: 0.75 })).toEqual({
      ttsVoiceUri: null,
      ttsRate: 0.75,
    });
    const [, put] = fetchMock.mock.calls;
    expect(put[1]?.method).toBe("PUT");
    expect(JSON.parse(String(put[1]?.body))).toEqual({
      voiceCode: null,
      speechRate: 0.75,
      fontSize: 18,
      zoomPercent: 125,
      contrastTheme: "HighContrast",
      preferredInputMethod: "Voice",
      audioFeedbackEnabled: false,
    });
  });

  it("fails with the Backend message when the envelope reports a refusal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(null, false));
    await expect(getAccessibilityProfile()).rejects.toMatchObject({ serverMessage: "Refused." });
  });
});
