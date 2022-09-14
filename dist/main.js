"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const github_1 = require("@actions/github");
const core_1 = require("@actions/core");
const ignored = ["dependabot[bot]", "dependabot-preview[bot]", "stale[bot]"];
const token = (0, core_1.getInput)("token");
const octokit = (0, github_1.getOctokit)(token, { debug: true });
function getNotifications() {
    return __awaiter(this, void 0, void 0, function* () {
        const since = new Date();
        since.setHours(since.getHours() - 1);
        const { data: notifications } = yield octokit.rest.activity.listNotificationsForAuthenticatedUser({
            since: since.toISOString(),
        });
        return notifications;
    });
}
function maybeMarkAsRead(notification, author) {
    if (ignored.includes(author.login)) {
        (0, core_1.info)(`Marking notification ${notification.subject.title} as read`);
        octokit.rest.activity.markThreadAsRead({
            // eslint-disable-next-line camelcase
            thread_id: parseInt(notification.id),
        });
        return true;
    }
    else {
        return false;
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const notifications = yield getNotifications();
        for (const notification of notifications) {
            const { data: { user: author }, } = yield octokit.request(notification.subject.url);
            if (maybeMarkAsRead(notification, author)) {
                continue;
            }
            if (!notification.subject.latest_comment_url) {
                continue;
            }
            const { data: { user: commentAuthor }, } = yield octokit.request(notification.subject.latest_comment_url);
            maybeMarkAsRead(notification, commentAuthor);
        }
    });
}
run();
