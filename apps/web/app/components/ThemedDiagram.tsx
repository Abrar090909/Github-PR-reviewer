import Image from "next/image";

type Props = {
  src: string;
  srcLight: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  priority?: boolean;
};

/** A diagram in both renderer themes; CSS shows the one that matches the page. */
export default function ThemedDiagram({ src, srcLight, width, height, alt, className = "", priority }: Props) {
  const shared = { width, height, unoptimized: true, priority, loading: priority ? undefined : ("lazy" as const) };
  return (
    <>
      <Image {...shared} src={src} alt={alt} className={`dark-only ${className}`} />
      <Image {...shared} src={srcLight} alt={alt} className={`light-only ${className}`} />
    </>
  );
}
