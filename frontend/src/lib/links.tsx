/** A website as entered, shown as a link that opens in a new tab. */
export function WebsiteLink({ website }: { website: string | null }) {
  if (!website) return null;
  const href = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      {website}
    </a>
  );
}
