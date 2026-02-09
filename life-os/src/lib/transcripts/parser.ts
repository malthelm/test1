export const REQUIRED_SECTIONS = [
  "SUMMARY",
  "TIMELINE",
  "TODOS",
  "DECISIONS",
  "MONEY",
  "IDEAS",
  "QUESTIONS",
] as const;

type SectionName = (typeof REQUIRED_SECTIONS)[number];

export type ParseIssue = {
  line: number;
  section: SectionName | "GLOBAL";
  code: string;
  message: string;
  suggestion?: string;
  critical?: boolean;
};

export type ParsedTodoLine = {
  raw: string;
  fields: {
    title: string;
    horizon: string;
    energy: string;
    context: string;
    moneyCost: string;
    domain: string;
    responsible: string;
    dueDate: string;
    notes: string;
  };
};

export type ParserConfidenceReport = {
  score: number;
  globalCritical: boolean;
};

export type ParsedDraftSections = {
  sections: Record<SectionName, string[]>;
  todos: ParsedTodoLine[];
  issues: ParseIssue[];
  confidence: ParserConfidenceReport;
};

function normalizeEnum(value: string, fallback: string) {
  const v = value.trim().toLowerCase();
  return v.length ? v : fallback;
}

export function parseDraft(input: string): ParsedDraftSections {
  const lines = input.split(/\r?\n/);
  const sections: Record<SectionName, string[]> = {
    SUMMARY: [],
    TIMELINE: [],
    TODOS: [],
    DECISIONS: [],
    MONEY: [],
    IDEAS: [],
    QUESTIONS: [],
  };

  const issues: ParseIssue[] = [];
  let current: SectionName | null = null;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const header = /^\[([A-Z]+)\]$/.exec(trimmed);
    if (header) {
      const key = header[1] as SectionName;
      if (REQUIRED_SECTIONS.includes(key)) {
        current = key;
      } else {
        issues.push({
          line: i + 1,
          section: "GLOBAL",
          code: "UNKNOWN_SECTION",
          message: `Unknown section [${header[1]}]`,
        });
      }
      return;
    }

    if (current) {
      sections[current].push(line);
    }
  });

  for (const section of REQUIRED_SECTIONS) {
    if (sections[section].join("\n").trim().length === 0) {
      issues.push({
        line: 0,
        section,
        code: "MISSING_REQUIRED_SECTION",
        message: `Missing required section [${section}]`,
        suggestion: `Add [${section}] with content.`,
        critical: true,
      });
    }
  }

  const todos: ParsedTodoLine[] = [];
  sections.TODOS.forEach((line, index) => {
    if (!line.trim()) return;

    const parts = line.split("|").map((x) => x.trim());
    if (parts.length !== 9) {
      issues.push({
        line: index + 1,
        section: "TODOS",
        code: "TODO_FIELD_COUNT",
        message: `Expected 9 fields (8 pipes), got ${parts.length}`,
        suggestion:
          "Use: title|horizon|energy|context|money_cost|domain|responsible|due_date|notes",
      });
      return;
    }

    todos.push({
      raw: line,
      fields: {
        title: parts[0],
        horizon: normalizeEnum(parts[1], "later"),
        energy: normalizeEnum(parts[2], "low"),
        context: normalizeEnum(parts[3], "online"),
        moneyCost: normalizeEnum(parts[4], "none"),
        domain: parts[5],
        responsible: parts[6],
        dueDate: parts[7],
        notes: parts[8],
      },
    });
  });

  const criticalCount = issues.filter((i) => i.critical).length;
  const nonCriticalCount = issues.length - criticalCount;
  const score = Math.max(0, 100 - criticalCount * 25 - nonCriticalCount * 5);

  return {
    sections,
    todos,
    issues,
    confidence: {
      score,
      globalCritical: criticalCount > 0,
    },
  };
}
