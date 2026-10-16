import { Fragment } from "react";

const URL_RE = /(https?:\/\/[^\s)]+)/g;

function linkify(line: string) {
  return line.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part.replace(/^https?:\/\//, "")}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/**
 * Minimal, safe rendering of owner-edited text: blank lines separate paragraphs,
 * "## " starts a heading, "- " starts a list item, URLs become links.
 * No HTML is ever interpreted.
 */
export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="prose-leman">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines[0].startsWith("## ")) {
          return (
            <Fragment key={i}>
              <h2>{lines[0].slice(3)}</h2>
              {lines.length > 1 && <p>{linkify(lines.slice(1).join(" "))}</p>}
            </Fragment>
          );
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{linkify(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {linkify(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
