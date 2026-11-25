import type { getMaterialTtsAgents } from "@/api/materialTts";

type MaterialTtsAgent = Awaited<ReturnType<typeof getMaterialTtsAgents>>[number];

const HEARTBEAT_WINDOW_MS = 2 * 60 * 1000;

export function getAgentStatus(agents: MaterialTtsAgent[], now = Date.now()) {
  const registered = agents.filter(
    (agent) => !agent.revokedAt && Date.parse(agent.expiresAt) > now,
  );
  const online = registered.some((agent) => {
    const lastSeen = Date.parse(agent.lastSeenAt);
    return Number.isFinite(lastSeen) && lastSeen <= now && now - lastSeen < HEARTBEAT_WINDOW_MS;
  });
  return { registered, online };
}
