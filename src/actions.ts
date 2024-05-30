import { ModalView, WebClient } from "@slack/web-api";
import winston from "winston";
import bolt, { BlockAction } from "@slack/bolt";

import { db } from "./db.js";
import { games } from "./db/schema.js";
import { Block } from "./blocks.js";

import blkGame from "./assets/block-game.slack.json" with { type: "json" };
import modalLibrary from "./assets/modal-library.slack.json" with { type: "json" };

export interface Action {
  id: string;
  action: (
    ack:
      | bolt.AckFn<void>
      | bolt.AckFn<string | bolt.SayArguments>
      | bolt.AckFn<bolt.DialogValidation>,
    body: bolt.SlackAction,
    client: WebClient,
    logger: winston.Logger,
  ) => Promise<void>;
}

const actions: Action[] = [];
actions.push({
  id: "sgl-home-browse",
  action: async (ack, body, client) => {
    await ack();

    const query = await db.select().from(games);
    const gamesBlock = query
      .map((game) => {
        const block = new Block(blkGame);

        block.fill({
          game_title: game.title!,
          game_desc: game.desc || "No description provided",
          game_author: game.author!,
          game_rating: "0",
          game_id: game.id,
        });

        return block.data;
      })
      .flat();

    const modal: {
      blocks: object[];
    } = { ...modalLibrary };

    modal.blocks = gamesBlock;

    client.views.push({
      trigger_id: (body as BlockAction).trigger_id,
      view: modal as ModalView,
    });
  },
});

actions.push({
  id: "sgl-home-saveddata",
  action: async (ack) => {
    await ack();
  },
});

actions.push({
  id: "sgl-home-developgames",
  action: async (ack) => {
    await ack();
  },
});

actions.push({
  id: "sgl-progreference",
  action: async (ack) => {
    await ack();
  },
});

export default actions;
