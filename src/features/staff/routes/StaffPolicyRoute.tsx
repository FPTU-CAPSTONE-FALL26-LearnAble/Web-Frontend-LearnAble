import { useState } from "react";
import { Clock3, Save, ShieldCheck } from "lucide-react";
import { ChoiceField, TextField } from "@/components/workbench/Fields";
import { PageHeading } from "@/components/workbench/Workbench";
import { useRouteAnnouncer } from "@/shared/a11y/useRouteAnnouncer";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";

/**
 * Jira FFCB-17/256 requires this Staff surface. The two deployed OpenAPI
 * documents do not expose university-default-policy reads or writes yet, so
 * the form stays honest and cannot claim a saved value.
 */
export function StaffPolicyRoute() {
  useRouteAnnouncer("Default Exam Policy · LearnAble", "Default Exam Policy");
  const [duration, setDuration] = useState("90");
  const [proctoring, setProctoring] = useState("standard");
  const [camera, setCamera] = useState("required");

  return (
    <div className="space-y-6">
      <PageHeading
        title="Default Exam Policy"
        description="Prepare the university defaults applied when an examiner starts a new exam configuration."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden className="size-5 text-primary" />
              <CardTitle>Assessment defaults</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TextField
              label="Default duration (minutes)"
              type="number"
              min="1"
              value={duration}
              onChange={setDuration}
            />
              <ChoiceField
              label="Default proctoring mode"
              value={proctoring}
              options={[
                { value: "standard", label: "Standard invigilation" },
                { value: "camera", label: "Camera-assisted invigilation" },
              ]}
              onChange={setProctoring}
            />
              <ChoiceField
              label="Camera availability policy"
              value={camera}
              options={[
                { value: "required", label: "Camera required" },
                { value: "flag", label: "Allow and flag unavailable camera" },
              ]}
                onChange={setCamera}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-5 text-primary" />
              <CardTitle>Integration status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
              The Staff policy workspace is ready, but the current university
              policy service does not yet provide read or save operations.
              Values above remain a draft and are not presented as server data.
              </p>
              <Button disabled aria-describedby="policy-api-status">
                <Save aria-hidden /> Save defaults
              </Button>
              <p id="policy-api-status" className="text-xs text-muted-foreground">
                Saving this policy will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
