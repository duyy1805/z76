export function getTokenExpiration(token) {
    try {
        const [, encodedPayload] = String(token || "").split(".");
        if (!encodedPayload) return null;
        const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        const payload = JSON.parse(window.atob(padded));
        const expiration = Number(payload?.exp);
        return Number.isFinite(expiration) ? expiration * 1000 : null;
    } catch {
        return null;
    }
}

export function isAccessTokenValid(token, now = Date.now()) {
    const expiration = getTokenExpiration(token);
    return expiration !== null && expiration > now;
}
