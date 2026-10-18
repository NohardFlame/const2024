#!/usr/bin/env python3
"""Fetch live sheets, parse published stars, run sync, compare constN.json."""
from __future__ import annotations

import json
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "_probe_out" / "sheet_verify"
OUT.mkdir(parents=True, exist_ok=True)


def read_sync_key() -> str:
    for line in (REPO / "admin_auth").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.lower().startswith("sync_key:"):
            return line.split(":", 1)[1].strip()
    raise SystemExit("missing sync_key in admin_auth")


def fetch_url(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "const2024-verify"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read().decode("utf-8-sig")


def fetch_sheet(spreadsheet_id: str, sheet: str) -> str:
    url = (
        "https://docs.google.com/spreadsheets/d/"
        + urllib.parse.quote(spreadsheet_id)
        + "/gviz/tq?tqx=out:csv&sheet="
        + urllib.parse.quote(sheet)
    )
    return fetch_url(url)


def main() -> int:
    meta = json.loads((REPO / "assets/json/classes.json").read_text(encoding="utf-8"))
    sid = meta["spreadsheetId"]

    for c in meta["classes"]:
        cid = c["id"]
        (OUT / f"{cid}_class.csv").write_text(fetch_sheet(sid, c["sheetClass"]), encoding="utf-8")
        (OUT / f"{cid}_ind.csv").write_text(fetch_sheet(sid, c["sheetInd"]), encoding="utf-8")
        print(f"fetched {cid}", flush=True)

    js = r"""
const fs = require("fs");
const vm = require("vm");
const dir = process.argv[2];
const code = fs.readFileSync("assets/js/sheet_import.js", "utf8");
const ctx = { window: {}, console };
vm.runInNewContext(code + "\nthis.SI={parseClassSheetCsv,parseIndSheetCsv,mergeIndSheetIntoGroups};", ctx);
const SI = ctx.SI;
const meta = JSON.parse(fs.readFileSync("assets/json/classes.json", "utf8"));
const out = [];
for (const c of meta.classes) {
  const classCsv = fs.readFileSync(dir + "/" + c.id + "_class.csv", "utf8");
  const indCsv = fs.readFileSync(dir + "/" + c.id + "_ind.csv", "utf8");
  const parsed = SI.parseClassSheetCsv(classCsv);
  const groups = parsed.groups.slice();
  const warn = SI.mergeIndSheetIntoGroups(groups, indCsv);
  out.push({
    id: c.id,
    constFile: c.constFile,
    title: parsed.title,
    groups: groups.map((g) => ({
      starId: g.starId,
      title: g.title,
      content: String(g.content || "").slice(0, 100),
    })),
    warnings: (parsed.warnings || []).concat(warn || []),
  });
}
fs.writeFileSync(dir + "/expected.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
"""
    (OUT / "run_parse.js").write_text(js, encoding="utf-8")
    r = subprocess.run(
        ["node", str(OUT / "run_parse.js"), str(OUT)],
        cwd=str(REPO),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    print(r.stdout)
    if r.returncode:
        print(r.stderr)
        return r.returncode

    expected = json.loads((OUT / "expected.json").read_text(encoding="utf-8"))
    print("\n=== EXPECTED PUBLISHED ===", flush=True)
    for e in expected:
        print(f"{e['id']} ({e['constFile']}): {len(e['groups'])} stars", flush=True)
        for g in e["groups"]:
            print(f"  {g['starId']}: {g['title']!r} | {g['content']!r}", flush=True)
        if e["warnings"]:
            print(f"  warnings: {e['warnings'][:5]}", flush=True)

    key = read_sync_key()
    sync_url = (
        "https://informatics384.ru/const2024/SheetSync.php?key="
        + urllib.parse.quote(key)
    )
    print("\n=== LIVE SYNC (not dry) ===", flush=True)
    sync_body = fetch_url(sync_url)
    sync = json.loads(sync_body)
    (OUT / "sync_report.json").write_text(json.dumps(sync, ensure_ascii=False, indent=2), encoding="utf-8")
    print("ok", sync.get("ok"), "dry", sync.get("dry"), flush=True)
    for rep in sync.get("report", []):
        print(
            f"  {rep.get('id')}: groups={rep.get('groups')} lit={rep.get('lit')} "
            f"updated={rep.get('updated')} placed={rep.get('placed')} cleared={rep.get('cleared')} "
            f"saved={rep.get('saved')} err={rep.get('error')}",
            flush=True,
        )

    print("\n=== COMPARE constN.json ON SERVER ===", flush=True)
    mismatches = 0
    for e in expected:
        name = e["constFile"]
        url = f"https://informatics384.ru/const2024/assets/json/{name}.json"
        data = json.loads(fetch_url(url))
        lit = []
        for v in data.get("vert", []):
            if isinstance(v, list) and len(v) >= 4:
                t, c = str(v[2]), str(v[3])
                if t and c and t != "DELETED" and c != "DELETED":
                    sid = str(v[4]) if len(v) > 4 else ""
                    lit.append({"starId": sid, "title": t, "content": c[:100]})
        exp_ids = sorted(g["starId"] for g in e["groups"])
        got_ids = sorted(x["starId"] for x in lit)
        ok = exp_ids == got_ids and len(lit) == len(e["groups"])
        # also match titles by starId
        by_exp = {g["starId"]: g for g in e["groups"]}
        by_got = {g["starId"]: g for g in lit}
        title_ok = all(
            by_got.get(sid, {}).get("title") == by_exp[sid]["title"] for sid in by_exp
        )
        content_ok = all(
            by_got.get(sid, {}).get("content", "").startswith(by_exp[sid]["content"][:40])
            or by_exp[sid]["content"][:40] in by_got.get(sid, {}).get("content", "")
            for sid in by_exp
        )
        status = "OK" if ok and title_ok else "MISMATCH"
        if not ok or not title_ok:
            mismatches += 1
        print(
            f"{e['id']} {name}: expected={exp_ids} got={got_ids} titles={'ok' if title_ok else 'bad'} "
            f"content={'ok' if content_ok else 'check'} => {status}",
            flush=True,
        )
        if status != "OK":
            print(f"  expected: {e['groups']}", flush=True)
            print(f"  got: {lit}", flush=True)

    print(f"\nVERDICT: {'VERIFIED' if mismatches == 0 else 'NOT VERIFIED'} (mismatches={mismatches})")
    return 0 if mismatches == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
