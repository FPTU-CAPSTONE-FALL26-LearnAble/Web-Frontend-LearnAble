import { Link, useParams } from "react-router";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";

export function CandidateMonitoringRoute() {
  const { roomId, candidateId } = useParams();
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">Candidate monitoring</h1><p className="mt-2 text-muted-foreground">Candidate {candidateId ?? "not selected"} · Room {roomId ?? "not selected"}</p></header><Card className="shadow-none"><CardHeader><CardTitle>Live candidate details are not available yet</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Return to room monitoring to review the active exam schedule.</p><Button className="mt-5" variant="outline" asChild><Link to={roomId ? `/examiner/monitoring/${roomId}` : "/examiner/monitoring"}>Back to room monitoring</Link></Button></CardContent></Card></div>;
}
