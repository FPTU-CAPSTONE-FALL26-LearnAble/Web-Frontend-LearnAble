import { useState } from "react";
import { Link } from "react-router";
import {
  Button,
  Input,
  Textarea,
  Label,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
  Progress,
  Separator,
  Alert,
  AlertTitle,
  AlertDescription,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  toast,
} from "@/shared/ui/primitives";
import {
  InfoIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  SparklesIcon,
  DownloadIcon,
  Trash2Icon,
  ExternalLinkIcon,
  SlidersHorizontalIcon,
  Undo2Icon,
} from "lucide-react";

export function ComponentDemoRoute() {
  const [progressValue, setProgressValue] = useState(65);
  const [radioValue, setRadioValue] = useState("option-1");
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [selectValue, setSelectValue] = useState("swp391");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Main Header */}
      <header className="border-b border-border bg-card py-4 px-6 sm:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-medium tracking-tight">
                  LearnAble Component Showcase
                </h1>
                <Badge variant="secondary">Canonical Primitives</Badge>
              </div>
              <p className="text-base text-muted-foreground">
                Living showcase of all shadcn/ui-based primitives and accessible
                workbench controls.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="default">
                <Link to="/demo/exam">Exam Client Demo (/demo/exam)</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/demo/result">Result Demo (/demo/result)</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Top
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-6 py-10 sm:px-12 space-y-12">
        {/* Section 1: Buttons */}
        <section aria-labelledby="buttons-heading" className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 id="buttons-heading" className="text-2xl font-medium">
              1. Buttons & Actions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Minimum 44px touch targets, visible focus rings (3px with 2px
              offset), and semantic color tokens.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Button Variants</CardTitle>
                <CardDescription>
                  Decisive actions, secondary surfaces, outlines, and
                  destructive operations.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button variant="default">
                  <SparklesIcon className="mr-1.5 size-4" />
                  Primary Action
                </Button>
                <Button variant="outline">
                  <SlidersHorizontalIcon className="mr-1.5 size-4" />
                  Outline Control
                </Button>
                <Button variant="secondary">Secondary Surface</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive">
                  <Trash2Icon className="mr-1.5 size-4" />
                  Destructive
                </Button>
                <Button variant="link">
                  Link Button
                  <ExternalLinkIcon className="ml-1.5 size-3.5" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Button Sizes & States</CardTitle>
                <CardDescription>
                  Standard sizes and interactive disabled/loading states.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small (sm)</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large (lg)</Button>
                <Button size="xl">Extra large (xl)</Button>
                <Button size="xl">
                  <span
                    data-icon="inline-start"
                    className="material-symbols-outlined text-[20px] leading-none"
                  >
                    play_arrow
                  </span>
                  Start assessment
                </Button>
                <Button size="xl" variant="outline">
                  Continue
                  <span
                    data-icon="inline-end"
                    className="material-symbols-outlined text-[24px] leading-none"
                  >
                    arrow_forward
                  </span>
                </Button>
                <Button size="icon" aria-label="Download attachment">
                  <DownloadIcon className="size-4" />
                </Button>
                <Button
                  size="icon-xl"
                  aria-label="Download attachment (extra large)"
                >
                  <DownloadIcon />
                </Button>
                <Button size="icon" variant="outline" aria-label="View details">
                  <span className="material-symbols-outlined text-[20px] leading-none font-[500]">
                    visibility
                  </span>
                </Button>
                <Button size="icon" variant="secondary" aria-label="Edit item">
                  <span className="material-symbols-outlined text-[20px] leading-none">
                    edit
                  </span>
                </Button>
                <Button size="icon" variant="ghost" aria-label="Add item">
                  <span className="material-symbols-outlined text-[20px] leading-none">
                    add
                  </span>
                </Button>
                <Button size="icon" variant="ghost" aria-label="Favorite item">
                  <span
                    className="material-symbols-outlined text-[20px] leading-none"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    favorite
                  </span>
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  aria-label="Delete item"
                >
                  <span className="material-symbols-outlined text-[20px] leading-none">
                    delete
                  </span>
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="More actions"
                  disabled
                >
                  <span className="material-symbols-outlined text-[20px] leading-none">
                    more_vert
                  </span>
                </Button>
                <Button disabled>Disabled Action</Button>
                <Button variant="outline" disabled>
                  Disabled Outline
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: Form Controls */}
        <section aria-labelledby="forms-heading" className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 id="forms-heading" className="text-2xl font-medium">
              2. Form Controls & Inputs
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Accessible inputs, textareas, checkboxes, radio groups, and
              strictly composed select menus.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Text Inputs & Textarea</CardTitle>
                <CardDescription>
                  Standard field labeling with placeholder and validation
                  styling.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-subject-name">Subject Name</Label>
                  <Input
                    id="demo-subject-name"
                    placeholder="e.g. Software Architecture & Design"
                    defaultValue="Software Architecture & Design"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-course-code">
                    Course Code (Invalid state example)
                  </Label>
                  <Input
                    id="demo-course-code"
                    placeholder="e.g. SWP391"
                    aria-invalid="true"
                    defaultValue="INVALID_CODE"
                  />
                  <p className="text-xs text-destructive">
                    Course code must adhere to standard format (3 uppercase
                    letters followed by 3 digits).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-question-prompt">
                    Question Description
                  </Label>
                  <Textarea
                    id="demo-question-prompt"
                    placeholder="Enter detailed question instructions..."
                    rows={3}
                    defaultValue="Explain the primary architectural benefits of Microservices over Monolithic architecture in terms of horizontal scalability."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select, Checkboxes & Radio Group</CardTitle>
                <CardDescription>
                  Hierarchical select composition and accessible choice
                  controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Select Component Hierarchy */}
                <div className="space-y-2">
                  <Label id="select-subject-label">Curriculum Subject</Label>
                  <Select value={selectValue} onValueChange={setSelectValue}>
                    <SelectTrigger
                      aria-labelledby="select-subject-label"
                      className="w-full"
                    >
                      <SelectValue placeholder="Select a subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Software Engineering</SelectLabel>
                        <SelectItem value="swp391">
                          SWP391 - Application Development Project
                        </SelectItem>
                        <SelectItem value="swe201">
                          SWE201 - Software Engineering Foundations
                        </SelectItem>
                        <SelectItem value="swa301">
                          SWA301 - Software Architecture
                        </SelectItem>
                      </SelectGroup>
                      <SelectSeparator />
                      <SelectGroup>
                        <SelectLabel>Computer Science</SelectLabel>
                        <SelectItem value="csd201">
                          CSD201 - Data Structures & Algorithms
                        </SelectItem>
                        <SelectItem value="dbi202">
                          DBI202 - Database Systems
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Checkbox */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="demo-checkbox-publish"
                      checked={checkboxChecked}
                      onCheckedChange={(checked) =>
                        setCheckboxChecked(checked === true)
                      }
                    />
                    <Label
                      htmlFor="demo-checkbox-publish"
                      className="cursor-pointer"
                    >
                      Allow student practice reviews immediately after
                      submission
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 opacity-60">
                    <Checkbox id="demo-checkbox-disabled" disabled />
                    <Label htmlFor="demo-checkbox-disabled">
                      Locked examination mode (Disabled)
                    </Label>
                  </div>
                </div>

                {/* Radio Group */}
                <div className="space-y-2">
                  <Label>Assessment Purpose</Label>
                  <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="option-1" id="radio-exam" />
                      <Label htmlFor="radio-exam" className="cursor-pointer">
                        Formal Exam Question (Strict security)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="option-2" id="radio-practice" />
                      <Label
                        htmlFor="radio-practice"
                        className="cursor-pointer"
                      >
                        Practice Question (Self-paced study)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 3: Data Display & Feedback */}
        <section aria-labelledby="data-display-heading" className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 id="data-display-heading" className="text-2xl font-medium">
              3. Data Display & Status Badges
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Semantic status badges, progress meters, avatar groupings, and
              structured summary cards.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Status Badges</CardTitle>
                <CardDescription>
                  Sourced semantic tones with non-color textual cues.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2.5">
                <Badge variant="default">Default Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="ghost">Ghost</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress Indicator</CardTitle>
                <CardDescription>
                  Accessible progress meter with dynamic controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Exam Completion</span>
                  <span>{progressValue}%</span>
                </div>
                <Progress
                  value={progressValue}
                  aria-label="Exam completion progress"
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setProgressValue((prev) => Math.max(0, prev - 15))
                    }
                  >
                    -15%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setProgressValue((prev) => Math.min(100, prev + 15))
                    }
                  >
                    +15%
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avatars & Groups</CardTitle>
                <CardDescription>
                  User avatars with fallback initials and group clustering.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar size="lg">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="@shadcn"
                    />
                    <AvatarFallback>CN</AvatarFallback>
                    <AvatarBadge />
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>LA</AvatarFallback>
                  </Avatar>
                  <Avatar size="sm">
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Candidate Group:
                  </span>
                  <AvatarGroup>
                    <Avatar size="sm">
                      <AvatarFallback>NV</AvatarFallback>
                    </Avatar>
                    <Avatar size="sm">
                      <AvatarFallback>TA</AvatarFallback>
                    </Avatar>
                    <Avatar size="sm">
                      <AvatarFallback>HL</AvatarFallback>
                    </Avatar>
                    <AvatarGroupCount>+8</AvatarGroupCount>
                  </AvatarGroup>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 4: Alerts & Toasts */}
        <section aria-labelledby="alerts-heading" className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 id="alerts-heading" className="text-2xl font-medium">
              4. Alerts & Notifications
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Inline alerts and interactive toast notifications with clear
              status signals.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Alert>
                <InfoIcon className="size-4 text-primary" />
                <AlertTitle>Operational Notice</AlertTitle>
                <AlertDescription>
                  The examination schedule for Fall 2026 has been published.
                  Room assignments are locked 24 hours prior to shift
                  commencement.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangleIcon className="size-4" />
                <AlertTitle>Critical Security Warning</AlertTitle>
                <AlertDescription>
                  Session draft integrity error detected. Please verify your
                  internet connection before submitting final answers.
                </AlertDescription>
              </Alert>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Interactive Toast Triggers</CardTitle>
                <CardDescription>
                  Trigger accessible Sonner toast alerts with varying semantic
                  severity.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.success("Question draft successfully saved", {
                      description:
                        "Local draft timestamp: " +
                        new Date().toLocaleTimeString(),
                    })
                  }
                >
                  <CheckCircle2Icon className="mr-1.5 size-4 text-green-600" />
                  Success Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.info("Exam room monitoring active", {
                      description: "42 candidates connected in Room AL-204.",
                    })
                  }
                >
                  <InfoIcon className="mr-1.5 size-4 text-blue-600" />
                  Info Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.warning("Preparation window closing", {
                      description:
                        "10 minutes remaining until code generation.",
                    })
                  }
                >
                  <AlertTriangleIcon className="mr-1.5 size-4 text-yellow-600" />
                  Warning Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.error("Submission failed", {
                      description: "Network timeout: Click retry to resubmit.",
                    })
                  }
                >
                  <XCircleIcon className="mr-1.5 size-4 text-red-600" />
                  Error Toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.success("Question draft deleted", {
                      description:
                        "The draft was removed from this demo session.",
                      action: {
                        label: "Undo",
                        onClick: () =>
                          toast.info("Question draft restored", {
                            description:
                              "The draft is available again in this demo session.",
                          }),
                      },
                    })
                  }
                >
                  <Undo2Icon className="mr-1.5 size-4" />
                  Action Toast
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 5: Overlays & Modals */}
        <section aria-labelledby="modals-heading" className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 id="modals-heading" className="text-2xl font-medium">
              5. Overlays, Dialogs & Sheets
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Focus-trapped modal dialogs, confirmation alerts, and slide-out
              navigation sheets.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Interactive Modals & Drawers</CardTitle>
              <CardDescription>
                Test keyboard trap, ESC dismissal, and focus restoration
                behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              {/* Standard Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Standard Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Subject Configuration</DialogTitle>
                    <DialogDescription>
                      Update metadata and examination parameters for this
                      academic subject.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="dialog-subj-code">Subject Code</Label>
                      <Input id="dialog-subj-code" defaultValue="SWA301" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dialog-subj-title">Subject Title</Label>
                      <Input
                        id="dialog-subj-title"
                        defaultValue="Software Architecture"
                      />
                    </div>
                  </div>
                  <DialogFooter showCloseButton>
                    <Button
                      onClick={() => {
                        toast.success("Subject settings updated");
                      }}
                    >
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Alert Dialog (Confirmation) */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    Open Confirm Alert Dialog
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely certain?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently discard the current unsaved
                      question draft. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => toast.error("Draft deleted")}
                    >
                      Confirm Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Sheet (Slide-out Drawer) */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="secondary">Open Side Sheet</Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Session Navigation & Filters</SheetTitle>
                    <SheetDescription>
                      Quickly switch between active examination rooms and
                      filters.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Quick Filter</Label>
                      <Input placeholder="Search candidates..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Room Status</Label>
                      <div className="rounded-lg border border-border p-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span>Room AL-204</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Room AL-205</span>
                          <Badge variant="secondary">Standby</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <SheetFooter>
                    <Button
                      className="w-full"
                      onClick={() => toast.info("Filters applied")}
                    >
                      Apply Filters
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>
        </section>

        {/* Section 6: Semantic Table */}
        <section aria-labelledby="table-heading" className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 id="table-heading" className="text-2xl font-medium">
              6. Semantic Table
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Keyboard-focusable bounded table with aligned numeric data and
              status cells.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Examination Shift Schedule</CardTitle>
              <CardDescription>
                Example dense table demonstrating tabular alignment and badges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>
                  A list of upcoming invigilation shifts for Fall 2026.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Shift Code</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Candidates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono font-medium">
                      EX-2026-01
                    </TableCell>
                    <TableCell>Software Architecture (SWA301)</TableCell>
                    <TableCell>2026-09-24 08:00</TableCell>
                    <TableCell>AL-204</TableCell>
                    <TableCell className="tabular-nums">42 / 45</TableCell>
                    <TableCell>
                      <Badge variant="default">Open</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">
                      EX-2026-02
                    </TableCell>
                    <TableCell>Database Systems (DBI202)</TableCell>
                    <TableCell>2026-09-24 10:30</TableCell>
                    <TableCell>AL-208</TableCell>
                    <TableCell className="tabular-nums">38 / 40</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Opening soon</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">
                      EX-2026-03
                    </TableCell>
                    <TableCell>Application Development (SWP391)</TableCell>
                    <TableCell>2026-09-25 14:00</TableCell>
                    <TableCell>BE-102</TableCell>
                    <TableCell className="tabular-nums">30 / 30</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Closed</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>Total Active Shifts</TableCell>
                    <TableCell
                      colSpan={3}
                      className="text-right font-medium tabular-nums"
                    >
                      3 Shifts (110 Candidates)
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Showcase Footer */}
      <footer className="border-t border-border bg-card py-6 px-6 sm:px-12 text-center text-sm text-muted-foreground">
        LearnAble Accessible UI System • Powered by Tailwind CSS v4 & Radix
        Primitives
      </footer>
    </div>
  );
}
