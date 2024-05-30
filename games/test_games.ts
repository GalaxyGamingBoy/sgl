import { ModalView } from "@slack/web-api";
import GameApi from "../src/game.js";

class Game extends GameApi {
  idx: number;

  constructor() {
    super("test_game");

    this.idx = 0;
  }

  init = (): void => {
    this.logger?.info("Intializing Test Game");
  };

  loop = (): void => {};
}
