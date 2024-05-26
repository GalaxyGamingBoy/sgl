import winston from "winston";
import bolt from "@slack/bolt";
import { parentPort } from "worker_threads";
import WinstonSlackWebhook from "winston-slack-webhook-transport";

export enum WorkerMessageTypes {
  INIT,
  KILL,
}

export interface WorkerMessage {
  type: WorkerMessageTypes;
  data: any;
}

class GameApi {
  _id: string;
  _tick: number;
  _slack?: bolt.App;
  _loopInterval?: NodeJS.Timeout;
  logger?: winston.Logger;
  hasInit: boolean;

  constructor(id: string, tick: number = 200) {
    this._id = id;
    this._tick = tick;
    this.hasInit = false;
  }

  init(): void {}
  loop(): void {}
  exit(): void {
    clearInterval(this._loopInterval);
    throw Error(`Stopping execution of game ${this._id}`);
  }

  workerDriver(): void {
    parentPort?.addListener("message", (message: WorkerMessage) => {
      if (message.type == WorkerMessageTypes.INIT) {
        this.logger = winston.createLogger({
          ...message.data.logger,
          format: winston.format.prettyPrint(),
          transports: [
            new winston.transports.File({
              filename: `./.workers/.worker-sgl-${message.data.logger.id}.tmp.log`,
            }),
          ],
        });

        this.logger.info("HELLO");
        this._slack = new bolt.App({
          ...message.data.slack,
          logger: {
            debug: (...msg) => {
              this.logger!.debug(JSON.stringify(msg), { service: "sgl-slack" });
            },
            info: (...msg) => {
              this.logger!.info(JSON.stringify(msg), { service: "sgl-slack" });
            },
            warn: (...msg) => {
              this.logger!.warn(JSON.stringify(msg), { service: "sgl-slack" });
            },
            error: (...msg) => {
              this.logger!.error(JSON.stringify(msg), { service: "sgl-slack" });
            },
            setLevel: (lvl) => (this.logger!.level = lvl),
            getLevel: (): bolt.LogLevel => this.logger!.level as bolt.LogLevel,
            setName: () => {},
          },
        });

        this.run();
      }

      if (message.type == WorkerMessageTypes.KILL) {
        this.exit();
      }
    });
  }

  run() {
    this.logger!.info(`Executing game with ID: ${this._id}`);
    this.init();
    this._loopInterval = setInterval(this.loop, this._tick);
  }
}

export default GameApi;
