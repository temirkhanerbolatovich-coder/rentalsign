import Image from "next/image";

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
        <Image
          src="/brand/rentalsign-house-document.png"
          alt=""
          width={56}
          height={56}
          className="absolute max-w-none"
        />
      </span>
      <span>
        RentalSign<span className="text-teal-500">.</span>
      </span>
    </span>
  );
}
