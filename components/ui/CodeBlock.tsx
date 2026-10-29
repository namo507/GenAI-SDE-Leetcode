import { Fragment } from "react";

const KEYWORDS: Record<string, Set<string>> = {
  python: new Set(
    "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(" "),
  ),
  r: new Set("if else repeat while function for in next break TRUE FALSE NULL Inf NaN NA NA_integer_ NA_real_ NA_character_ return library require".split(" ")),
  sql: new Set(
    "select from where group by order having join left right inner outer full cross on as and or not in is null distinct count sum avg min max case when then else end with over partition rows range between preceding following current row limit offset union all insert into values create table primary key integer text real exists coalesce desc asc lag lead rank dense_rank row_number cast date julianday".split(" "),
  ),
};

type Token = { type: "keyword" | "string" | "number" | "comment" | "function" | "plain"; text: string };

const PATTERN = /(#[^\n]*|--[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?L?\b)|([A-Za-z_.][A-Za-z0-9_.]*)/g;

export function tokenize(code: string, language: string): Token[] {
  const lang = language.toLowerCase();
  const keywords = KEYWORDS[lang] ?? KEYWORDS.python!;
  const commentPrefix = lang === "sql" ? "--" : "#";
  const tokens: Token[] = [];
  let last = 0;
  const re = new RegExp(PATTERN.source, "g");
  for (let m = re.exec(code); m !== null; m = re.exec(code)) {
    const start = m.index;
    if (start > last) tokens.push({ type: "plain", text: code.slice(last, start) });
    const [text, comment, str, num, word] = m;
    if (comment !== undefined) {
      if (comment.startsWith(commentPrefix)) tokens.push({ type: "comment", text });
      else {
        // "--" in Python or R, or "#" in SQL: not a comment; emit the first character and rescan.
        tokens.push({ type: "plain", text: text[0]! });
        re.lastIndex = start + 1;
        last = start + 1;
        continue;
      }
    } else if (str !== undefined) tokens.push({ type: "string", text });
    else if (num !== undefined) tokens.push({ type: "number", text });
    else if (word !== undefined) {
      const isKeyword = lang === "sql" ? keywords.has(word.toLowerCase()) : keywords.has(word);
      const isCall = code[start + word.length] === "(";
      tokens.push({ type: isKeyword ? "keyword" : isCall ? "function" : "plain", text });
    }
    last = start + text.length;
  }
  if (last < code.length) tokens.push({ type: "plain", text: code.slice(last) });
  return tokens;
}

/** Read-only code with lightweight syntax coloring. Colors are decoration; meaning never depends on them. */
export function CodeBlock({ code, language, label, className }: { code: string; language: string; label?: string; className?: string }) {
  return (
    <figure className={`m-0 overflow-hidden rounded-[var(--radius-lg)] border border-border ${className ?? ""}`}>
      {label && <figcaption className="border-b border-border bg-surface px-4 py-2 t-label tp-muted">{label}</figcaption>}
      <pre className="m-0 overflow-auto bg-surface-sunken p-4 t-code" tabIndex={0} aria-label={label ? `${label} code` : `${language} code`}>
        <code>
          {tokenize(code, language).map((t, i) =>
            t.type === "plain" ? (
              <Fragment key={i}>{t.text}</Fragment>
            ) : (
              <span key={i} className={`syn-${t.type}`}>
                {t.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </figure>
  );
}
