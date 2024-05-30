import bolt from "@slack/bolt";
import { ModalView, WebClient } from "@slack/web-api";
import winston from "winston";
import slkModalHome from "./assets/modal-home.slack.json" with { type: "json" };
import Bootstrap from "./bootstrap.js";
import { bootstrappers } from "./main.js";

export interface Command {
  id: string;
  action: (
    ack: bolt.AckFn<string | bolt.RespondArguments>,
    body: bolt.SlashCommand,
    client: WebClient,
    logger: winston.Logger,
  ) => Promise<void>;
}

const commands: Command[] = [];
commands.push({
  id: "sgl",
  action: async (
    ack: bolt.AckFn<string | bolt.RespondArguments>,
    body: bolt.SlashCommand,
    client: WebClient,
    logger: winston.Logger,
  ) => {
    await ack();

    const result = await client.views.open({
      trigger_id: body.trigger_id,
      view: slkModalHome as ModalView,
    });

    if (result.error)
      logger.error(`An error occured while launching a modal: ${result.error}`);
  },
});

commands.push({
  id: "sgl-loadtest",
  action: async (
    ack: bolt.AckFn<string | bolt.RespondArguments>,
    body: bolt.SlashCommand,
    client: WebClient,
    logger: winston.Logger,
  ) => {
    await ack();

    const game = new Bootstrap(logger, client);
    await game.from_file("test_games");
    game.parse();
    game.confirm_run(body.user_id, body.channel_id || "", "SGL", "Test Game");

    bootstrappers.set(game.id, game);
  },
});
export default commands;
