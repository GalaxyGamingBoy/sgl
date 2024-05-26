export class Block {
  private _data: Object;

  constructor(data: Object) {
    this._data = data;
  }

  fill(args: { [key: string]: string }) {
    let data = JSON.stringify(this._data);

    Object.keys(args).forEach((arg) => {
      data = data.replaceAll(`[[${arg}]]`, args[arg]);
    });

    this._data = JSON.parse(data);
  }

  get data(): Object {
    return this._data;
  }
}
