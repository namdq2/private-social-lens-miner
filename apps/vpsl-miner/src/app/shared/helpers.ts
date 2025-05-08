declare const window: any;

export function isElectron() {
  // Renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
    return true;
  }

  // Main process
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions['electron']) {
    return true;
  }

  // Detect the user agent when the `nodeIntegration` option is set to false
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
    return true;
  }

  return false;
}

export function formatUnixTimestampToDateString(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function calculateTimeRemaining(startTime: bigint, duration: bigint): { remainingTime: string; isRemainingTimeZero: boolean } {
  const endTime = Number(startTime) + Number(duration);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeRemainingSeconds = endTime - currentTime;

  if (timeRemainingSeconds <= 0) {
    return {
      remainingTime: '0 days; 0 hours',
      isRemainingTimeZero: true,
    };
  }

  const days = Math.floor(timeRemainingSeconds / (24 * 60 * 60));
  const hours = Math.floor((timeRemainingSeconds % (24 * 60 * 60)) / (60 * 60));

  return {
    remainingTime: `${days} days; ${hours} hours`,
    isRemainingTimeZero: timeRemainingSeconds <= 0,
  };
}