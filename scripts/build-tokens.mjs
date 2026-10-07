// Compiles design-system/tokens.json into app/tokens.css.
// The output mirrors the Design System artifact's compiled tokens.css so the app
// and the published system never drift: same custom property names, same theme rules.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "design-system/tokens.json"), "utf8"));

const themes = tokens.color.themes.map((t) => t.id);
const [firstTheme, ...otherThemes] = themes;

const resolveColor = (value) => {
  const alias = /^\{([A-Za-z0-9_.-]+)\}$/.exec(value);
  return alias ? `var(--${alias[1]})` : value;
};
const themed = (token, theme) => {
  if (typeof token.value === "string") return theme === firstTheme ? token.value : undefined;
  return token.value[theme] ?? (theme === firstTheme ? undefined : token.value[firstTheme]);
};

const themedFamilies = [tokens.color.tokens, tokens.shadow?.tokens ?? []];
const block = (theme) =>
  themedFamilies
    .flat()
    .map((t) => {
      const v = themed(t, theme);
      return v === undefined ? null : `  --${t.name}: ${resolveColor(v)};`;
    })
    .filter(Boolean)
    .join("\n");

const plainFamilies = Object.entries(tokens).filter(
  ([key, fam]) => !["name", "version", "color", "type", "shadow", "meta"].includes(key) && fam && Array.isArray(fam.tokens),
);
const plain = plainFamilies.flatMap(([, fam]) => fam.tokens.map((t) => `  --${t.name}: ${t.value};`)).join("\n");
const families = Object.entries(tokens.type.families)
  .map(([key, stack]) => `  --font-${key}: ${stack};`)
  .join("\n");

const typeClasses = tokens.type.groups
  .flatMap((g) =>
    g.styles.map((s) => {
      const fam = s.family ?? g.family;
      const decls = [
        `font-family: var(--font-${fam})`,
        `font-size: ${s.fontSize}`,
        s.lineHeight ? `line-height: ${s.lineHeight}` : null,
        s.fontWeight ? `font-weight: ${s.fontWeight}` : null,
        s.letterSpacing ? `letter-spacing: ${s.letterSpacing}` : null,
      ].filter(Boolean);
      return `.${s.name} { ${decls.join("; ")}; }`;
    }),
  )
  .join("\n");

const css = `/* Generated from design-system/tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */
:root, [data-theme="${firstTheme}"] {
  color-scheme: light;
${block(firstTheme)}
}
${otherThemes
  .map(
    (t) => `[data-theme="${t}"] {
  color-scheme: ${t};
${block(t)}
}
@media (prefers-color-scheme: ${t}) {
  :root:not([data-theme]) {
    color-scheme: ${t};
${block(t).replace(/^/gm, "  ")}
  }
}`,
  )
  .join("\n")}
:root {
${plain}
${families}
}
${typeClasses}
`;

writeFileSync(join(root, "app/tokens.css"), css);
console.log(`tokens.css: ${tokens.color.tokens.length} colors x ${themes.length} themes, ${plain.split("\n").length} scale tokens`);
