import { type SimpleGit, simpleGit } from "simple-git";
import { TestFixture } from "./fixtures.js";

export interface CheckoutHandle {
  path: string;
  git: SimpleGit;
  branch(): Promise<string>;
  head(): Promise<string>;
  status(): Promise<string>;
  read(relativePath: string): Promise<string>;
  exists(relativePath: string): Promise<boolean>;
}

export interface CallerAndExecution {
  fixture: TestFixture;
  caller: CheckoutHandle;
  execution: CheckoutHandle;
  cleanup(): Promise<void>;
}

function createCheckoutHandle(fixture: TestFixture, checkoutPath: string): CheckoutHandle {
  return {
    path: checkoutPath,
    git: simpleGit(checkoutPath),
    branch: () => fixture.getBranch(checkoutPath),
    head: () => fixture.getHead(checkoutPath),
    status: () => fixture.getStatus(checkoutPath),
    read: (relativePath: string) => fixture.readRelativeFile(checkoutPath, relativePath),
    exists: (relativePath: string) => fixture.pathExists(checkoutPath, relativePath),
  };
}

export async function createCallerAndExecution(
  templateName: string,
  workId: string,
  targetBranch: string,
): Promise<CallerAndExecution> {
  const fixture = await TestFixture.clone(templateName);
  const executionPath = await fixture.addWorktree(workId, targetBranch);

  return {
    fixture,
    caller: createCheckoutHandle(fixture, fixture.workDir),
    execution: createCheckoutHandle(fixture, executionPath),
    cleanup: () => fixture.cleanup(),
  };
}
