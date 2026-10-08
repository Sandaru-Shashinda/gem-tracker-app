/**
 * The video a report's QR page offers is stored as the link the lab pasted — normally a
 * Google Drive share link. These helpers decide whether a link is safe to show and
 * whether it can be played in place.
 */

/** True for a well-formed http(s) link; anything else must never reach an href. */
export function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

/** The file id inside a Google Drive link, or null when it is not one. */
function driveFileId(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (!/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/.test(url.hostname)) return null

  // .../file/d/<id>/view is what "Copy link" gives; open?id= and uc?id= are older forms.
  const fromPath = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1]
  return fromPath || url.searchParams.get("id")
}

/**
 * The address that plays a video inside the page, or null when the link can only be
 * opened in a tab of its own. Drive plays a file in place through its /preview address.
 */
export function videoEmbedUrl(value?: string | null): string | null {
  if (!value || !isHttpUrl(value)) return null
  const id = driveFileId(value)
  return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : null
}
