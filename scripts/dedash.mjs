/**
 * Replaces em dashes with punctuation chosen from context rather than a single
 * blunt substitution: a short lead-in becomes a colon, a full clause becomes a
 * comma, and a dash already doing a parenthetical job keeps its pair as commas.
 */
import fs from "node:fs";

const files = process.argv.slice(2);
let total = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  let changed = 0;

  const out = src.replace(/ *— */g, (m, offset, whole) => {
    changed++;
    // Look back to the start of the current sentence / line / string.
    const before = whole.slice(0, offset);
    const start = Math.max(
      before.lastIndexOf(". "),
      before.lastIndexOf("\n"),
      before.lastIndexOf("`"),
      before.lastIndexOf('"'),
      before.lastIndexOf("'"),
      before.lastIndexOf("> "),
    );
    const lead = before.slice(start + 1).replace(/^[\s*|#>-]+/, "");
    // A short lead with no internal comma reads as a label: use a colon.
    if (lead.length > 0 && lead.length <= 46 && !lead.includes(",")) return ": ";
    return ", ";
  });

  if (changed) {
    fs.writeFileSync(file, out);
    total += changed;
    console.log(`  ${String(changed).padStart(3)}  ${file}`);
  }
}
console.log(`\n  ${total} em dashes replaced`);
