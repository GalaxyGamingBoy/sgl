import winston from "winston";
import bolt from "@slack/bolt";
import { parentPort } from "worker_threads";
import EventEmitter from "events";

export enum WorkerMessageTypes {
  INIT,
  KILL,
  BOLT_EVENT,
  BOLT_INTERACTION,
}

export interface WorkerMessage {
  type: WorkerMessageTypes;

  // eslint-disable-next-line
  data: any;
}

class GameApi {
  private _id: string;
  private _tick: number;
  private _slack?: bolt.App;
  private _loopInterval?: NodeJS.Timeout;
  logger?: winston.Logger;
  hasInit: boolean;
  slackEvents: EventEmitter;

  constructor(id: string, tick: number = 200) {
    this._id = id;
    this._tick = tick;
    this.hasInit = false;
    this.slackEvents = new EventEmitter();
  }

  init = (): void => {};
  loop = (): void => {};

  workerDriver(): void {
    parentPort?.addListener("message", (message: WorkerMessage) => {
      switch (message.type) {
        case WorkerMessageTypes.INIT:
          this.logger = winston.createLogger({
            ...message.data.logger,
            format: winston.format.prettyPrint(),
            transports: [
              new winston.transports.File({
                filename: `./.workers/.worker-sgl-${message.data.logger.id}.tmp.log`,
              }),
            ],
          });

          this._slack = new bolt.App({
            ...message.data.slack,
            logger: {
              debug: (...msg) => {
                this.logger!.debug(JSON.stringify(msg), {
                  service: "sgl-slack",
                });
              },
              info: (...msg) => {
                this.logger!.info(JSON.stringify(msg), {
                  service: "sgl-slack",
                });
              },
              warn: (...msg) => {
                this.logger!.warn(JSON.stringify(msg), {
                  service: "sgl-slack",
                });
              },
              error: (...msg) => {
                this.logger!.error(JSON.stringify(msg), {
                  service: "sgl-slack",
                });
              },
              setLevel: (lvl) => (this.logger!.level = lvl),
              getLevel: (): bolt.LogLevel =>
                this.logger!.level as bolt.LogLevel,
              setName: () => {},
            },
          });

          this.run();
          break;
        case WorkerMessageTypes.BOLT_EVENT:
          if (this.slackEvents.eventNames().includes(message.data.event.type))
            this.slackEvents.emit(message.data.event.type, message.data.event);
          break;
        case WorkerMessageTypes.BOLT_INTERACTION:
          if (this.slackEvents.eventNames().includes(message.data.type))
            this.slackEvents.emit(message.data.type, message.data);
          break;
        case WorkerMessageTypes.KILL:
          this.exit();
          break;
      }
    });
  }

  run() {
    this.logger!.info(`Executing game with ID: ${this._id}`);
    this.init();
    this._loopInterval = setInterval(() => this.loop(), this._tick);
  }

  exit(): void {
    clearInterval(this._loopInterval);
    this.logger?.info(`Stopping execution of game ${this._id}`);
    parentPort?.postMessage({ type: WorkerMessageTypes.KILL });
  }
}

export default GameApi;
