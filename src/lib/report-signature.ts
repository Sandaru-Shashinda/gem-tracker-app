import defaultSignatureImg from "@/assets/default-signatory-signature.png"

/**
 * The medium and large reports carry two signature fields. The right-hand one is the
 * scanned authorized signature and is fixed; the left-hand one is signed by hand, so
 * only the typed name printed beneath its rule is configurable — it is chosen from the
 * testers in the Report Configuration page and stored on the report as `signedBy`.
 */

/**
 * Printed when a report has no signatory set — reports created before the setting
 * existed, or whose signatory has since been removed — so those certificates keep
 * printing the name they always printed.
 */
export const DEFAULT_SIGNATORY_NAME = "Kishari Dayananda"

/** The default signatory's signature, drawn on the digital copy of reports they sign. */
export const DEFAULT_SIGNATORY_SIGNATURE = defaultSignatureImg

/** The job title under the name. Fixed: it is the certificate's title, not a user role. */
export const SIGNATORY_ROLE = "Consultant Gemologist"

/** `Report.signedBy` as the API returns it, populated with the user's name. */
export interface ReportSignatory {
  _id: string
  name: string
  role?: string
  /** Their signature, as the report's public route returns it. */
  signatureImage?: string
}

/**
 * The signatory's own signature, for the digital copy of a report. A report that names
 * nobody prints the default signatory's name, so it carries that signature too — as
 * does a report naming that signatory before they have uploaded their own. Anyone else
 * without an upload gets none: the field stays blank, as on the paper copy unsigned.
 */
export function signatoryImage(signedBy?: ReportSignatory | string | null): string | undefined {
  if (typeof signedBy !== "object" || !signedBy) return DEFAULT_SIGNATORY_SIGNATURE
  if (signedBy.signatureImage) return signedBy.signatureImage
  return signedBy.name === DEFAULT_SIGNATORY_NAME ? DEFAULT_SIGNATORY_SIGNATURE : undefined
}

/** Reads the name to print from a report's `signedBy`, which may be unset or an id. */
export function signatoryName(signedBy?: ReportSignatory | string | null): string {
  return (typeof signedBy === "object" && signedBy?.name) || DEFAULT_SIGNATORY_NAME
}
