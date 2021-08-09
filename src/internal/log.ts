import debug from "debug";
const log = debug("paramodel");

/** @internal */
export const _logError = log.extend("error");

/** @internal */
export const _logWarn = log.extend("warn");

/** @internal */
export const _logInfo = log.extend("info");

/** @internal */
export const _logVerbose = log.extend("verbose");
