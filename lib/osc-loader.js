/* @flow */
import path from 'path';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import EventEmitter from 'events';

export default class OscLoader extends EventEmitter {
  port: number;
  _server: ChildProcess;
  _addresses: { [address: string]: boolean } = {};

  constructor(port: number) {
    super();

    this.port = port;
    this._server = spawn('node', [path.resolve(__dirname, 'osc-server.js'), this.port.toString()], {
      cwd: path.resolve(__dirname, '..'),
    });
    this._server.stdout.on('data', this.stdout);
    this._server.stderr.on('data', this.stderr);
    this._server.on('exit', this.exit);
  }

  destroy() {
    try {
      this._server.kill();
    } catch (e) {
      console.error(e);
    }
  }

  stdout = (output: Buffer) => {
    const s = output.toString().trim();
    s.split('\n').forEach(line => {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch (e) {}

      if (msg) {
        msg.address = 'osc_' + msg.address.replace(/^\//, '').replace('/', '_');
        this.emit('message', msg);

        // If the address is never used before,
        // VEDA have to reload the last shader to use the texture
        if (!this._addresses[msg.address]) {
          this._addresses[msg.address] = true;
          this.emit('reload');
        }
      } else {
        console.log(line);
      }
    });
  }

  stderr = (output: Buffer) => {
    console.error(output.toString());
  }

  exit = (code: number) => {
    console.log('[VEDA] OSC server exited with code', code);
  }
}
