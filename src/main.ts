import "dotenv/config";
import bolt from "@slack/bolt";
import winston from "winston";
import express, { Request, Response } from "express";
import crypto from "crypto";
import WinstonSlackWebhook from "winston-slack-webhook-transport";
import commands from "./commands.js";
import actions from "./actions.js";
import pkg from "../package.json" with { type: "json" };
import Bootstrap from "./bootstrap.js";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "sgl-main" },
  transports: [
    new WinstonSlackWebhook({
      webhookUrl: process.env.SLACK_BOLT_WEBHOOK!,
      formatter: (info) => {
        return { text: `${info.service} | ${info.level}: \`${info.message}\`` };
      },
    }),
    new winston.transports.File({ filename: "slack-game-library.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

const slack = new bolt.App({
  signingSecret: process.env.BOLT_SIGNING_SECRET,
  clientSecret: process.env.BOLT_CLIENT_SECRET,
  appToken: process.env.BOLT_APP_TOKEN,
  token: process.env.BOLT_ORG_TOKEN,
  socketMode: process.env.BOLT_SOCKET != undefined,
  logger: {
    debug: (...msg) => {
      logger.debug(JSON.stringify(msg), { service: "sgl-slack" });
    },
    info: (...msg) => {
      logger.info(JSON.stringify(msg), { service: "sgl-slack" });
    },
    warn: (...msg) => {
      logger.warn(JSON.stringify(msg), { service: "sgl-slack" });
    },
    error: (...msg) => {
      logger.error(JSON.stringify(msg), { service: "sgl-slack" });
    },
    setLevel: (lvl) => (logger.level = lvl),
    getLevel: (): bolt.LogLevel => logger.level as bolt.LogLevel,
    setName: () => {},
  },
});

commands.forEach((command) =>
  slack.command(
    `/${command.id}`,
    async ({ ack, body, client }) =>
      await command.action(ack, body, client, logger),
  ),
);

actions.forEach((action) =>
  slack.action(
    action.id,
    async ({ ack, body, client }) =>
      await action.action(ack, body, client, logger),
  ),
);

const server = express();
server.use(express.urlencoded({ extended: false }));

server.post(
  "/slack/runtime/events",
  express.raw({ type: "*/*" }),
  (req: Request, res: Response) => {
    const ts = req.headers["x-slack-request-timestamp"];
    const base = `v0:${ts}:${req.body}`;

    const signature = crypto
      .createHmac(
        "sha256",
        Buffer.from(process.env.BOLT_RUNTIME_SIGNING_SECRET || ""),
      )
      .update(base)
      .digest("hex");

    if ("v0=" + signature != req.headers["x-slack-signature"])
      return res.status(401);

    res.status(200).end(JSON.parse(req.body).challenge);

    bootstrappers.forEach((boot) => boot.sendEvent(req));
  },
);

server.post("/slack/runtime/interactivity", (req: Request, res: Response) => {
  const payload = JSON.parse(req.body.payload);

  if (
    payload.type == "block_actions" &&
    bootstrappers.has(payload.actions[0].value)
  ) {
    const bootstrapper = bootstrappers.get(payload.actions[0].value);

    if (
      payload.actions[0].action_id == "sgl_runtime_confirm" &&
      !bootstrapper?.isRunning
    ) {
      logger.info(
        `User confirmed execution of game with id: ${bootstrapper!.id}, Executing...`,
      );

      bootstrapper!.triggerId = payload.trigger_id;
      bootstrapper?.execute();
    }

    if (
      payload.actions[0].action_id == "sgl_runtime_terminate" &&
      bootstrapper?.isRunning
    ) {
      logger.info(
        `User confirmed termination of game with id: ${bootstrapper!.id}, Terminating...`,
      );

      bootstrapper?.terminate();
      bootstrappers.delete(payload.actions[0].value)
    }
  }

  delete payload.api_app_id;
  delete payload.token;

  res.status(200).end();

  bootstrappers.forEach((boot) => boot.sendInteraction(payload));
});

server.listen(process.env.PORT || 3000);
logger.info(`Slack Game Library v${pkg.version}`, () =>
  logger.info(`Slack runtime app running on: ${process.env.PORT || 3000}`),
);

export const bootstrappers: Map<string, Bootstrap> = new Map();

await slack.start();
