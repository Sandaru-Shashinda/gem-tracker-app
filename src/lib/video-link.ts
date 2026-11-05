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

/**
 * The address of the video file itself, for a <video> element on our own page, or null
 * when the link is not a Drive file. Drive's /preview player is a page of Drive's — on a
 * phone a tap in it can carry the visitor off to Drive — so the file is played natively
 * where possible and /preview is only the fallback.
 *
 * With VITE_GOOGLE_API_KEY set the file comes through the Drive API, which is the
 * supported route; without it, through Drive's public download address.
 */
export function videoStreamUrl(value?: string | null): string | null {
  if (!value || !isHttpUrl(value)) return null
  const id = driveFileId(value)
  if (!id) return null
  const key = import.meta.env.VITE_GOOGLE_API_KEY
  return key
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(key)}`
    : `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`
}
