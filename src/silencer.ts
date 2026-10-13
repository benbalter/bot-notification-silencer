import type { info } from "@actions/core";
import type { getOctokit } from "@actions/github";

type Octokit = ReturnType<typeof getOctokit>;

export const DEFAULT_BOTS = [
  "dependabot[bot]",
  "dependabot-preview[bot]",
  "renovate[bot]",
  "stale[bot]",
];

// Only threads about these subjects have a state we can check.
const SUBJECT_TYPES = ["PullRequest", "Issue"];

export type Subject = {
  state?: string;
  user?: { login?: string } | null;
};

export type Options = {
  bots: string[];
  dryRun: boolean;
  log: typeof info;
  warn: typeof info;
};

// A thread is done once a bot's PR or issue is closed (merged counts as
// closed). Open ones stay in the inbox so a stuck or failing PR stays visible.
// stale[bot] closes other people's issues, so a closed thread whose latest
// comment came from a bot counts too.
export function shouldMarkDone(
  subject: Subject,
  latestCommentAuthor: string | undefined,
  bots: string[]
): boolean {
  if (subject.state !== "closed") return false;
  const author = subject.user?.login;
  if (author && bots.includes(author)) return true;
  return !!latestCommentAuthor && bots.includes(latestCommentAuthor);
}

export async function silence(
  octokit: Octokit,
  { bots, dryRun, log, warn }: Options
): Promise<number> {
  const notifications = await octokit.paginate(
    octokit.rest.activity.listNotificationsForAuthenticatedUser,
    // eslint-disable-next-line camelcase
    { per_page: 50 }
  );
  log(`Found ${notifications.length} notifications`);

  let count = 0;
  for (const notification of notifications) {
    const { subject, repository } = notification;
    if (!subject.url || !SUBJECT_TYPES.includes(subject.type)) continue;

    const name = `${repository.full_name}: ${subject.title}`;
    try {
      const { data } = await octokit.request(`GET ${subject.url}`);
      const author: string | undefined = data.user?.login;

      // Only look up the latest comment when it could change the answer.
      let commentAuthor: string | undefined;
      if (
        data.state === "closed" &&
        !(author && bots.includes(author)) &&
        subject.latest_comment_url &&
        subject.latest_comment_url !== subject.url
      ) {
        const { data: comment } = await octokit.request(
          `GET ${subject.latest_comment_url}`
        );
        commentAuthor = comment.user?.login;
      }

      if (!shouldMarkDone(data, commentAuthor, bots)) continue;

      log(`${dryRun ? "Would mark" : "Marking"} done: ${name}`);
      if (!dryRun) {
        await octokit.request("DELETE /notifications/threads/{thread_id}", {
          // eslint-disable-next-line camelcase
          thread_id: Number(notification.id),
        });
      }
      count++;
    } catch (error) {
      // A deleted repo or lost access shouldn't stop the rest of the run.
      warn(`Skipping ${name}: ${(error as Error).message}`);
    }
  }

  return count;
}
