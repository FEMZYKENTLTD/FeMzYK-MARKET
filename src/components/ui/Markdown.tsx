/** Minimal, safe markdown renderer for admin-managed content pages. */
export default function Markdown({ md }: { md: string }) {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      out.push(<h2 key={key++}>{inline(line.slice(3))}</h2>);
      i++;
    } else if (line.startsWith("### ")) {
      out.push(<h3 key={key++}>{inline(line.slice(4))}</h3>);
      i++;
    } else if (line.startsWith("| ")) {
      // table
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^[-:\s]+$/.test(c))) rows.push(cells);
        i++;
      }
      out.push(
        <table key={key++}>
          <thead>
            <tr>
              {rows[0]?.map((c, j) => (
                <th key={j}>{inline(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((r, ri) => (
              <tr key={ri}>
                {r.map((c, j) => (
                  <td key={j}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </ul>
      );
    } else if (line.trim() === "") {
      i++;
    } else {
      // paragraph (collect until blank)
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("|") && !lines[i].startsWith("- ") && !lines[i].startsWith("* ")) {
        para.push(lines[i]);
        i++;
      }
      out.push(<p key={key++}>{inline(para.join(" "))}</p>);
    }
  }

  return <div className="prose-femzyk">{out}</div>;
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    return p;
  });
}
