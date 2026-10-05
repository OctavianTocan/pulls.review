import type { AiActivityKind, AiActivityStatus, AiUsage } from '@pulls.review/core/local-rpc'

/** A change to one work-log entry; fields left out keep their value. */
export interface ActivityPatch {
  id: string
  kind?: AiActivityKind
  title?: string
  /** The title the entry takes once it leaves `running`, unless the patch that ends it brings one. */
  doneTitle?: string
  text?: string
  tool?: string
  status?: AiActivityStatus
}

/** Where a parser reports the work log. */
export interface RunSink {
  put: (patch: ActivityPatch) => void
}

/** What a CLI run produced, as far as its output stream says. */
export interface RunOutcome {
  text?: string
  error?: string
  usage?: AiUsage
}

/** Turns a CLI's JSON-lines output into work-log entries and an outcome. */
export interface StreamParser {
  feed: (line: string) => void
  outcome: () => RunOutcome
}

/** An MCP server the CLI should start for the run. */
export interface McpServerSpec {
  name: string
  command: string
  args: string[]
  /** The tool names it serves, unprefixed. */
  tools: string[]
}
