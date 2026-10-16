import Image from "next/image";
import Link from "next/link";
import wordmark from "@/public/images/6818cba7797af.png";

export function Logo({ src, name, className = "" }: { src?: string; name: string; className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center ${className}`} aria-label={`${name} — accueil`}>
      {src ? (
        // Owner-provided logo (URL or uploaded media); dimensions unknown, so a plain img is used.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-9 w-auto sm:h-11" />
      ) : (
        <Image src={wordmark} alt={name} priority className="h-9 w-auto sm:h-11" sizes="140px" />
      )}
    </Link>
  );
}
