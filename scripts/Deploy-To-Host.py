#!/usr/bin/env python3
"""
Deploy repo to informatics384.ru via FTP.
Credentials from gitignored ssh_auth (never printed).
Default remote: /domains/informatics384.ru/public_html/const2024
"""
from __future__ import annotations

import argparse
import ftplib
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEFAULT_REMOTE = "/domains/informatics384.ru/public_html/const2024"

INCLUDE_ROOT = [
    "index.html",
    "trace.html",
    "trace.php",
    "add_new_star.html",
    "add_new_star.php",
    "settings.php",
    "login.php",
    "logout.php",
    "AdminAuth.php",
    "style.css",
    "JSONSaver.php",
    "AssetSaver.php",
    "SheetProxy.php",
    "SheetSync.php",
    "views",
    "assets",
    "docs",
]

SKIP_NAMES = {
    "ssh_auth",
    "sync_auth",
    "admin_auth",
    ".git",
    "scripts",
    "node_modules",
    ".cursor",
    "__pycache__",
}


def read_auth() -> tuple[str, str]:
    path = REPO / "ssh_auth"
    if not path.is_file():
        raise SystemExit(f"Missing {path} — see docs/deploy.md")
    login = password = None
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.lower().startswith("login:"):
            login = line.split(":", 1)[1].strip()
        elif line.lower().startswith("password:"):
            password = line.split(":", 1)[1].strip()
    if not login or not password:
        raise SystemExit("ssh_auth must contain login: and password:")
    return login, password


def ensure_dir(ftp: ftplib.FTP, remote_dir: str) -> None:
    parts = [p for p in remote_dir.strip("/").split("/") if p]
    path = ""
    for part in parts:
        path += "/" + part
        try:
            ftp.mkd(path)
        except ftplib.error_perm:
            pass


def upload_file(ftp: ftplib.FTP, local: Path, remote: str) -> None:
    ensure_dir(ftp, str(Path(remote).parent).replace("\\", "/"))
    with local.open("rb") as fh:
        ftp.storbinary(f"STOR {remote}", fh)
    print(f"upload {remote}", flush=True)


def upload_tree(ftp: ftplib.FTP, local: Path, remote: str) -> None:
    if local.is_file():
        upload_file(ftp, local, remote)
        return
    ensure_dir(ftp, remote)
    for child in sorted(local.iterdir()):
        if child.name in SKIP_NAMES:
            continue
        # Skip dotfiles/dirs except Apache .htaccess needed for views/
        if child.name.startswith(".") and child.name != ".htaccess":
            continue
        upload_tree(ftp, child, f"{remote.rstrip('/')}/{child.name}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--remote-root", default=DEFAULT_REMOTE)
    parser.add_argument("--host", default="informatics384.ru")
    args = parser.parse_args()

    login, password = read_auth()
    remote_root = args.remote_root.rstrip("/")

    ftp = ftplib.FTP(timeout=120)
    ftp.connect(args.host, 21)
    ftp.login(login, password)
    ftp.set_pasv(True)
    print(f"FTP ok as {login} @ {args.host}", flush=True)
    print(f"Remote root: {remote_root}", flush=True)

    ensure_dir(ftp, remote_root)
    for name in INCLUDE_ROOT:
        local = REPO / name
        if not local.exists():
            print(f"skip missing {name}", flush=True)
            continue
        upload_tree(ftp, local, f"{remote_root}/{name}")

    ensure_dir(ftp, f"{remote_root}/assets/archive")
    ftp.quit()
    print("Deploy done: https://informatics384.ru/const2024/", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
