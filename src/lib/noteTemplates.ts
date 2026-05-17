export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;          // maps to DelayIcon name
  description: string;
  build: () => { title: string; content: any };
}

const h = (level: 1 | 2 | 3, text: string) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});
const p = (text?: string) => ({
  type: "paragraph",
  ...(text ? { content: [{ type: "text", text }] } : {}),
});
const taskList = (items: string[]) => ({
  type: "taskList",
  content: items.map((t) => ({
    type: "taskItem",
    attrs: { checked: false },
    content: [p(t)],
  })),
});
const bulletList = (items: string[]) => ({
  type: "bulletList",
  content: items.map((t) => ({
    type: "listItem",
    content: [p(t)],
  })),
});

const today = () => {
  const d = new Date();
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    icon: "blank",
    description: "Start fresh.",
    build: () => ({
      title: "",
      content: { type: "doc", content: [p()] },
    }),
  },
  {
    id: "daily",
    name: "Daily Journal",
    icon: "journal",
    description: "A guided reflection for today.",
    build: () => ({
      title: today(),
      content: {
        type: "doc",
        content: [
          h(1, today()),
          h(2, "Intent"),
          p("What am I choosing to focus on today?"),
          h(2, "Three priorities"),
          taskList(["", "", ""]),
          h(2, "Notes"),
          p(),
          h(2, "Gratitude"),
          bulletList([""]),
        ],
      },
    }),
  },
  {
    id: "meeting",
    name: "Meeting Notes",
    icon: "meeting",
    description: "Agenda, notes, action items.",
    build: () => ({
      title: "Meeting — " + today(),
      content: {
        type: "doc",
        content: [
          h(1, "Meeting"),
          h(3, "Attendees"),
          bulletList([""]),
          h(3, "Agenda"),
          bulletList([""]),
          h(3, "Notes"),
          p(),
          h(3, "Action items"),
          taskList([""]),
        ],
      },
    }),
  },
  {
    id: "project",
    name: "Project Plan",
    icon: "project",
    description: "Goal, milestones, risks.",
    build: () => ({
      title: "Project — ",
      content: {
        type: "doc",
        content: [
          h(1, "Project name"),
          h(2, "Goal"),
          p("What success looks like."),
          h(2, "Scope"),
          bulletList(["In-scope", "Out-of-scope"]),
          h(2, "Milestones"),
          taskList(["M1 — kickoff", "M2 — draft", "M3 — launch"]),
          h(2, "Risks"),
          bulletList([""]),
          h(2, "Open questions"),
          bulletList([""]),
        ],
      },
    }),
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    icon: "brainstorm",
    description: "Wild ideas, then shortlist.",
    build: () => ({
      title: "Brainstorm — ",
      content: {
        type: "doc",
        content: [
          h(1, "Brainstorm"),
          h(3, "Prompt"),
          p("What are we exploring?"),
          h(3, "Wild ideas"),
          bulletList(["", "", ""]),
          h(3, "Shortlist"),
          taskList([""]),
        ],
      },
    }),
  },
  {
    id: "recipe",
    name: "Recipe",
    icon: "recipe",
    description: "Ingredients and steps.",
    build: () => ({
      title: "Recipe — ",
      content: {
        type: "doc",
        content: [
          h(1, "Recipe"),
          h(3, "Ingredients"),
          bulletList([""]),
          h(3, "Steps"),
          { type: "orderedList", content: [
            { type: "listItem", content: [p("")] },
          ]},
        ],
      },
    }),
  },
  {
    id: "weekly",
    name: "Weekly Review",
    icon: "weekly",
    description: "Reflect on your week.",
    build: () => ({
      title: "Weekly Review — " + today(),
      content: {
        type: "doc",
        content: [
          h(1, "Weekly Review"),
          h(2, "Wins"),
          bulletList(["What went well this week?"]),
          h(2, "Challenges"),
          bulletList(["What was difficult?"]),
          h(2, "Lessons"),
          bulletList(["What did I learn?"]),
          h(2, "Next week priorities"),
          taskList(["", "", ""]),
        ],
      },
    }),
  },
  {
    id: "study",
    name: "Study Notes",
    icon: "study",
    description: "Cornell-style study template.",
    build: () => ({
      title: "Study — ",
      content: {
        type: "doc",
        content: [
          h(1, "Subject / Topic"),
          h(2, "Key Concepts"),
          bulletList(["Concept 1", "Concept 2"]),
          h(2, "Detailed Notes"),
          p(),
          h(2, "Questions"),
          bulletList(["What did I not understand?"]),
          h(2, "Summary"),
          p("Write a brief summary of this material in your own words."),
        ],
      },
    }),
  },
  {
    id: "bug",
    name: "Bug Report",
    icon: "bug",
    description: "Steps to reproduce, expected vs actual.",
    build: () => ({
      title: "Bug — ",
      content: {
        type: "doc",
        content: [
          h(1, "Bug Report"),
          h(3, "Summary"),
          p("Brief description of the issue."),
          h(3, "Steps to reproduce"),
          { type: "orderedList", content: [
            { type: "listItem", content: [p("Step 1")] },
            { type: "listItem", content: [p("Step 2")] },
          ]},
          h(3, "Expected behavior"),
          p(),
          h(3, "Actual behavior"),
          p(),
          h(3, "Environment"),
          bulletList(["OS: ", "Version: ", "Browser: "]),
        ],
      },
    }),
  },
  {
    id: "decision",
    name: "Decision Log",
    icon: "decision",
    description: "Options, pros/cons, decision.",
    build: () => ({
      title: "Decision — ",
      content: {
        type: "doc",
        content: [
          h(1, "Decision Log"),
          h(2, "Context"),
          p("What decision needs to be made and why?"),
          h(2, "Options"),
          h(3, "Option A"),
          bulletList(["Pro: ", "Con: "]),
          h(3, "Option B"),
          bulletList(["Pro: ", "Con: "]),
          h(2, "Decision"),
          p("We chose: "),
          h(2, "Rationale"),
          p("Because: "),
        ],
      },
    }),
  },
];
