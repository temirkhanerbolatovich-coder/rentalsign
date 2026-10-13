import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const randomToken = () => randomBytes(32).toString("base64url");
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const validToken = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);
function encryptionKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || !/^[a-fA-F0-9]{64}$/.test(key))
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes in hex");
  return Buffer.from(key, "hex");
}
export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
}
export function decryptToken(encrypted: string) {
  const value = Buffer.from(encrypted, "base64url");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    value.subarray(0, 12),
  );
  decipher.setAuthTag(value.subarray(12, 28));
  return Buffer.concat([
    decipher.update(value.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
