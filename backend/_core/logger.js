const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

const normalizeLevel = (value) => {
    if (!value) {
        return "info";
    }
    const normalized = value.toLowerCase().trim();
    return LOG_LEVELS[normalized] !== undefined ? normalized : "info";
};
 
const shouldLog = (level) => {
    const current = normalizeLevel(process.env.LOG_LEVEL);
    return LOG_LEVELS[level] <= LOG_LEVELS[current];
};
 
export const logger = {
    error: (...args) => {
        if (shouldLog("error")) {
            console.error(...args);
        }
    },
    warn: (...args) => {
        if (shouldLog("warn")) {
            console.warn(...args);
        }
    },
    info: (...args) => {
        if (shouldLog("info")) {
            console.info(...args);
        }
    },
    debug: (...args) => {
        if (shouldLog("debug")) {
            console.debug(...args);
        }
    },
};
