#!/usr/bin/env python3
"""Cliente MCP mínimo (streamable HTTP) para los comandos de desarrollo.

Solo usa la librería estándar. Lo llaman los targets de development.mk:

    python3 -I dev/mcp_client.py ping     --url URL
    python3 -I dev/mcp_client.py tools    --url URL
    python3 -I dev/mcp_client.py contract --url URL --tools-file dev/mcp-tools.txt

El token Bearer se lee de --token o de la variable de entorno MCP_TOKEN.
Termina con código 0 si todo va bien y 1 si hay cualquier error.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

PROTOCOL_VERSION = "2025-06-18"
CLIENT_INFO = {"name": "trantor-marketing-dev", "version": "0.1.0"}
TIMEOUT = 30


class McpError(Exception):
    """Error que se muestra tal cual al usuario."""


class McpSession:
    def __init__(self, url, token):
        self.url = url
        self.token = token
        self.session_id = None
        self.protocol_version = None
        self._next_id = 0

    # --- transporte ---------------------------------------------------------

    def _headers(self):
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "Authorization": f"Bearer {self.token}",
        }
        if self.session_id:
            headers["Mcp-Session-Id"] = self.session_id
        if self.protocol_version:
            headers["MCP-Protocol-Version"] = self.protocol_version
        return headers

    def _open(self, method, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.url, data=data, method=method, headers=self._headers())
        try:
            return urllib.request.urlopen(req, timeout=TIMEOUT)
        except urllib.error.HTTPError as e:
            raise McpError(_describe_http_error(self.url, e)) from None
        except urllib.error.URLError as e:
            raise McpError(f"No se pudo conectar a {self.url}: {e.reason}") from None
        except (TimeoutError, OSError) as e:
            raise McpError(f"No se pudo conectar a {self.url}: {e}") from None

    def request(self, method, params=None):
        self._next_id += 1
        msg_id = self._next_id
        body = {"jsonrpc": "2.0", "id": msg_id, "method": method}
        if params is not None:
            body["params"] = params
        with self._open("POST", body) as resp:
            if self.session_id is None:
                self.session_id = resp.headers.get("Mcp-Session-Id")
            message = _read_response(resp, msg_id)
        if "error" in message:
            err = message["error"]
            raise McpError(f"Error JSON-RPC en {method}: {err.get('message')} (código {err.get('code')})")
        return message.get("result", {})

    def notify(self, method):
        with self._open("POST", {"jsonrpc": "2.0", "method": method}):
            pass

    def close(self):
        """Cierra la sesión en el servidor; si falla, no importa."""
        if not self.session_id:
            return
        try:
            with self._open("DELETE"):
                pass
        except McpError:
            pass

    # --- operaciones MCP ----------------------------------------------------

    def initialize(self):
        result = self.request(
            "initialize",
            {"protocolVersion": PROTOCOL_VERSION, "capabilities": {}, "clientInfo": CLIENT_INFO},
        )
        self.protocol_version = result.get("protocolVersion", PROTOCOL_VERSION)
        self.notify("notifications/initialized")
        return result

    def list_tools(self):
        tools, cursor = [], None
        while True:
            result = self.request("tools/list", {"cursor": cursor} if cursor else {})
            tools.extend(result.get("tools", []))
            cursor = result.get("nextCursor")
            if not cursor:
                return tools


def _describe_http_error(url, e):
    body = e.read().decode("utf-8", "replace")
    if e.code == 401:
        try:
            description = json.loads(body).get("error_description")
        except ValueError:
            description = None
        description = description or e.headers.get("WWW-Authenticate") or "sin detalle"
        return (
            f"El servidor {url} rechazó el token (401): {description}.\n"
            "  Genera uno nuevo con `make mcp-token USER_ID=<id>` y expórtalo como MCP_TOKEN."
        )
    snippet = body.strip().replace("\n", " ")[:300]
    return f"El servidor {url} respondió HTTP {e.code}: {snippet or e.reason}"


def _read_response(resp, msg_id):
    """Devuelve el mensaje JSON-RPC con id == msg_id, venga como JSON o como SSE."""
    content_type = resp.headers.get("Content-Type", "")
    if "text/event-stream" in content_type:
        for message in _iter_sse(resp):
            if isinstance(message, dict) and message.get("id") == msg_id:
                return message
        raise McpError("El stream SSE terminó sin respuesta del servidor")
    raw = resp.read().decode("utf-8")
    try:
        message = json.loads(raw)
    except ValueError:
        raise McpError(f"Respuesta no JSON del servidor: {raw[:200]}") from None
    if isinstance(message, list):  # batch
        message = next((m for m in message if m.get("id") == msg_id), {})
    return message


def _iter_sse(resp):
    data_lines = []
    for raw_line in resp:
        line = raw_line.decode("utf-8").rstrip("\r\n")
        if line.startswith("data:"):
            data_lines.append(line[5:].lstrip())
        elif line == "" and data_lines:
            try:
                yield json.loads("\n".join(data_lines))
            except ValueError:
                pass
            data_lines = []
    if data_lines:
        try:
            yield json.loads("\n".join(data_lines))
        except ValueError:
            pass


def _first_line(text):
    for line in (text or "").strip().splitlines():
        if line.strip():
            return line.strip()
    return ""


def _read_tools_file(path):
    names = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            name = line.split("#", 1)[0].strip()
            if name:
                names.append(name)
    return names


# --- comandos ---------------------------------------------------------------


def cmd_ping(session, args):
    result = session.initialize()
    info = result.get("serverInfo", {})
    print(f"✓ {session.url}")
    print(f"  Servidor:  {info.get('name', '?')} {info.get('version', '')}".rstrip())
    print(f"  Protocolo: {session.protocol_version}")


def cmd_tools(session, args):
    session.initialize()
    tools = sorted(session.list_tools(), key=lambda t: t["name"])
    width = max((len(t["name"]) for t in tools), default=0)
    for tool in tools:
        print(f"  {tool['name']:<{width}}  {_first_line(tool.get('description'))}")
    print(f"\n{len(tools)} tools en {session.url}")


def cmd_contract(session, args):
    try:
        required = _read_tools_file(args.tools_file)
    except OSError as e:
        raise McpError(f"No se pudo leer {args.tools_file}: {e}") from None
    session.initialize()
    available = {t["name"] for t in session.list_tools()}
    missing = [name for name in required if name not in available]
    extra = sorted(available - set(required))
    if extra:
        print(f"⚠ {len(extra)} tools del servidor no están en {args.tools_file} (no es un error):")
        for name in extra:
            print(f"    {name}")
    if missing:
        for name in missing:
            print(f"✗ {name}: está en {args.tools_file} pero el servidor no la expone")
        raise McpError(f"Faltan {len(missing)} de {len(required)} tools en {session.url}")
    print(f"✓ Las {len(required)} tools de {args.tools_file} existen en {session.url}")


COMMANDS = {"ping": cmd_ping, "tools": cmd_tools, "contract": cmd_contract}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Cliente MCP mínimo para desarrollo")
    parser.add_argument("command", choices=sorted(COMMANDS))
    parser.add_argument("--url", required=True, help="URL del servidor MCP")
    parser.add_argument("--token", default=os.environ.get("MCP_TOKEN"), help="Token Bearer (por defecto, $MCP_TOKEN)")
    parser.add_argument("--tools-file", default="dev/mcp-tools.txt", help="Lista de tools requeridas (contract)")
    args = parser.parse_args(argv)

    if not args.token:
        print("✗ Falta el token: pasa --token o exporta MCP_TOKEN (make mcp-token USER_ID=<id>)", file=sys.stderr)
        return 1

    session = McpSession(args.url, args.token)
    try:
        COMMANDS[args.command](session, args)
    except McpError as e:
        print(f"✗ {e}", file=sys.stderr)
        return 1
    finally:
        session.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
