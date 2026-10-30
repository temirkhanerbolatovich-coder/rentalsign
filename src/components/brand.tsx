import Image from "next/image";
export function Brand() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <Image
        src="/brand/qutty-qonaq.png"
        alt=""
        preload
        width={64}
        height={64}
        className="rounded-xl"
      />
      <span className="text-base leading-tight">
        Qutty Qonaq
        <span className="block text-[9px] font-medium tracking-[.2em] text-amber-800">
          APARTMENTS
        </span>
      </span>
    </span>
  );
}
