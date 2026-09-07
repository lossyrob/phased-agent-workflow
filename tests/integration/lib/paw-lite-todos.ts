import assert from "node:assert";

export type TodoStatus = "pending" | "in_progress" | "done" | "blocked";

export interface PawLiteTodo {
  id: string;
  title: string;
  description: string;
  status: TodoStatus;
}

const WORK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertValidWorkId(workId: string): void {
  assert.match(
    workId,
    WORK_ID_PATTERN,
    "PAW-Lite work IDs must contain lowercase letters, numbers, and single hyphens only",
  );
}

export function upsertBoundaryTodo(
  todos: PawLiteTodo[],
  workId: string,
  boundaryName: string,
  brief: string,
): PawLiteTodo[] {
  assertValidWorkId(workId);
  const id = `lite:${workId}:boundary:${boundaryName}`;
  const existing = todos.find((todo) => todo.id === id);

  if (existing) {
    existing.title = `Boundary: ${boundaryName}`;
    existing.description = brief;
    existing.status = "pending";
    return todos;
  }

  todos.push({
    id,
    title: `Boundary: ${boundaryName}`,
    description: brief,
    status: "pending",
  });
  return todos;
}

export function unfinishedWorkTodos(todos: PawLiteTodo[], workId: string): PawLiteTodo[] {
  assertValidWorkId(workId);
  return todos.filter((todo) =>
    todo.id.startsWith(`lite:${workId}:work:`) && todo.status !== "done");
}

export function hasCompletedWorkOrNoWorkAttestation(todos: PawLiteTodo[], workId: string): boolean {
  assertValidWorkId(workId);
  return todos.some((todo) =>
    todo.id.startsWith(`lite:${workId}:work:`) && todo.status === "done");
}

export function isPrePrWorkReady(todos: PawLiteTodo[], workId: string): boolean {
  return unfinishedWorkTodos(todos, workId).length === 0
    && hasCompletedWorkOrNoWorkAttestation(todos, workId);
}
