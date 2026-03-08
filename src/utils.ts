export function formatBytes(bytes: number): string {
    const unit = 1024;
    if (bytes < unit) return bytes + ' B';
    const exp = Math.floor(Math.log(bytes) / Math.log(unit));
    const pre = "KMGTPE"[exp - 1];
    return (bytes / Math.pow(unit, exp)).toFixed(1) + ' ' + pre + 'B';
}
