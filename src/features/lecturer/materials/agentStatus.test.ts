import { getAgentStatus } from "./agentStatus";

const now = Date.parse("2026-11-25T10:00:00Z");
const agent = {
  agentId: "agent-1",
  deviceName: "Lecturer laptop",
  lastSeenAt: "2026-11-25T09:59:30Z",
  expiresAt: "2026-11-25T12:00:00Z",
  revokedAt: null,
};

it("separates a registered machine from a recently active agent", () => {
  expect(getAgentStatus([agent], now).online).toBe(true);
  expect(getAgentStatus([{ ...agent, lastSeenAt: "2026-11-25T09:30:00Z" }], now)).toEqual({
    registered: [{ ...agent, lastSeenAt: "2026-11-25T09:30:00Z" }],
    online: false,
  });
  expect(getAgentStatus([{ ...agent, revokedAt: "2026-11-25T09:55:00Z" }], now).registered).toHaveLength(0);
});
