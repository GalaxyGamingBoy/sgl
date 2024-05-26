import "dotenv/config";
import bolt from "@slack/bolt";
import winston from "winston";
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

logger.info(`Slack Game Library v${pkg.version}`);
logger.info(`Slack app running on: ${process.env.PORT || 3000}`);
// await slack.start(process.env.PORT || 3000);

const bootstrap = new Bootstrap(logger, slack);
console.log(await bootstrap.from_file("test_games"));
console.log(bootstrap.parse());
console.log(bootstrap.execute());
