export function appOrigin() {
  const url = new URL(
    process.env.APP_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      "http://localhost:3000",
  );
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("APP_URL must use HTTPS in production");
  return url.origin;
}
export function linkTtlHours() {
  return boundedConfig("LINK_TTL_HOURS", 72, 1, 720);
}
export function sessionHours() {
  return boundedConfig("SESSION_HOURS", 12, 1, 168);
}
function boundedConfig(
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`Invalid ${name}`);
  return value;
}
