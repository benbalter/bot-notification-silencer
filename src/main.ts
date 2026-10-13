import dotenv from "dotenv";
import { getOctokit } from "@actions/github";
import {
  getBooleanInput,
  getInput,
  info,
  setFailed,
  setOutput,
  warning,
} from "@actions/core";
import { DEFAULT_BOTS, silence } from "./silencer";
dotenv.config();

async function run(): Promise<void> {
  const token = getInput("token", { required: true });
  const extraBots = getInput("bots")
    .split(",")
    .map((bot) => bot.trim())
    .filter(Boolean);

  const count = await silence(getOctokit(token), {
    bots: [...DEFAULT_BOTS, ...extraBots],
    dryRun: getInput("dry-run") !== "" && getBooleanInput("dry-run"),
    log: info,
    warn: warning,
  });

  info(`Marked ${count} notifications done`);
  setOutput("count", count);
}

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    setFailed((error as Error).message);
  }
}

main();
