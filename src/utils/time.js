export function secsToMMSS(secs) {
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs - minutes * 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function secsToMs(secs) {
  return secs * 1000;
}
