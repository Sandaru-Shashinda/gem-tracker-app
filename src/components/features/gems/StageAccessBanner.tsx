import { Lock, CheckCircle2 } from "lucide-react"

/**
 * Why the analysis form is locked. These are three different situations and only the
 * first has anything to read below it, so they cannot share one sentence.
 */
export type StageAccessReason =
  /** This tester's own stage, handed on. Their record is on screen, read-only. */
  | "submitted"
  /** The gem is at a testing stage, assigned to someone else. */
  | "assigned-elsewhere"
  /** The gem is not at any stage this user is assigned to. */
  | "not-your-stage"

const COPY: Record<StageAccessReason, { title: string; body: string }> = {
  submitted: {
    title: "Submitted — read only",
    body:
      "This is the analysis you submitted, kept as a record of what you found. It can no " +
      "longer be changed here. If something needs correcting, ask an admin to request a " +
      "correction — that sends the gem back to you and reopens the form.",
  },
  "assigned-elsewhere": {
    title: "Assigned to another tester",
    body:
      "Another tester holds this gem at its current stage. Their findings stay with them " +
      "until the gem reaches approval, so there is nothing here for you to read or change.",
  },
  "not-your-stage": {
    title: "Not at your stage",
    body:
      "This gem is not at a stage you are assigned to, so there is nothing here for you " +
      "to fill in.",
  },
}

/**
 * Shown above a locked analysis form. A tester who has submitted is reading their own
 * work and the form below is filled in; in the other two cases it is empty, and saying
 * which of the three this is beats leaving them to work it out from a blank page.
 */
export function StageAccessBanner({ reason }: { reason: StageAccessReason }) {
  const { title, body } = COPY[reason]
  const submitted = reason === "submitted"
  const Icon = submitted ? CheckCircle2 : Lock

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-lg border p-4 ${
        submitted ? "border-blue-200 bg-blue-50" : "border-slate-300 bg-slate-50"
      }`}
    >
      <Icon
        size={16}
        className={`mt-0.5 shrink-0 ${submitted ? "text-blue-600" : "text-slate-500"}`}
      />
      <div>
        <p className={`text-sm font-bold ${submitted ? "text-blue-900" : "text-slate-800"}`}>
          {title}
        </p>
        <p className={`mt-1 text-sm ${submitted ? "text-blue-800" : "text-slate-600"}`}>{body}</p>
      </div>
    </div>
  )
}
