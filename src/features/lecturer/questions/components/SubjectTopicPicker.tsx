import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/shared/ui/primitives/input";
import { cn } from "@/shared/ui/cn";
import {
  filterSubjects,
  filterTopics,
  groupTopicsBySubject,
  subjectLabel,
  type PickerSubject,
  type PickerTopic,
} from "@/features/lecturer/questions/subjectTopicSearch";

/** Subjects get a search box once the list is long enough to need one; topics only when many. */
const TOPIC_SEARCH_FROM = 8;
const rowBase =
  "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const rowIdle = "border-transparent hover:bg-accent";
const rowSelected = "border-primary bg-primary/10 font-semibold";

function Row({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <li>
      <button type="button" aria-pressed={selected} className={cn(rowBase, selected ? rowSelected : rowIdle)} onClick={onClick}>
        <span className="min-w-0 flex-1 wrap-anywhere">{children}</span>
        {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
      </button>
    </li>
  );
}

function SearchBox({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <Input type="search" autoComplete="off" aria-label={label} placeholder={label} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TopicPane({ topics, topicId, onTopicChange }: { topics: PickerTopic[]; topicId: string; onTopicChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterTopics(topics, query), [topics, query]);
  return (
    <>
      {topics.length >= TOPIC_SEARCH_FROM ? <SearchBox label="Search topics" value={query} onChange={setQuery} /> : null}
      <p role="status" className="text-sm text-muted-foreground">
        {query.trim() ? `${shown.length} of ${topics.length} topics` : `${topics.length} topic${topics.length === 1 ? "" : "s"}`}
      </p>
      <ul aria-label="Topics" className="examiner-scroll max-h-72 space-y-1 overflow-y-auto">
        <Row selected={topicId === "all"} onClick={() => onTopicChange("all")}>All topics</Row>
        {shown.map((topic) => (
          <Row key={topic.topicId} selected={topicId === topic.topicId} onClick={() => onTopicChange(topic.topicId)}>{topic.topicName}</Row>
        ))}
      </ul>
      {query.trim() && !shown.length ? <p className="text-sm text-muted-foreground">No topic matches “{query.trim()}”.</p> : null}
    </>
  );
}

type SubjectTopicPickerProps = {
  subjects: PickerSubject[];
  topics: PickerTopic[];
  /** The chosen subject id, or "all". */
  subjectId: string;
  /** The chosen topic id, or "all". */
  topicId: string;
  onSubjectChange: (id: string) => void;
  onTopicChange: (id: string) => void;
  loading?: boolean;
};

/**
 * Two panes instead of one long grid: subjects on the left with their own search, and the topics of the
 * chosen subject on the right. Each list scrolls on its own, so a long catalogue never pushes the page down.
 */
export function SubjectTopicPicker({ subjects, topics, subjectId, topicId, onSubjectChange, onTopicChange, loading = false }: SubjectTopicPickerProps) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterSubjects(subjects, query), [subjects, query]);
  const topicsBySubject = useMemo(() => groupTopicsBySubject(topics), [topics]);
  const subject = subjects.find((item) => item.subjectId === subjectId);
  const subjectTopics = subject ? (topicsBySubject.get(subject.subjectId) ?? []) : [];
  const topic = subjectTopics.find((item) => item.topicId === topicId);

  return (
    <fieldset className="rounded-xl border border-border p-4">
      <legend className="px-1 font-semibold">Subject → Topic</legend>
      <div className="flex flex-wrap items-center gap-2">
        {subject ? (
          <>
            <p className="min-w-0 flex-1 text-sm wrap-anywhere">
              <span className="text-muted-foreground">Filtering by </span>
              <strong>{subjectLabel(subject)}</strong>
              {topic ? <> <span aria-hidden>→</span><span className="sr-only">, topic</span> <strong>{topic.topicName}</strong></> : null}
            </p>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-semibold outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => onSubjectChange("all")}
            >
              <X className="size-4" aria-hidden />
              Clear subject and topic
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Showing questions from all subjects and topics.</p>
        )}
      </div>
      {loading ? (
        <div role="status" className="mt-4 space-y-2">
          <span className="sr-only">Loading subjects and topics…</span>
          {[0, 1, 2, 3].map((item) => <div key={item} aria-hidden className="h-11 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <section aria-label="Subjects" className="min-w-0 space-y-2">
            <SearchBox label="Search subjects by code or name" value={query} onChange={setQuery} />
            <p role="status" className="text-sm text-muted-foreground">
              {query.trim() ? `${shown.length} of ${subjects.length} subjects` : `${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
            </p>
            <ul aria-label="Subjects" className="examiner-scroll max-h-72 space-y-1 overflow-y-auto">
              <Row selected={subjectId === "all"} onClick={() => onSubjectChange("all")}>All subjects</Row>
              {shown.map((item) => (
                <Row key={item.subjectId} selected={subjectId === item.subjectId} onClick={() => onSubjectChange(item.subjectId)}>
                  {subjectLabel(item)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {topicsBySubject.get(item.subjectId)?.length ?? 0} topic{(topicsBySubject.get(item.subjectId)?.length ?? 0) === 1 ? "" : "s"}
                  </span>
                </Row>
              ))}
            </ul>
            {query.trim() && !shown.length ? <p className="text-sm text-muted-foreground">No subject matches “{query.trim()}”.</p> : null}
          </section>
          <section aria-label="Topics of the chosen subject" className="min-w-0 space-y-2">
            {subject ? (
              subjectTopics.length ? (
                <TopicPane key={subject.subjectId} topics={subjectTopics} topicId={topicId} onTopicChange={onTopicChange} />
              ) : (
                <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">This subject has no topics.</p>
              )
            ) : (
              <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Choose a subject to filter by one of its topics.</p>
            )}
          </section>
        </div>
      )}
    </fieldset>
  );
}
