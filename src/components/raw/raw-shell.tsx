/* eslint-disable @next/next/no-html-link-for-pages -- the raw view is plain HTML on purpose (no client navigation). */
import type { PdfOption } from "@/components/site-header";

/**
 * "Raw" display mode: plain HTML with browser-default styling, in the spirit of bellard.org.
 * No grid, no images, no JS — just text and links.
 */
export function RawShell({ pdf, children }: { pdf: PdfOption[]; children: React.ReactNode }) {
  return (
    <div className="raw-view">
      <style>{`
        html, body { background: #fff !important; }
        .raw-view { background:#fff; color:#000; font-family: "Times New Roman", Times, serif; font-size: 16px; line-height: 1.25; padding: 8px; min-height: 100vh; }
        .raw-view a { color: #0000ee; text-decoration: underline; }
        .raw-view a:visited { color: #551a8b; }
        .raw-view h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
        .raw-view h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; }
        .raw-view h3 { font-size: 1.17em; font-weight: bold; margin: 1em 0; }
        .raw-view p { margin: 1em 0; }
        .raw-view ul { list-style: disc; padding-left: 40px; margin: 1em 0; }
        .raw-view ol { list-style: decimal; padding-left: 40px; margin: 1em 0; }
        .raw-view li { margin: 0.2em 0; }
        .raw-view hr { border: 0; border-top: 1px solid #888; margin: 1em 0; }
        .raw-view pre, .raw-view code { font-family: "Courier New", monospace; }
        .raw-view table { border-collapse: collapse; }
        .raw-view td, .raw-view th { padding: 1px 8px 1px 0; text-align: left; vertical-align: top; }
        .raw-view small { font-size: 0.83em; }
        .raw-view form { display: inline; }
        .raw-view input { font: inherit; border: 1px solid #767676; padding: 1px 2px; }
        .raw-view button { font: inherit; }
      `}</style>
      {children}
      <hr />
      <p>
        <small>
          [<a href="/?view=raw">projets</a>] [<a href="/now?view=raw">now</a>] [<a href="/stories?view=raw">stories</a>]{" "}
          {pdf.map((o) => (
            <span key={o.href}>
              [<a href={o.href}>pdf : {o.label.toLowerCase()}</a>]{" "}
            </span>
          ))}
          [<a href="/api/v1">api</a>] [<a href="?view=accura">version normale</a>]
        </small>
      </p>
    </div>
  );
}
