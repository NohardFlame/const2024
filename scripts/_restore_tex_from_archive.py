"""Restore tex0..2 from pre-save archive snapshots on the host."""
from __future__ import annotations

import ftplib
import json
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def read_auth() -> tuple[str, str]:
    login = password = None
    for line in (REPO / "ssh_auth").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.lower().startswith("login:"):
            login = line.split(":", 1)[1].strip()
        elif line.lower().startswith("password:"):
            password = line.split(":", 1)[1].strip()
    if not login or not password:
        raise SystemExit("bad ssh_auth")
    return login, password


def main() -> None:
    req = urllib.request.Request(
        "https://informatics384.ru/const2024/AssetSaver.php",
        data=json.dumps({"action": "list_archive"}).encode(),
        headers={"Content-Type": "application/json"},
    )
    items = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())["items"]
    # latest save-archive per fromIndex 0..2 (list is newest-first)
    picked: dict[int, dict] = {}
    for it in items:
        idx = int(it.get("fromIndex", -1))
        if idx in (0, 1, 2) and it.get("reason") == "save" and it.get("hasTex") and idx not in picked:
            picked[idx] = it
    print("picked", {k: v["id"] for k, v in picked.items()})
    if len(picked) < 3:
        raise SystemExit("need archives for const0..2")

    login, password = read_auth()
    ftp = ftplib.FTP(timeout=120)
    ftp.connect("informatics384.ru", 21)
    ftp.login(login, password)
    ftp.set_pasv(True)
    root = "/domains/informatics384.ru/public_html/const2024"

    for idx, it in sorted(picked.items()):
        url = "https://informatics384.ru/const2024/" + it["texUrl"]
        data = urllib.request.urlopen(url, timeout=60).read()
        if data[:8] != b"\x89PNG\r\n\x1a\n":
            raise SystemExit(f"bad png for {idx}")
        # also refresh local copy
        local = REPO / "assets" / "textures" / f"tex{idx}.png"
        local.write_bytes(data)
        remote = f"{root}/assets/textures/tex{idx}.png"
        ftp.storbinary(f"STOR {remote}", __import__("io").BytesIO(data))
        print(f"restored tex{idx}.png ({len(data)} bytes) from {it['id']}")

    # deploy editor fix
    for rel in ("trace.html", "assets/js/trace_editor.js"):
        local = REPO / rel
        remote = f"{root}/{rel.replace(chr(92), '/')}"
        with local.open("rb") as fh:
            ftp.storbinary(f"STOR {remote}", fh)
        print("uploaded", rel)

    ftp.quit()
    print("done")


if __name__ == "__main__":
    main()
