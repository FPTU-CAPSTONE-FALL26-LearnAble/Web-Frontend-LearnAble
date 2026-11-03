import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Headphones,
  Keyboard,
  LayoutDashboard,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { BrandIdentity } from "@/components/BrandIdentity";
import { SkipLink } from "@/shared/a11y/SkipLink";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/shared/ui/primitives/card";
import { Separator } from "@/shared/ui/primitives/separator";

const evidence = [
  {
    value: "30",
    label: "visually impaired college students across Viet Nam joined an in-depth higher-education study",
    source: "University of Illinois, 2022",
    href: "https://www.ideals.illinois.edu/items/123369",
  },
  {
    value: "8",
    label: "universities in Ho Chi Minh City were represented in a study of accessible e-learning experiences",
    source: "Dalat University Journal, 2023",
    href: "https://tckh.dlu.edu.vn/index.php/tckhdhdl/article/view/1089",
  },
  {
    value: "5 / 67",
    label: "training workshops and participating university/resource-centre staff in a visual-impairment higher-education project",
    source: "ICEVI Higher Education Report",
    href: "https://icevi.org/wp-content/uploads/2023/09/Higher-Education-Project-Report-2022_3.pdf",
  },
];

const capabilities = [
  {
    icon: BookOpenCheck,
    label: "Accessible learning",
    title: "Materials that meet learners where they are",
    body: "Organize course resources in one place and support formats that can be navigated with assistive technology.",
  },
  {
    icon: Headphones,
    label: "Question authoring",
    title: "Prepare once, deliver in more than one way",
    body: "Lecturers build question banks for practice and exams, with workflows prepared for text-to-audio support.",
  },
  {
    icon: ClipboardCheck,
    label: "Inclusive assessment",
    title: "A clearer path from exam setup to exam day",
    body: "Examiner tools connect paper preparation, scheduling, rooms, candidates and live operational monitoring.",
  },
  {
    icon: LayoutDashboard,
    label: "Shared operations",
    title: "One system for students and university teams",
    body: "Students, lecturers, examiners and administrators work from role-focused interfaces built on the same information flow.",
  },
];

const principles = [
  { icon: Keyboard, text: "Keyboard-first interaction and visible focus" },
  { icon: Headphones, text: "Content designed for screen-reader and audio use" },
  { icon: ShieldCheck, text: "Consistent exam rules and operational clarity" },
  { icon: Users, text: "Support inside the shared university environment" },
];

export function LandingRoute() {
  return (
    <>
      <SkipLink />
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
            <Link to="/" aria-label="LearnAble home" className="shrink-0">
              <BrandIdentity />
            </Link>
            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex"
            >
              <a className="hover:text-foreground" href="#problem">The problem</a>
              <a className="hover:text-foreground" href="#solution">Our solution</a>
              <a className="hover:text-foreground" href="#approach">How it works</a>
              <a className="hover:text-foreground" href="#contact">Contact</a>
            </nav>
            <Button asChild size="lg">
              <Link to="/login">Sign in <ArrowRight aria-hidden /></Link>
            </Button>
          </div>
        </header>

        <main id="main">
          <section className="overflow-hidden border-b border-border">
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <Badge variant="outline">
                  <Sparkles aria-hidden /> Higher education for visually impaired students
                  </Badge>
                </div>
                <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                  One university experience. <span className="text-primary">Built to include every learner.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                  LearnAble connects accessible learning, question preparation and exam operations so students with visual impairments can participate in the same academic environment as their peers.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/login">Enter LearnAble <ArrowRight aria-hidden /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href="#solution">Explore the solution</a>
                  </Button>
                </div>
                <div className="mt-10 grid gap-3 text-sm font-medium sm:grid-cols-2">
                  {principles.slice(0, 2).map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-xl">
                <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-primary/10" />
                <img
                  src="/assets/landing/inclusive-learning.png"
                  alt="A visually impaired university learner using LearnAble with headphones, a laptop and Braille materials"
                  className="aspect-[4/5] w-full rounded-2xl border border-border object-cover object-center shadow-xl"
                />
                <div className="absolute -bottom-5 left-5 right-5 rounded-xl border border-border bg-card p-4 shadow-lg sm:left-auto sm:right-6 sm:w-72">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Headphones aria-hidden className="size-5" />
                    </span>
                    <div>
                      <p className="font-bold">Accessible by design</p>
                      <p className="text-sm text-muted-foreground">Not added as an afterthought</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="problem" className="scroll-mt-24 bg-secondary/60 py-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
              <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-primary">The problem</p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Inclusion reaches the classroom. Digital barriers can still follow.
                  </h2>
                  <p className="mt-5 text-base leading-7 text-muted-foreground">
                    Research with visually impaired university students in Viet Nam shows that access is shaped by the complete academic experience: digital materials, classroom participation, assessment and institutional support. A university platform must therefore work with screen readers, audio and keyboard navigation from the start.
                  </p>
                  <a
                    href="https://www.ideals.illinois.edu/items/123369"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"
                  >
                    Read the Viet Nam higher-education case study <ExternalLink aria-hidden className="size-4" />
                  </a>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {evidence.map((item) => (
                    <Card key={item.value} className="justify-between">
                      <CardHeader>
                        <p className="text-3xl font-extrabold text-primary">{item.value}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="leading-6">{item.label}</p>
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          {item.source} <ExternalLink aria-hidden className="size-3.5" />
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <p className="mt-6 max-w-4xl text-xs leading-5 text-muted-foreground">
                These figures describe the scope of published higher-education studies and capacity-building work—not LearnAble outcomes or national prevalence. Viet Nam does not yet publish a complete national count of visually impaired university students, so the page avoids presenting an unsupported population estimate.
              </p>
            </div>
          </section>

          <section id="solution" className="scroll-mt-24 py-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-wider text-primary">The LearnAble solution</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Accessibility across the academic journey—not in a separate system.
                </h2>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  LearnAble gives each role the tools they need while keeping preparation, delivery and support connected.
                </p>
              </div>
              <div className="mt-12 grid gap-x-10 gap-y-12 lg:grid-cols-2">
                {capabilities.map(({ icon: Icon, label, title, body }, index) => (
                  <article key={title} className="grid grid-cols-[auto_1fr] gap-5 border-t border-border pt-6">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Icon aria-hidden className="size-6" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">0{index + 1} · {label}</p>
                      <h3 className="mt-2 text-xl font-bold">{title}</h3>
                      <p className="mt-3 leading-7 text-muted-foreground">{body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="approach" className="scroll-mt-24 border-y border-border bg-slate-950 py-20 text-white">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
              <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-primary">How it works</p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    One connected path from preparation to participation.
                  </h2>
                  <p className="mt-5 leading-7 text-slate-300">
                    The platform supports the same institutional process while presenting each user with a focused, accessible workspace.
                  </p>
                </div>
                <ol className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Prepare", "Lecturers author questions and organize accessible learning materials."],
                    ["Plan", "Examiners prepare papers, schedules, rooms and candidate assignments."],
                    ["Participate", "Students learn, practise and take part in supported assessments."],
                    ["Operate", "University teams monitor readiness and manage the academic environment."],
                  ].map(([title, body], index) => (
                    <li key={title} className="rounded-xl border border-white/15 bg-white/5 p-5">
                      <span className="text-sm font-extrabold text-primary">0{index + 1}</span>
                      <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section className="py-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
              <div className="grid gap-10 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-primary">Design principles</p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Access is a system quality.</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {principles.map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-start gap-3 rounded-xl border border-border p-4">
                      <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                      <span className="font-semibold leading-6">{text}</span>
                      <Icon aria-hidden className="ml-auto size-5 shrink-0 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="contact" className="scroll-mt-24 border-t border-border bg-secondary/60 py-20">
            <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
              <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Mail aria-hidden className="size-6" />
              </span>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">Build a more accessible university experience with us.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                For university pilots, accessibility review or technical collaboration, contact the LearnAble project team through your project representative.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg"><Link to="/login">Sign in to LearnAble</Link></Button>
                <Button asChild size="lg" variant="outline"><a href="#solution">Review the platform</a></Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between">
            <BrandIdentity />
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
              <a className="hover:text-foreground hover:underline" href="https://www.ideals.illinois.edu/items/123369" target="_blank" rel="noreferrer">Viet Nam visual-impairment study</a>
              <a className="hover:text-foreground hover:underline" href="https://doi.org/10.26459/hueunijed.v133i5A.7300" target="_blank" rel="noreferrer">Text-to-speech in smart universities</a>
            </div>
          </div>
          <Separator className="mx-auto mt-6 max-w-7xl" />
          <p className="mx-auto mt-5 max-w-7xl px-5 text-xs text-muted-foreground sm:px-8">LearnAble · Accessible learning for inclusive higher education.</p>
        </footer>
      </div>
    </>
  );
}
