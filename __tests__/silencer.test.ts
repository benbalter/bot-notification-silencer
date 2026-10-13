import { describe, expect, it } from "@jest/globals";
import { DEFAULT_BOTS, shouldMarkDone, silence } from "../src/silencer";

const bots = DEFAULT_BOTS;

describe("shouldMarkDone", () => {
  it("marks a closed bot PR done", () => {
    const subject = { state: "closed", user: { login: "renovate[bot]" } };
    expect(shouldMarkDone(subject, undefined, bots)).toBe(true);
  });

  it("leaves an open bot PR alone", () => {
    const subject = { state: "open", user: { login: "renovate[bot]" } };
    expect(shouldMarkDone(subject, undefined, bots)).toBe(false);
  });

  it("leaves a closed human PR alone", () => {
    const subject = { state: "closed", user: { login: "benbalter" } };
    expect(shouldMarkDone(subject, undefined, bots)).toBe(false);
  });

  it("marks a closed issue done when a bot commented last", () => {
    const subject = { state: "closed", user: { login: "benbalter" } };
    expect(shouldMarkDone(subject, "stale[bot]", bots)).toBe(true);
  });

  it("handles a missing author", () => {
    expect(
      shouldMarkDone({ state: "closed", user: null }, undefined, bots)
    ).toBe(false);
  });
});

describe("silence", () => {
  const notification = (
    id: string,
    url: string,
    type = "PullRequest",
    isPrivate = false
  ) => ({
    id,
    repository: { full_name: `benbalter/example-${id}`, private: isPrivate },
    subject: { title: `#${id}`, url, type, latest_comment_url: url },
  });

  const subjects: Record<string, object> = {
    "GET https://api/merged": {
      state: "closed",
      user: { login: "renovate[bot]" },
    },
    "GET https://api/open": { state: "open", user: { login: "renovate[bot]" } },
  };

  function fakeOctokit() {
    const deleted: number[] = [];
    const octokit = {
      paginate: async () => [
        notification("1", "https://api/merged"),
        notification("2", "https://api/open"),
        notification("3", "https://api/release", "Release"),
        notification("4", "https://api/missing"),
        notification("5", "https://api/merged", "PullRequest", true),
      ],
      rest: { activity: { listNotificationsForAuthenticatedUser: {} } },
      request: async (route: string, params?: { thread_id: number }) => {
        if (route.startsWith("DELETE")) {
          deleted.push(params!.thread_id);
          return {};
        }
        if (!subjects[route]) throw new Error("Not Found");
        return { data: subjects[route] };
      },
    };
    return { octokit: octokit as never, deleted };
  }

  const quiet = { log: () => {}, warn: () => {} };

  it("marks only closed bot threads done and skips errors", async () => {
    const { octokit, deleted } = fakeOctokit();
    const warnings: string[] = [];
    const count = await silence(octokit, {
      bots,
      dryRun: false,
      log: () => {},
      warn: (message) => warnings.push(message),
    });
    expect(count).toBe(2);
    expect(deleted).toEqual([1, 5]);
    expect(warnings).toHaveLength(1);
  });

  it("changes nothing in a dry run", async () => {
    const { octokit, deleted } = fakeOctokit();
    const count = await silence(octokit, { bots, dryRun: true, ...quiet });
    expect(count).toBe(2);
    expect(deleted).toEqual([]);
  });

  it("never names a private repo in its logs", async () => {
    const { octokit } = fakeOctokit();
    const lines: string[] = [];
    const record = (message: string) => lines.push(message);
    await silence(octokit, { bots, dryRun: true, log: record, warn: record });
    expect(lines.join("\n")).not.toContain("example-5");
    expect(lines).toContain("Would mark done: a private repo (thread 5)");
  });
});
