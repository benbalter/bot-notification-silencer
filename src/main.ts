import dotenv from "dotenv";
import { getOctokit } from "@actions/github";
import { getInput, info, setFailed } from "@actions/core";
dotenv.config();

const ignored = ["dependabot[bot]", "dependabot-preview[bot]", "stale[bot]"];
const token = getInput("token", { required: true });
const octokit = getOctokit(token, { debug: true });

type Notification = {
  id: string;
  subject: {
    title: string;
    url: string;
    latest_comment_url: string;
  };
};

type User = {
  login: string;
};

async function getNotifications(): Promise<Notification[]> {
  const since = new Date();
  since.setHours(since.getHours() - 1);

  const { data: notifications } =
    await octokit.rest.activity.listNotificationsForAuthenticatedUser({
      since: since.toISOString(),
    });

  return notifications;
}

async function getAuthor(
  notification: Notification,
  getLatestCommentAuthor?: boolean
): Promise<User> {
  const url =
    getLatestCommentAuthor && notification.subject.latest_comment_url
      ? notification.subject.latest_comment_url
      : notification.subject.url;

  const response = await octokit.request(url);
  const author: User = response.data.user;
  return author;
}

function maybeMarkAsRead(notification: Notification, author: User): boolean {
  if (author?.login && ignored.includes(author.login)) {
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

  info(`Found ${notifications.length} notifications`);

  for (const notification of notifications) {
    const author = await getAuthor(notification);

    if (maybeMarkAsRead(notification, author)) {
      continue;
    }

    const commentAuthor = await getAuthor(notification, true);
    maybeMarkAsRead(notification, commentAuthor);
  }
}

try {
  run();
} catch (error: any) {
  setFailed(error.message);
}
