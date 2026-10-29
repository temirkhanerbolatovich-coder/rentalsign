import { Link2Off } from "lucide-react";
import { Brand } from "@/components/brand";
import { publicContract } from "@/services/contracts";
import { publicRateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { SigningClient } from "@/components/signing-client";
export const dynamic = "force-dynamic";
export default async function Sign({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let contract: Awaited<ReturnType<typeof publicContract>> | undefined;
  let accessError: AppError | undefined;
  try {
    await publicRateLimit(token);
    contract = await publicContract(token);
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    accessError = error;
  }
  if (accessError || !contract)
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mb-10 flex items-center justify-center gap-2 font-semibold">
            <Brand />
          </div>
          <Link2Off className="mx-auto mb-5 text-slate-400" size={40} />
          <h1 className="text-xl font-semibold">
            {accessError?.status === 429
              ? "Попробуйте позже"
              : "Ссылка недоступна"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            {accessError?.message || "Ссылка не найдена"}
          </p>
          <p className="mt-6 text-xs text-slate-400">
            Личные данные договора не отображаются.
          </p>
        </div>
      </main>
    );
  return (
    <SigningClient
      token={token}
      snapshot={contract.snapshot}
      signedAt={contract.signedAt?.toISOString() || null}
      expiresAt={contract.expiresAt.toISOString()}
    />
  );
}
