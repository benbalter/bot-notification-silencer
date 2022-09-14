import "dotenv/config";

import { getOctokit } from "@actions/github";
import { getInput, info } from "@actions/core";

const ignored = ["dependabot[bot]", "dependabot-preview[bot]", "stale[bot]"];
const token = getInput("token");
const octokit = getOctokit(token, { debug: true });

async function getNotifications() {
  const since = new Date();
  since.setHours(since.getHours() - 1);

  const { data: notifications } =
    await octokit.rest.activity.listNotificationsForAuthenticatedUser({
      since: since.toISOString(),
    });

  return notifications;
}

function maybeMarkAsRead(
  notification: { subject: { title: string }; id: string },
  author: { login: string }
): boolean {
  if (ignored.includes(author.login)) {
    info(`Marking notification ${notification.subject.title} as read`);
    octokit.rest.activity.markThreadAsRead({
      // eslint-disable-next-line camelcase
      thread_id: parseInt(notification.id),
    });
    return true;
  } else {
    return false;
  }
}

async function run() {
  const notifications = await getNotifications();

  for (const notification of notifications) {
    const {
      data: { user: author },
    } = await octokit.request(notification.subject.url);
    if (maybeMarkAsRead(notification, author)) {
      continue;
    }

    if (!notification.subject.latest_comment_url) {
      continue;
    }

    const {
      data: { user: commentAuthor },
    } = await octokit.request(notification.subject.latest_comment_url);

    maybeMarkAsRead(notification, commentAuthor);
  }
}

run();
