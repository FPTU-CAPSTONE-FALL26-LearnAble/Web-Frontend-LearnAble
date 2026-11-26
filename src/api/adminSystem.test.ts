import { getSystemHealth, isBasicHealth } from "@/api/adminSystem";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function answer(byPath: Record<string, () => Response | Promise<Response>>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = new URL(String(input), "http://app.test").pathname;
    const reply = byPath[path];
    if (!reply) throw new Error(`Unexpected request: ${path}`);
    return reply();
  });
}

describe("getSystemHealth (basic probes until FFCB-151 ships)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads /health and /health/ready at the backend root, not under /api/v1", async () => {
    const fetchSpy = answer({
      "/health": () => json({ status: "healthy", timestamp: "2026-11-25T13:02:42Z" }),
      "/health/ready": () => json({ status: "healthy", timestamp: "2026-11-25T13:02:43Z" }),
    });
    const health = await getSystemHealth();
    const paths = fetchSpy.mock.calls.map(([input]) => new URL(String(input), "http://app.test").pathname);
    expect(paths.sort()).toEqual(["/health", "/health/ready"]);
    expect(health.status).toBe("Healthy");
    expect(health.checkedAt).toBe("2026-11-25T13:02:42Z");
    expect(health.services.map((service) => [service.name, service.status])).toEqual([
      ["API", "Healthy"],
      ["API readiness", "Healthy"],
    ]);
    // Nothing the probes do not report is invented.
    expect(health.performance.averageResponseMs).toBeNull();
    expect(health.usage.activeUsers).toBeNull();
    expect(isBasicHealth(health)).toBe(true);
  });

  it("is Degraded when the API answers but is not ready, and says why", async () => {
    answer({
      "/health": () => json({ status: "healthy", timestamp: "2026-11-25T13:00:00Z" }),
      "/health/ready": () => json({ status: "unhealthy" }, 503),
    });
    const health = await getSystemHealth();
    expect(health.status).toBe("Degraded");
    expect(health.services[1]).toMatchObject({ status: "Down", message: "Answered HTTP 503." });
  });

  it("is Down when the API cannot be reached", async () => {
    answer({
      "/health": () => Promise.reject(new TypeError("Failed to fetch")),
      "/health/ready": () => Promise.reject(new TypeError("Failed to fetch")),
    });
    const health = await getSystemHealth();
    expect(health.status).toBe("Down");
    expect(health.services[0]).toMatchObject({ status: "Down", latencyMs: null, message: "Could not be reached." });
  });
});
