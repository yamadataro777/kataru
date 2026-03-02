export default function ScanLines() {
  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none z-[999]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.08) 2px,
            rgba(0,0,0,0.08) 4px
          )`,
        }}
      />
      <div
        className="fixed left-0 w-full h-1 pointer-events-none z-[998]"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(0,212,255,0.4), transparent)',
          animation: 'scanline-scroll 4s linear infinite',
        }}
      />
    </>
  );
}
