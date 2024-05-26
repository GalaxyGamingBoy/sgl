import bolt from "@slack/bolt";
import { ModalView, WebClient } from "@slack/web-api";
import winston from "winston";
import slkModalHome from "./assets/modal-home.slack.json" with { type: "json" };

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

export default commands;
