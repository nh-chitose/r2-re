import type { LoggingEvent } from "log4js";

import path from "path";

import log4js from "log4js";
import "dotenv/config";

import { getConfig } from "./config/configLoader";

const { debug } = getConfig();

const tokens = {
  category: function(logEvent: LoggingEvent){
    return logEvent.categoryName;
  },
  level: function(logEvent: LoggingEvent){
    switch(logEvent.level.levelStr){
      case "INFO":
        return "INFO ";
      case "WARN":
        return "WARN ";
      default:
        return logEvent.level.levelStr;
    }
  },
};

const fileLayout = {
  type: "pattern",
  pattern: "%d %x{level} [%x{category}] %m %s",
  tokens,
};

const debugConsole = {
  type: "pattern",
  pattern: "%[%d%] %[%x{level}%] %[[%x{category}]%] %m",
  tokens,
};

const basicConsole = {
  type: "pattern",
  pattern: "%[%x{level}%] %m",
  tokens,
};

const TRANSFER_PORT = Number(process.env.LOG_TRANSFER_PORT) || 5003;

if(debug){
  log4js.configure({
    appenders: {
      out: {
        type: "stdout",
        layout: debugConsole,
      },
      file: {
        type: "file",
        filename: path.join(process.cwd(), "logs/debug.log"),
        layout: fileLayout,
        maxLogSize: 10485760,
        backups: 3,
      },
      err: {
        type: "file",
        filename: path.join(process.cwd(), "logs/error.log"),
        layout: fileLayout,
        maxLogSize: 10485760,
        backups: 3,
      },
      wrapErr: {
        type: "logLevelFilter",
        appender: "err",
        level: "error",
      },
      server: {
        type: "tcp-server",
        port: TRANSFER_PORT,
      },
    },
    categories: {
      default: { appenders: ["out", "file", "wrapErr"], level: "trace" },
    },
  });
}else{
  log4js.configure({
    appenders: {
      out: {
        type: "stdout",
        layout: basicConsole,
      },
      file: {
        type: "file",
        filename: path.join(process.cwd(), "logs/info.log"),
        layout: fileLayout,
        maxLogSize: 10485760,
        backups: 3,
      },
      err: {
        type: "file",
        filename: path.join(process.cwd(), "logs/error.log"),
        layout: fileLayout,
        maxLogSize: 10485760,
        backups: 3,
      },
      wrapErr: {
        type: "logLevelFilter",
        appender: "err",
        level: "error",
      },
      server: {
        type: "tcp-server",
        port: TRANSFER_PORT,
      },
    },
    categories: {
      default: { appenders: ["out", "file", "wrapErr"], level: "info" },
    },
  });
}

export type LoggerObject = {
  trace: log4js.Logger["trace"],
  debug: log4js.Logger["debug"],
  info: log4js.Logger["info"],
  warn: log4js.Logger["warn"],
  error: log4js.Logger["error"],
  fatal: log4js.Logger["fatal"],
  addContext: log4js.Logger["addContext"],
};

const loggerMap = new Map<string, LoggerObject>();

export function getLogger(tag: string){
  if(loggerMap.has(tag)){
    return loggerMap.get(tag);
  }else{
    const log4jsLogger = log4js.getLogger(tag);
    const logger: LoggerObject = {
      trace: log4jsLogger.trace.bind(log4jsLogger),
      debug: log4jsLogger.debug.bind(log4jsLogger),
      info: log4jsLogger.info.bind(log4jsLogger),
      warn: log4jsLogger.warn.bind(log4jsLogger),
      error: log4jsLogger.error.bind(log4jsLogger),
      fatal: log4jsLogger.fatal.bind(log4jsLogger),
      addContext: log4jsLogger.addContext.bind(log4jsLogger),
    };
    loggerMap.set(tag, logger);
    return logger;
  }
}
