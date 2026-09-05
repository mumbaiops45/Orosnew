import { splitLastWord } from "@/lib/highlight";

/** Lilac lead, flame last word — the shared title treatment for banner/showreel copy. */
export default function TwoToneHeading({
  text,
  as: As = "h2",
  className = "",
  ...props
}) {
  if (!text) return null;
  const { lead, tail } = splitLastWord(text);
  return (
    <As className={className} {...props}>
      {lead && <span className="text-ink">{lead} </span>}
      <span className="text-flame">{tail}</span>
    </As>
  );
}
