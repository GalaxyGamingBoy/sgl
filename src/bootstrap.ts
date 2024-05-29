import fs from "fs";
import fsPromise from "fs/promises";
import winston from "winston";
import zlib from "zlib";
import ts from "typescript";
import { v4 } from "uuid";
import { WorkerMessageTypes } from "./game.js";
import bolt from "@slack/bolt";
import { Worker } from "worker_threads";

export enum BootstrapErrors {
  GAME_FILE_NOT_FOUND,
  READ_GAMEFILE_ERROR,
  DEFLATE_BROTLI_ERROR,
  NO_CODE_INPUTTED,
  TYPESCRIPT_PARSE_ERROR,
  NO_TRANSPILED_CODE,
}

class Bootstrap {
  private _code?: string;
  private _transpiledCode?: ts.TranspileOutput;
  private _logger: winston.Logger;
  private _slack: bolt.App;
  private _id: string;
  private _worker?: Worker;

  constructor(logger: winston.Logger, slack: bolt.App) {
    this._logger = logger;
    this._slack = slack;
    this._id = v4();
  }

  get parseErrors(): string[] {
    return (this._transpiledCode?.diagnostics || []).map((diag) =>
      ts.flattenDiagnosticMessageText(diag.messageText, "\n"),
    );
  }

  async from_file(filename: string): Promise<BootstrapErrors | void> {
    await fsPromise
      .readFile(`./games/${filename}.ts`)
      .then((v) => (this._code = v.toString("utf8")))
      .catch((err) => {
        if (err.code == "ENOENT") {
          this._logger.warn(
            `Game file ${filename}.ts not found! Aborting game launch...`,
          );

          return BootstrapErrors.GAME_FILE_NOT_FOUND;
        }

        this._logger.error(
          `An error occured while reading the game file ${filename}! Aborting game launch...`,
        );

        return BootstrapErrors.READ_GAMEFILE_ERROR;
      });
  }

  from_memory(data: string): BootstrapErrors | void {
    zlib.brotliDecompress(data, (error: Error | null, data: Buffer) => {
      if (error) {
        this._logger.warn(
          `An error occured while deflating the brotli game file! Aborting game launch...`,
        );

        return BootstrapErrors.DEFLATE_BROTLI_ERROR;
      }

      this._code = data.toString();
    });
  }

  parse(): BootstrapErrors | void {
    if (this._code == undefined) return BootstrapErrors.NO_CODE_INPUTTED;

    this._transpiledCode = ts.transpileModule(this._code, {
      moduleName: "sgl-game",
      compilerOptions: {
        strict: false,
        allowJs: true,
        esModuleInterop: true,
        moduleResolution: ts.ModuleResolutionKind.Node16,
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    });

    if (this._transpiledCode.diagnostics!.length > 0)
      return BootstrapErrors.TYPESCRIPT_PARSE_ERROR;
  }

  execute(): BootstrapErrors | void {
    if (!this._transpiledCode) return BootstrapErrors.NO_TRANSPILED_CODE;

    fs.mkdir("./.workers/", () => {
      fs.writeFileSync(
        `./.workers/.worker-sgl-${this._id}.tmp.js`,
        `${this._transpiledCode!.outputText};\nconst game${this._id.replaceAll("-", "")} = new Game();\ngame${this._id.replaceAll("-", "")}.workerDriver();\n`,
      );

      const worker = new Worker(`./.workers/.worker-sgl-${this._id}.tmp.js`);
      worker.addListener(
        "message",
        (msg: { type: WorkerMessageTypes; data: any }) => {
          switch (msg.type) {
            case WorkerMessageTypes.KILL:
              this.terminate();
              break;
          }
        },
      );

      worker.postMessage({
        type: WorkerMessageTypes.INIT,
        data: {
          logger: {
            level: "info",
            defaultMeta: { service: "sgl-runtime" },
            id: this._id,
          },
          slack: {
            signingSecret: process.env.BOLT_RUNTIME_SIGNING_SECRET,
            clientSecret: process.env.BOLT_RUNTIME_CLIENT_SECRET,
            appToken: process.env.BOLT_RUNTIME_APP_TOKEN,
            token: process.env.BOLT_RUNTIME_ORG_TOKEN,
            socketMode: true,
          },
        },
      });

      this._worker = worker;
    });
  }

  terminate() {
    console.log(`Game ${this._id} terminated!`);
    this._worker!.terminate();

    fs.rmSync(`./.workers/.worker-sgl-${this._id}.tmp.js`);
  }
}

export default Bootstrap;
