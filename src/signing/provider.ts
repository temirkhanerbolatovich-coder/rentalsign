export interface SigningResult {
  status: "DEMO_SIGNED";
  signedAt: Date;
}
/** Replace the provider after a separate trust, legal and integration review for NUC RK. */
export interface SigningProvider {
  sign(token: string, acknowledged: boolean): Promise<SigningResult>;
}
