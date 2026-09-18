import Image from "next/image";
import Link from "next/link";

/**
 * The BiteBox lockup.
 *
 * The supplied artwork is a stacked logo, which does not fit a 64px-tall
 * header, so the mark and the wordmark are used as separate pieces and set
 * side by side here. `public/bitebox-lockup.png` keeps the original stacked
 * arrangement for places with room for it.
 *
 * Each piece ships in two colourways because the brand green (#014425) is
 * close to black and all but disappears on the dark background.
 */
export function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="BiteBox — home"
      className="brand-mark group flex items-center gap-2.5"
    >
      <span className="brand-mark-art relative block h-9 w-13 shrink-0">
        <Image
          src="/bitebox-mark.png"
          alt=""
          width={303}
          height={208}
          priority
          className="h-9 w-auto dark:hidden"
        />
        <Image
          src="/bitebox-mark-dark.png"
          alt=""
          width={303}
          height={208}
          priority
          className="absolute inset-0 hidden h-9 w-auto dark:block"
        />
      </span>

      {/* Below `sm` the mark carries the brand on its own: the full
          lockup plus the nav overflows a 390px screen. */}
      <span className="brand-mark-word relative hidden h-5 w-23.75 sm:block">
        <Image
          src="/bitebox-wordmark.png"
          alt=""
          width={539}
          height={114}
          priority
          className="h-5 w-auto dark:hidden"
        />
        <Image
          src="/bitebox-wordmark-dark.png"
          alt=""
          width={539}
          height={114}
          priority
          className="absolute inset-0 hidden h-5 w-auto dark:block"
        />
      </span>
    </Link>
  );
}
