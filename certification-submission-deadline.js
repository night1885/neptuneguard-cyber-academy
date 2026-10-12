export function observeSubmissionOperation(operation, onTimeout, timeoutMs = 10000) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000 || typeof onTimeout !== 'function') throw new Error('Invalid response deadline');
  return new Promise((resolve, reject) => {
    let decided = false;
    const timer = setTimeout(() => {
      if (decided) return;
      decided = true;
      Promise.resolve().then(onTimeout).then(() => resolve({ timedOut: true }), reject);
    }, timeoutMs);
    Promise.resolve(operation).then(value => {
      if (decided) return;
      decided = true; clearTimeout(timer); resolve({ timedOut: false, value });
    }, error => {
      if (decided) return;
      decided = true; clearTimeout(timer); reject(error);
    });
  });
}
