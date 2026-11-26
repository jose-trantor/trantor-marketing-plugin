#!/usr/bin/env python3
"""Ajusta una copia del plugin de Claude para probarla contra otro servidor MCP.

    python3 -I dev/dev_plugin.py builds/.dev/claude http://localhost:8001/mcp

- .mcp.json: el servidor `trantor` apunta a la URL dada y envía
  `Authorization: Bearer ${MCP_TOKEN}`. Claude Code expande la variable al
  cargar el plugin, así que el token no se escribe en disco.
- .claude-plugin/plugin.json: el plugin pasa a llamarse `<nombre>-dev` para no
  chocar con el plugin instalado desde el marketplace.

Solo toca la copia que recibe; se niega a modificar la carpeta `claude/` del repo.
"""

import json
import os
import sys

TOKEN_HEADER = "Bearer ${MCP_TOKEN}"


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def main(argv):
    if len(argv) != 3:
        print(f"Uso: {argv[0]} <carpeta-del-plugin> <url-mcp>", file=sys.stderr)
        return 1
    plugin_dir, url = argv[1], argv[2]

    repo_plugin = os.path.realpath("claude")
    if os.path.realpath(plugin_dir) == repo_plugin:
        print("✗ Se niega a modificar claude/: pasa la ruta de una copia", file=sys.stderr)
        return 1

    mcp_path = os.path.join(plugin_dir, ".mcp.json")
    mcp = _load(mcp_path)
    servers = mcp.get("mcpServers", {})
    if "trantor" not in servers:
        print(f"✗ {mcp_path} no define el servidor `trantor`", file=sys.stderr)
        return 1
    server = servers["trantor"]
    server["url"] = url
    server.setdefault("headers", {})["Authorization"] = TOKEN_HEADER
    _save(mcp_path, mcp)

    manifest_path = os.path.join(plugin_dir, ".claude-plugin", "plugin.json")
    manifest = _load(manifest_path)
    if not manifest["name"].endswith("-dev"):
        manifest["name"] += "-dev"
    _save(manifest_path, manifest)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
