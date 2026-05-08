const fs = require("fs");
const path = require("path");

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const storePath = path.join(
  __dirname,
  "../src/features/course-builder/store.ts",
);

const store = fs.readFileSync(storePath, "utf8");

assertCondition(
  store.includes("selectedLessonIndex") && store.includes("selectedTaskIndex"),
  "Course builder save must preserve selection by lesson/task position when local ids are replaced by server ids",
);

assertCondition(
  store.includes("selectedLesson?.tasks[selectedTaskIndex]?.id ?? null"),
  "Course builder save must restore the same newly added task after autosave, not fallback to the first task",
);

assertCondition(
  store.includes(
    ".filter((l) => l.id !== lessonId && `${l.id}` !== lessonId)",
  ) && store.includes(".map((l, index) => ({ ...l, orderIndex: index }))"),
  "Course builder must compact lesson order indexes after deletion before autosave",
);

assertCondition(
  store.includes(".filter((t) => t.id !== taskId && `${t.id}` !== taskId)") &&
    store.includes(".map((t, index) => ({ ...t, orderIndex: index }))"),
  "Course builder must compact task order indexes after deletion before autosave",
);

console.log("Course builder selection contract assertions passed");
