import { API_BASE_URL } from "@/lib/api/config"

/**
 * The video a report's QR page offers is stored as the link the lab pasted — normally a
 * Google Drive share link. These helpers decide whether a link is safe to show and
 * where the page's own player loads it from.
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

/** True when the link is a Google Drive file, which the QR page can always play. */
export function isDriveFileLink(value?: string | null): boolean {
  return !!value && isHttpUrl(value) && driveFileId(value) !== null
}

/**
 * The address the QR page's <video> loads a report's video from, or null when there is
 * none to play.
 *
 * Drive refuses a video requested from inside another site, so a Drive file comes
 * through our API, which fetches it server to server. Any other link is taken to point
 * straight at a video file.
 */
export function videoPlaybackUrl(reportId: string, value?: string | null): string | null {
  if (!value || !isHttpUrl(value)) return null
  return isDriveFileLink(value)
    ? `${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/video/stream`
    : value
}
