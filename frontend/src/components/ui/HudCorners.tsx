interface HudCornersProps {
  color?: 'cyan' | 'magenta' | 'lime';
}

export default function HudCorners({ color = 'cyan' }: HudCornersProps) {
  const borderColor = {
    cyan: 'border-neon-cyan',
    magenta: 'border-neon-magenta',
    lime: 'border-neon-lime',
  }[color];

  return (
    <>
      <span className={`absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 ${borderColor} opacity-40`} />
      <span className={`absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 ${borderColor} opacity-40`} />
      <span className={`absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 ${borderColor} opacity-40`} />
      <span className={`absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 ${borderColor} opacity-40`} />
    </>
  );
}
