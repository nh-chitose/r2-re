import { EOL } from "os";

// @ts-ignore
import * as Parse from "fast-json-parse";
import split from "split2";

interface LogObject {
  level: number;
  msg: string;
  time: number;
  label: string;
  hidden: boolean;
}

const levels = {
  default: "USERLVL",
  60: "FATAL",
  50: "ERROR",
  40: "WARN",
  30: "INFO",
  20: "DEBUG",
  10: "TRACE",
};

export function splitToJson() {
  const stream = split((json: string): string => {
    try{
      const parsed = new Parse(json);
      const logObj: LogObject = parsed.value;
      if(parsed.err){
        return json + EOL;
      }
      if(logObj.level <= 20 || logObj.hidden){
        return "";
      }
      return JSON.stringify({
        time: logObj.time,
        // @ts-ignore
        level: levels[logObj.level],
        msg: logObj.msg,
      });
    } catch(ex){
      return "";
    }
  });
  return stream;
}
