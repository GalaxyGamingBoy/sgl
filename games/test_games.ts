import GameApi from "../src/game.js";

class Game extends GameApi {
  idx: number;

  constructor() {
    super("test_game");

    this.idx = 0;
  }

  init(): void {
    this.logger?.info("Intializing Test Game");
  }

  loop(): void {
    console.log("LOOP");
    this.logger?.warn("A");
    this.idx++;

    if (this.idx > 12) {
      this.exit();
    }
  }
}
