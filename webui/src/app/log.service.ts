import type { WsMessage, LogRecord } from "./types";
import type { Observer } from "rxjs/Observer";

import { Injectable } from "@angular/core";
import * as ReconnectingWebSocket from "reconnecting-websocket";
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { map, filter, share } from "rxjs/operators";

@Injectable()
export class LogService {
  private readonly host = window.location.hostname;
  private readonly url = `ws://${this.host}:8721`;
  private connected = false;
  log$: Observable<LogRecord>;
  socket: Subject<MessageEvent>;

  connect() {
    if(this.connected){
      return;
    }
    const ws = new ReconnectingWebSocket(this.url);
    const observable = new Observable((obs: Observer<MessageEvent>) => {
      ws.onmessage = obs.next.bind(obs);
      return ws.close.bind(ws);
    });
    const observer = {
      next: (data: object) => {
        if(ws.readyState === WebSocket.OPEN){
          ws.send(JSON.stringify(data));
        }
      },
    };
    this.socket = Subject.create(observer, observable);
    const sharedObservable = this.socket.pipe(share());
    this.log$ = this.mapMessage(sharedObservable, "log");
    this.connected = true;
  }

  private mapMessage(sharedObservable: Observable<MessageEvent>, type: string) {
    return sharedObservable.pipe(
      map(x => JSON.parse(x.data) as WsMessage<string>),
      filter(x => x.type === type),
      map(x => JSON.parse(x.body))
    );
  }
}
