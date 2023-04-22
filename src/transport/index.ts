import type { Server as httpServer } from "http";

import express from "express";
import { mkdirp } from "mkdirp";
import WebSocket from "ws";

import LineIntegration from "./LineIntegration";
import SlackIntegration from "./SlackIntegration";
import { splitToJson } from "./transform";
import { getConfig } from "../config/configLoader";
import { wssLogPort } from "../constants";

let wss: WebSocket.Server;
let app: express.Express;
let server: httpServer;

process.on("SIGINT", () => {
  if(wss){
    wss.close();
  }
  if(server){
    server.close();
  }
});

const logdir = "./logs";
mkdirp.sync(logdir);

let configRoot;

try{
  configRoot = getConfig();
} catch(ex){
  console.log(ex.message);
}

// notification integrations
if(configRoot){
  const slackConfig = "slack" in configRoot.logging && configRoot.logging.slack || undefined;
  const lineConfig = configRoot.logging.line || undefined;
  addIntegration(SlackIntegration, slackConfig);
  addIntegration(LineIntegration, lineConfig);
}

// websocket integration
const webGatewayConfig = configRoot.webGateway;
if(webGatewayConfig && webGatewayConfig.enabled){
  const clients: WebSocket[] = [];
  const wsTransform = process.stdin.pipe(splitToJson());
  app = express();
  server = app.listen(wssLogPort, webGatewayConfig.host, () => {});
  wss = new WebSocket.Server({ server });
  wss.on("connection", ws => {
    ws.on("error", () => {});
    clients.push(ws);
  });
  wsTransform.on("data", line => {
    if(!line){
      return;
    }
    try{
      broadcast(clients, "log", line);
    } catch(err){/* empty */}
  });
}

function broadcast(clients: WebSocket[], type: string, body: any) {
  for(const client of clients){
    if(client.readyState === WebSocket.OPEN){
      client.send(JSON.stringify({ type, body }), err => {
        if(err){
          const index = clients.findIndex(c => c === client);
          clients.splice(index, 1);
        }
      });
    }
  }
}

function addIntegration(
  Integration: { new (_config: any): SlackIntegration | LineIntegration },
  config: any
): void {
  if(config && config.enabled){
    const integration = new Integration(config);
    process.on("data", (line: string) => integration.handler(line));
  }
}
