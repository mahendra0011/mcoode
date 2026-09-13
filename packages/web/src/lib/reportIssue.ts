export function openReportIssue() {
  const body = encodeURIComponent(
    `**Describe the issue:**\n\n\n---\n_App version: ${process.env.NEXT_PUBLIC_APP_VERSION || "unknown"}_\n_URL: ${typeof window !== "undefined" ? window.location.href : ""}_`
  );
  window.open(
    `https://github.com/mahendra0011/mcoode/issues/new?title=${encodeURIComponent("Bug report")}&body=${body}`,
    "_blank"
  );
}
