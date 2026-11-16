import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ApiFailure } from "@/api/client";
import {
  CurriculumLookupFailure,
  type AssistantConversation,
  type AssistantMessage,
} from "@/api/learningAssistant";
import { expectNoAxeViolations } from "@/shared/ui/testing/expectNoAxeViolations";
import { AssistantRoute } from "./AssistantRoute";

const api = vi.hoisted(() => ({
  getAssistantConversations: vi.fn(),
  getAssistantMessages: vi.fn(),
  startAssistantConversation: vi.fn(),
  deleteAssistantConversation: vi.fn(),
  askAssistant: vi.fn(),
  getAssistantMessageAudio: vi.fn(),
  startAssistantRealtimeSession: vi.fn(),
  getMyCurriculumSubjectIds: vi.fn(),
}));
vi.mock("@/api/learningAssistant", async (importOriginal) => ({
  CurriculumLookupFailure: (await importOriginal<typeof import("@/api/learningAssistant")>())
    .CurriculumLookupFailure,
  ...api,
}));
vi.mock("@/api/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/catalog")>()),
  getSubjects: vi.fn(async () => ({
    items: [
      { subjectId: "course-1", subjectCode: "PRO192", subjectNameEn: "Object-Oriented Programming" },
      { subjectId: "course-2", subjectCode: "MAD101", subjectNameEn: "Discrete Mathematics" },
      { subjectId: "course-3", subjectCode: "ENG111", subjectNameEn: "Elementary English" },
    ],
  })),
}));

const conversation = (overrides: Partial<AssistantConversation> = {}): AssistantConversation => ({
  conversationId: "c1",
  courseId: "course-1",
  courseName: null,
  title: "What is encapsulation?",
  updatedAt: "2026-11-12T02:00:00Z",
  ...overrides,
});
const message = (overrides: Partial<AssistantMessage>): AssistantMessage => ({
  messageId: "m1",
  role: "user",
  text: "What is encapsulation?",
  sources: [],
  limitations: [],
  evidenceStatus: null,
  createdAt: null,
  ...overrides,
});
const answer = (overrides: Partial<AssistantMessage> = {}) =>
  message({
    messageId: "m2",
    role: "assistant",
    text: "Encapsulation hides state.",
    sources: [
      { key: "s1", title: "Course Book — Chapter 2", type: "Material", url: null, pageNumber: 34, slideNumber: null },
      { key: "s2", title: "Week 3 slides", type: "Material", url: "https://example.com/slides", pageNumber: null, slideNumber: 12 },
    ],
    ...overrides,
  });

// ── Browser speech and audio stand-ins ──────────────────────────────────────
class FakeAudio {
  static instances: FakeAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  error = null;
  paused = false;
  constructor(public src: string) {
    FakeAudio.instances.push(this);
  }
  play = vi.fn(async () => undefined);
  pause = vi.fn(() => {
    this.paused = true;
  });
}
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = true;
  interimResults = true;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    FakeRecognition.instances.push(this);
  }
  say(transcript: string) {
    this.onresult?.({ results: [[{ transcript }]] });
  }
}
const lastRecognition = () => FakeRecognition.instances.at(-1)!;

class FakePeerConnection {
  static instances: FakePeerConnection[] = [];
  iceGatheringState = "complete";
  connectionState = "new";
  localDescription: { type: string; sdp: string } | null = null;
  remoteDescription: { type: string; sdp: string } | null = null;
  onconnectionstatechange: (() => void) | null = null;
  ontrack: ((event: unknown) => void) | null = null;
  addTrack = vi.fn();
  close = vi.fn();
  constructor() {
    FakePeerConnection.instances.push(this);
  }
  createOffer = vi.fn(async () => ({ type: "offer", sdp: "v=0 offer" }));
  setLocalDescription = vi.fn(async (description: { type: string; sdp: string }) => {
    this.localDescription = description;
  });
  setRemoteDescription = vi.fn(async (description: { type: string; sdp: string }) => {
    this.remoteDescription = description;
  });
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}
const micTrack = { stop: vi.fn() };
const getUserMedia = vi.fn();
function stubLiveVoice() {
  FakePeerConnection.instances = [];
  micTrack.stop.mockClear();
  getUserMedia.mockReset();
  getUserMedia.mockResolvedValue({ getTracks: () => [micTrack] });
  vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
}

function view() {
  const router = createMemoryRouter([{ path: "/", element: <main><AssistantRoute /></main> }]);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
async function openConversation() {
  await userEvent.click(await screen.findByRole("button", { name: "Open conversation: What is encapsulation?" }));
  return screen.findByRole("log", { name: "Conversation" });
}

describe("AssistantRoute", () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    api.getAssistantConversations.mockResolvedValue([conversation()]);
    api.getMyCurriculumSubjectIds.mockResolvedValue(["course-1", "course-2"]);
    api.getAssistantMessages.mockResolvedValue([message({}), answer()]);
    api.getAssistantMessageAudio.mockResolvedValue("https://cdn.example.com/m2.mp3");
    FakeAudio.instances = [];
    FakeRecognition.instances = [];
    localStorage.clear();
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("explains an empty history and offers a new conversation", async () => {
    api.getAssistantConversations.mockResolvedValue([]);
    const { container } = view();
    const history = screen.getByRole("navigation", { name: "Conversation history" });
    expect(await within(history).findByText("No conversations yet")).toBeInTheDocument();
    // The Backend lists one course at a time; the first course is shown to start with.
    expect(screen.getByLabelText("Course")).toHaveValue("course-1");
    expect(api.getAssistantConversations).toHaveBeenCalledWith("course-1");
    expect(within(history).getByRole("button", { name: /New conversation/ })).toBeInTheDocument();
    // A question can be asked straight away: no separate "create" step.
    expect(screen.getByRole("heading", { level: 2, name: "New conversation — PRO192 — Object-Oriented Programming" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your question")).toBeEnabled();
    await expectNoAxeViolations(container);
  });

  it("opens a conversation with labelled speakers, the course and cited sources", async () => {
    const { container } = view();
    const log = await openConversation();
    // Answers are spoken through the page's one announcement channel, not by the log.
    expect(log).toHaveAttribute("aria-live", "off");
    expect(within(log).getByRole("heading", { level: 3, name: "You — question 1" })).toBeInTheDocument();
    expect(within(log).getByRole("heading", { level: 3, name: "Assistant — answer 1, 2 sources" })).toBeInTheDocument();
    expect(within(log).getByText("Encapsulation hides state.")).toBeInTheDocument();
    const sources = within(log).getByRole("list", { name: "Sources" });
    expect(within(sources).getByText("Course Book — Chapter 2")).toBeInTheDocument();
    expect(within(sources).getByText(/page 34/)).toBeInTheDocument();
    expect(within(sources).getByRole("link", { name: /Week 3 slides/ })).toHaveAttribute("href", "https://example.com/slides");
    expect(screen.getByText("Course: PRO192 — Object-Oriented Programming")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open conversation: What is encapsulation?" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("Your question")).toHaveFocus();
    await expectNoAxeViolations(container);
  });

  it("starts the conversation with the first question, in the chosen course", async () => {
    api.getAssistantConversations.mockResolvedValue([]);
    const created = conversation({ conversationId: "c9", courseId: "course-2", title: null, updatedAt: null });
    api.startAssistantConversation.mockImplementation(async () => {
      api.getAssistantConversations.mockImplementation(async (courseId: string) => (courseId === "course-2" ? [created] : []));
      return created;
    });
    api.askAssistant.mockResolvedValue(answer());
    view();
    await screen.findByRole("option", { name: "MAD101 — Discrete Mathematics" });
    await userEvent.selectOptions(screen.getByLabelText("Course"), "course-2");
    expect(screen.getByRole("heading", { level: 2, name: "New conversation — MAD101 — Discrete Mathematics" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Your question"), "What is a set?{Enter}");
    await waitFor(() => expect(api.askAssistant).toHaveBeenCalled());
    expect(api.startAssistantConversation).toHaveBeenCalledWith("course-2");
    expect(api.askAssistant.mock.calls[0].slice(0, 2)).toEqual(["c9", "What is a set?"]);
    expect(await screen.findByText("Encapsulation hides state.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "You — question 1" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Open conversation/ })).toHaveAttribute("aria-current", "true");
  });

  it("says in words when the conversation cannot be started", async () => {
    api.getAssistantConversations.mockResolvedValue([]);
    api.startAssistantConversation.mockRejectedValue(new ApiFailure({ kind: "server", status: 400 }, "A subject is required."));
    view();
    await userEvent.type(await screen.findByLabelText("Your question"), "Hello{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("A subject is required.");
    expect(api.askAssistant).not.toHaveBeenCalled();
  });

  it("sends with Enter, shows that it is searching, then the answer with its sources", async () => {
    api.getAssistantMessages.mockResolvedValue([]);
    let resolve!: (value: AssistantMessage) => void;
    api.askAssistant.mockReturnValue(new Promise<AssistantMessage>((r) => (resolve = r)));
    view();
    const log = await openConversation();
    const input = screen.getByLabelText("Your question");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    await userEvent.type(input, "First line{Shift>}{Enter}{/Shift}second line");
    expect(api.askAssistant).not.toHaveBeenCalled();
    await userEvent.type(input, "{Enter}");

    expect(api.askAssistant).toHaveBeenCalledTimes(1);
    expect(api.askAssistant.mock.calls[0].slice(0, 2)).toEqual(["c1", "First line\nsecond line"]);
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.getByText("Searching your course materials…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stop waiting for the answer/ })).toBeInTheDocument();
    expect(within(log).getByText(/First line/)).toBeInTheDocument();
    // A second question cannot be sent while the first is waiting.
    await userEvent.type(input, "Another{Enter}");
    expect(api.askAssistant).toHaveBeenCalledTimes(1);

    await act(async () => resolve(answer()));
    expect(await within(log).findByText("Encapsulation hides state.")).toBeInTheDocument();
    expect(within(log).getByRole("list", { name: "Sources" })).toBeInTheDocument();
    expect(screen.queryByText("Searching your course materials…")).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("marks an answer that cites no sources in words", async () => {
    api.getAssistantMessages.mockResolvedValue([message({}), answer({ sources: [], limitations: ["Nothing was found in the materials."] })]);
    view();
    const log = await openConversation();
    expect(within(log).getByText(/No sources were cited for this answer/)).toBeInTheDocument();
    expect(within(log).getByText("Nothing was found in the materials.")).toBeInTheDocument();
  });

  it("shows the Backend's own words when a question is refused, and can retry", async () => {
    api.getAssistantMessages.mockResolvedValue([]);
    api.askAssistant.mockRejectedValueOnce(new ApiFailure({ kind: "server", status: 400 }, "This question is outside the scope of the course."));
    view();
    await openConversation();
    await userEvent.type(screen.getByLabelText("Your question"), "Tell me a joke{Enter}");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This question is outside the scope of the course.");

    api.askAssistant.mockResolvedValueOnce(answer());
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(api.askAssistant.mock.calls[1].slice(0, 2)).toEqual(["c1", "Tell me a joke"]);
    expect(await screen.findByText("Encapsulation hides state.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stops waiting for an answer on request", async () => {
    api.getAssistantMessages.mockResolvedValue([]);
    api.askAssistant.mockImplementation(
      (_id: string, _question: string, signal: AbortSignal) =>
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(new ApiFailure({ kind: "network" })))),
    );
    view();
    await openConversation();
    await userEvent.type(screen.getByLabelText("Your question"), "Slow question{Enter}");
    await userEvent.click(await screen.findByRole("button", { name: /Stop waiting for the answer/ }));
    await waitFor(() => expect(screen.queryByText("Searching your course materials…")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("plays an answer's audio once fetched, and stops it", async () => {
    view();
    const log = await openConversation();
    await userEvent.click(within(log).getByRole("button", { name: "Listen to answer 1" }));
    const stop = await within(log).findByRole("button", { name: "Stop playing answer 1" });
    expect(api.getAssistantMessageAudio).toHaveBeenCalledWith("c1", "m2");
    expect(FakeAudio.instances[0].src).toBe("https://cdn.example.com/m2.mp3");

    await userEvent.click(stop);
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
    await userEvent.click(await within(log).findByRole("button", { name: "Listen to answer 1" }));
    await within(log).findByRole("button", { name: "Stop playing answer 1" });
    expect(api.getAssistantMessageAudio).toHaveBeenCalledTimes(1);
  });

  it("keeps the text and says so when audio cannot be played", async () => {
    api.getAssistantMessageAudio.mockRejectedValue(new Error("down"));
    view();
    const log = await openConversation();
    await userEvent.click(within(log).getByRole("button", { name: "Listen to answer 1" }));
    expect(await within(log).findByRole("alert")).toHaveTextContent("The audio could not be played.");
    expect(within(log).getByText("Encapsulation hides state.")).toBeInTheDocument();
  });

  it("deletes a conversation only after confirmation", async () => {
    api.deleteAssistantConversation.mockResolvedValue(undefined);
    view();
    await openConversation();
    await userEvent.click(screen.getByRole("button", { name: "Delete conversation: What is encapsulation?" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete this conversation?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(api.deleteAssistantConversation).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete conversation: What is encapsulation?" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete conversation" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(api.deleteAssistantConversation).toHaveBeenCalledWith("c1");
    expect(screen.queryByRole("button", { name: /Open conversation/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /^New conversation — PRO192/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New conversation/ })).toHaveFocus();
  });

  it("voice mode: hears a question, asks it, speaks the answer, and listens again hands-free", async () => {
    api.getAssistantMessages.mockResolvedValue([]);
    api.askAssistant.mockResolvedValue(answer());
    const { container } = view();
    const log = await openConversation();
    await userEvent.click(screen.getByRole("button", { name: "Voice" }));
    expect(screen.getByRole("button", { name: "Voice" })).toHaveAttribute("aria-pressed", "true");
    expect(log).toHaveAttribute("aria-live", "off");
    const panel = screen.getByRole("region", { name: "Voice controls" });
    expect(within(panel).getByText("Ready")).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(within(panel).getByRole("checkbox", { name: "Hands-free conversation" }));
    await userEvent.click(within(panel).getByRole("button", { name: /Start speaking/ }));
    expect(within(panel).getByText("Listening…")).toBeInTheDocument();
    expect(lastRecognition().lang).toBe("vi-VN");
    expect(lastRecognition().start).toHaveBeenCalled();

    act(() => lastRecognition().say("What is encapsulation?"));
    expect(await within(panel).findByText("What is encapsulation?")).toBeInTheDocument();
    expect(api.askAssistant.mock.calls[0].slice(0, 2)).toEqual(["c1", "What is encapsulation?"]);
    expect(await within(panel).findByText("Speaking the answer")).toBeInTheDocument();
    expect(await within(log).findByText("Encapsulation hides state.")).toBeInTheDocument();
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));

    const before = FakeRecognition.instances.length;
    await act(async () => FakeAudio.instances[0].onended?.());
    expect(await within(panel).findByText("Listening…")).toBeInTheDocument();
    expect(FakeRecognition.instances.length).toBe(before + 1);

    // Esc stops everything.
    await userEvent.keyboard("{Escape}");
    expect(await within(panel).findByText("Ready")).toBeInTheDocument();
    expect(lastRecognition().abort).toHaveBeenCalled();
  });

  it("voice mode: explains a refused microphone and points to Chat", async () => {
    api.getAssistantMessages.mockResolvedValue([]);
    view();
    await openConversation();
    await userEvent.click(screen.getByRole("button", { name: "Voice" }));
    await userEvent.keyboard("{Control>} {/Control}");
    act(() => lastRecognition().onerror?.({ error: "not-allowed" }));
    expect(await screen.findByText(/Microphone access was refused.*use Chat mode/)).toBeInTheDocument();
    expect(api.askAssistant).not.toHaveBeenCalled();
  });

  it("locks voice mode and says why when the browser cannot recognise speech", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("Audio", FakeAudio);
    view();
    await openConversation();
    const voice = screen.getByRole("button", { name: "Voice" });
    expect(voice).toBeDisabled();
    expect(voice).toHaveAccessibleDescription(/this browser does not provide/);
  });

  it("lists the conversations of the chosen course and shows why a load failed", async () => {
    api.getAssistantConversations.mockImplementation(async (courseId: string) => {
      if (courseId === "course-2") throw new ApiFailure({ kind: "server", status: 400 }, "A subject is required.");
      return [conversation()];
    });
    view();
    await openConversation();
    await userEvent.selectOptions(screen.getByLabelText("Course"), "course-2");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your conversations could not be loaded.");
    expect(alert).toHaveTextContent("A subject is required.");
    // The open conversation belonged to the other course, so it is closed.
    expect(screen.getByRole("heading", { level: 2, name: /^New conversation — MAD101/ })).toBeInTheDocument();
  });

  it("keeps the chosen text size and applies it to questions and answers", async () => {
    const first = view();
    const log = await openConversation();
    expect(within(log).getByText("Encapsulation hides state.")).toHaveClass("text-lg");
    const sizes = screen.getByRole("group", { name: "Text size" });
    await userEvent.click(within(sizes).getByRole("button", { name: "Extra large" }));
    expect(within(sizes).getByRole("button", { name: "Extra large" })).toHaveAttribute("aria-pressed", "true");
    expect(within(log).getByText("Encapsulation hides state.")).toHaveClass("text-3xl");
    expect(screen.getByLabelText("Your question")).toHaveClass("text-3xl");

    first.unmount();
    view();
    expect(within(await screen.findByRole("group", { name: "Text size" })).getByRole("button", { name: "Extra large" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reads a new answer aloud when the student asked for that", async () => {
    api.getAssistantMessages.mockResolvedValue([]);
    api.askAssistant.mockResolvedValue(answer());
    view();
    await openConversation();
    await userEvent.click(screen.getByRole("checkbox", { name: "Read answers aloud" }));
    await userEvent.type(screen.getByLabelText("Your question"), "What is encapsulation?{Enter}");
    await waitFor(() => expect(api.getAssistantMessageAudio).toHaveBeenCalledWith("c1", "m2"));
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    // Focus stays in the question box, ready for the next question.
    expect(screen.getByLabelText("Your question")).toHaveFocus();
  });

  it("supports the page shortcuts", async () => {
    view();
    await openConversation();
    await userEvent.keyboard("{Control>}{Shift>}m{/Shift}{/Control}");
    expect(screen.getByRole("button", { name: "Voice" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{Control>}{Shift>}m{/Shift}{/Control}");
    expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.keyboard("{Control>}{Shift>}l{/Shift}{/Control}");
    await waitFor(() => expect(api.getAssistantMessageAudio).toHaveBeenCalledWith("c1", "m2"));

    await userEvent.keyboard("{Control>}/{/Control}");
    const help = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(help).getByText("Ctrl+Shift+E")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.keyboard("{Control>}{Shift>}h{/Shift}{/Control}");
    expect(screen.getByRole("heading", { level: 3, name: "Assistant — answer 1, 2 sources" })).toHaveFocus();

    await userEvent.keyboard("{Control>}{Shift>}e{/Shift}{/Control}");
    expect(screen.getByRole("heading", { level: 2, name: /^New conversation — PRO192/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Your question")).toHaveFocus();
  });

  it("offers only the subjects of the student's curriculum", async () => {
    view();
    const course = screen.getByRole("combobox", { name: "Course" });
    await within(course).findByRole("option", { name: /PRO192/ });
    expect(within(course).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "PRO192 — Object-Oriented Programming",
      "MAD101 — Discrete Mathematics",
    ]);
    expect(api.getAssistantConversations).toHaveBeenCalledWith("course-1");
  });

  it("says no course is available when the student has no curriculum, and asks nothing", async () => {
    api.getMyCurriculumSubjectIds.mockResolvedValue(null);
    view();
    expect(await screen.findByText("No courses are available to you.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Course" })).toBeDisabled();
    expect(api.getAssistantConversations).not.toHaveBeenCalled();
  });

  it("says which step failed, and why, when the curriculum cannot be read", async () => {
    api.getMyCurriculumSubjectIds.mockRejectedValue(
      new CurriculumLookupFailure("profile", new ApiFailure({ kind: "server", status: 403 }, "Forbidden.")),
    );
    view();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The course list could not be loaded.");
    expect(alert).toHaveTextContent("Your student profile could not be read. (HTTP 403: Forbidden.)");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("moves between messages with the arrow keys from the latest answer", async () => {
    view();
    const log = await openConversation();
    await userEvent.keyboard("{Control>}{Shift>}h{/Shift}{/Control}");
    expect(within(log).getByRole("heading", { level: 3, name: /^Assistant — answer 1/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(within(log).getByRole("article", { name: "You — question 1" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(within(log).getByRole("article", { name: /^Assistant — answer 1/ })).toHaveFocus();
  });

  it("asks for a simpler explanation of the latest answer with one button", async () => {
    api.askAssistant.mockResolvedValue(answer({ messageId: "m3", text: "It keeps data safe inside an object." }));
    view();
    const log = await openConversation();
    expect(within(log).getByText("Grounded in 2 sources")).toBeInTheDocument();
    await userEvent.click(within(log).getByRole("button", { name: "Simpler explanation" }));
    expect(api.askAssistant.mock.calls[0].slice(0, 2)).toEqual([
      "c1",
      "Explain your last answer again in simpler words, with a short example.",
    ]);
    expect(await within(log).findByText("It keeps data safe inside an object.")).toBeInTheDocument();
  });

  it("keeps the current keys in view and links to the colour settings", async () => {
    view();
    await openConversation();
    const keys = screen.getByRole("complementary", { name: "Keys" });
    expect(within(keys).getByText("move through messages")).toBeInTheDocument();
    expect(within(keys).getByText("send")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Colours and contrast" })).toHaveAttribute("href", "/settings/accessibility");
  });

  describe("live voice", () => {
    beforeEach(stubLiveVoice);
    afterEach(() => {
      Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    });

    it("opens a WebRTC session for the conversation, then ends it and frees the microphone", async () => {
      api.getAssistantMessages.mockResolvedValue([]);
      api.startAssistantRealtimeSession.mockResolvedValue({
        conversationId: "c1", sdp: "v=0 answer", model: null, voice: null,
      });
      const { container } = view();
      await openConversation();
      await userEvent.click(screen.getByRole("button", { name: "Voice" }));
      const live = screen.getByRole("region", { name: "Live voice (experimental)" });
      await userEvent.click(within(live).getByRole("button", { name: "Start live voice" }));

      expect(await within(live).findByText("Live voice is on. Speak at any time.")).toBeInTheDocument();
      expect(api.startAssistantRealtimeSession).toHaveBeenCalledWith("c1", "v=0 offer");
      const connection = FakePeerConnection.instances[0];
      expect(connection.addTrack).toHaveBeenCalledTimes(1);
      expect(connection.remoteDescription).toEqual({ type: "answer", sdp: "v=0 answer" });
      // The microphone is taken: turn-based listening waits.
      expect(screen.getByRole("button", { name: /Start speaking/ })).toBeDisabled();
      await expectNoAxeViolations(container);

      await userEvent.click(within(live).getByRole("button", { name: "End live voice" }));
      expect(connection.close).toHaveBeenCalled();
      expect(micTrack.stop).toHaveBeenCalled();
      expect(within(live).getByRole("button", { name: "Start live voice" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start speaking/ })).toBeEnabled();
    });

    it("starts the conversation first when there is none, and Esc ends the session", async () => {
      api.getAssistantConversations.mockResolvedValue([]);
      api.startAssistantConversation.mockResolvedValue(conversation({ conversationId: "c9", title: null }));
      api.startAssistantRealtimeSession.mockResolvedValue({
        conversationId: "c9", sdp: "v=0 answer", model: null, voice: null,
      });
      view();
      await screen.findByRole("option", { name: /PRO192/ });
      await userEvent.click(screen.getByRole("button", { name: "Voice" }));
      await userEvent.click(screen.getByRole("button", { name: "Start live voice" }));
      expect(await screen.findByText("Live voice is on. Speak at any time.")).toBeInTheDocument();
      expect(api.startAssistantConversation).toHaveBeenCalledWith("course-1");
      expect(api.startAssistantRealtimeSession).toHaveBeenCalledWith("c9", "v=0 offer");

      await userEvent.keyboard("{Escape}");
      expect(await screen.findByRole("button", { name: "Start live voice" })).toBeInTheDocument();
      expect(FakePeerConnection.instances[0].close).toHaveBeenCalled();
    });

    it("explains a refused microphone, a failed start and a lost connection", async () => {
      api.getAssistantMessages.mockResolvedValue([]);
      view();
      await openConversation();
      await userEvent.click(screen.getByRole("button", { name: "Voice" }));
      const live = screen.getByRole("region", { name: "Live voice (experimental)" });
      const start = () => userEvent.click(within(live).getByRole("button", { name: "Start live voice" }));

      getUserMedia.mockRejectedValueOnce(new DOMException("no", "NotAllowedError"));
      await start();
      expect(await within(live).findByText(/Microphone access was refused/)).toBeInTheDocument();
      expect(api.startAssistantRealtimeSession).not.toHaveBeenCalled();

      api.startAssistantRealtimeSession.mockRejectedValueOnce(new Error("503"));
      await start();
      expect(await within(live).findByText(/Live voice could not start/)).toBeInTheDocument();
      expect(micTrack.stop).toHaveBeenCalled();

      api.startAssistantRealtimeSession.mockResolvedValue({
        conversationId: "c1", sdp: "v=0 answer", model: null, voice: null,
      });
      await start();
      await within(live).findByText("Live voice is on. Speak at any time.");
      const connection = FakePeerConnection.instances.at(-1)!;
      connection.connectionState = "failed";
      act(() => connection.onconnectionstatechange?.());
      expect(await within(live).findByText(/connection was lost/)).toBeInTheDocument();
    });

    it("says so when the browser has no WebRTC", async () => {
      vi.stubGlobal("RTCPeerConnection", undefined);
      api.getAssistantMessages.mockResolvedValue([]);
      view();
      await openConversation();
      await userEvent.click(screen.getByRole("button", { name: "Voice" }));
      const start = screen.getByRole("button", { name: "Start live voice" });
      expect(start).toBeDisabled();
      expect(start).toHaveAccessibleDescription(/this browser does not provide/);
    });
  });
});
