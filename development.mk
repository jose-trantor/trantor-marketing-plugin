# Comandos de desarrollo del servidor MCP de Trantor.
# Incluido desde el Makefile, después de MCP_URL_PROD y MCP_URL_STAGING.
#
# Variables:
#   MCP_TARGET    local (por defecto) | staging | prod
#   MCP_DEV_URL   URL del MCP; si se pasa, manda sobre MCP_TARGET
#   MCP_TOKEN     token Bearer (aud=mcp); mejor con `export MCP_TOKEN=...`
#   SKULL_API_DIR clon de skull-api para `mcp-token` (por defecto ../skull-api)
#   USER_ID       usuario para el que `mcp-token` genera el token
#
# Nunca modifica claude/.mcp.json ni chatgpt/mcp.json: todo lo generado
# queda en builds/.dev/, que git ignora.

MCP_TARGET    ?= local
MCP_URL_LOCAL ?= http://localhost:8001/mcp
SKULL_API_DIR ?= ../skull-api

MCP_TARGETS := local staging prod
MCP_TARGET_URL_local   := $(MCP_URL_LOCAL)
MCP_TARGET_URL_staging := $(MCP_URL_STAGING)
MCP_TARGET_URL_prod    := $(MCP_URL_PROD)

MCP_DEV_URL ?= $(MCP_TARGET_URL_$(MCP_TARGET))

DEV_DIR        := $(OUT_DIR)/.dev
DEV_PLUGIN_DIR := $(DEV_DIR)/claude
MCP_CLIENT     := python3 -I dev/mcp_client.py
MCP_TOOLS_FILE := dev/mcp-tools.txt

# Se expanden dentro de las recetas, así que solo afectan a los targets de
# desarrollo: un MCP_TARGET erróneo no rompe claude-build ni chatgpt-build.
check_mcp_target = $(if $(filter $(MCP_TARGET),$(MCP_TARGETS)),,$(error MCP_TARGET='$(MCP_TARGET)' no es válido; usa uno de: $(MCP_TARGETS)))
check_mcp_token  = $(if $(MCP_TOKEN),,$(error Falta MCP_TOKEN. Genera uno con `make mcp-token USER_ID=<id>` y expórtalo con `export MCP_TOKEN=...`))

.PHONY: help-dev mcp-token mcp-ping mcp-tools mcp-contract dev-plugin dev-claude dev-clean

help-dev:
	@echo ""
	@echo "Desarrollo del MCP (MCP_TARGET=$(MCP_TARGET) → $(MCP_DEV_URL))"
	@echo ""
	@echo "  mcp-token      - Genera un token MCP con skull-api (USER_ID=<id>; SKULL_API_DIR=$(SKULL_API_DIR))"
	@echo "  mcp-ping       - Comprueba que el servidor MCP responde y acepta MCP_TOKEN"
	@echo "  mcp-tools      - Lista las tools que expone el servidor MCP"
	@echo "  mcp-contract   - Comprueba que el servidor expone las tools de $(MCP_TOOLS_FILE)"
	@echo "  dev-plugin     - Genera $(DEV_PLUGIN_DIR) apuntando al servidor MCP"
	@echo "  dev-claude     - Abre Claude Code con el plugin de $(DEV_PLUGIN_DIR)"
	@echo "  dev-clean      - Elimina $(DEV_DIR)"
	@echo ""
	@echo "  Servidor: MCP_TARGET=local|staging|prod o MCP_DEV_URL=<url>"

mcp-token:
	$(check_mcp_target)
	@[ -n "$(USER_ID)" ] || { echo "✗ Falta USER_ID: make mcp-token USER_ID=<id>"; exit 1; }
	@[ "$(MCP_TARGET)" != "prod" ] || { echo "✗ No se generan tokens de producción en local; usa MCP_TARGET=local o staging"; exit 1; }
	@[ -d "$(SKULL_API_DIR)" ] || { echo "✗ No se encuentra skull-api en $(SKULL_API_DIR); indica la ruta con SKULL_API_DIR=<ruta>"; exit 1; }
	@out=$$($(MAKE) -C "$(SKULL_API_DIR)" --no-print-directory generate-token-mcp USER_ID="$(USER_ID)" \
		$(if $(filter staging,$(MCP_TARGET)),ENV=staging,) MAKEFLAGS= 2>&1); status=$$?; \
	echo "$$out"; \
	[ $$status -eq 0 ] || exit $$status; \
	token=$$(echo "$$out" | grep -E '^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$$' | head -1); \
	[ -n "$$token" ] || { echo "✗ No se encontró el token en la salida de skull-api"; exit 1; }; \
	echo "Para usarlo en esta terminal:"; \
	echo ""; \
	echo "  export MCP_TOKEN=$$token"

mcp-ping:
	$(check_mcp_target)
	$(check_mcp_token)
	@$(MCP_CLIENT) ping --url "$(MCP_DEV_URL)"

mcp-tools:
	$(check_mcp_target)
	$(check_mcp_token)
	@$(MCP_CLIENT) tools --url "$(MCP_DEV_URL)"

mcp-contract:
	$(check_mcp_target)
	$(check_mcp_token)
	@$(MCP_CLIENT) contract --url "$(MCP_DEV_URL)" --tools-file "$(MCP_TOOLS_FILE)"

dev-plugin:
	$(check_mcp_target)
	@rm -rf $(DEV_PLUGIN_DIR)
	@mkdir -p $(DEV_DIR)
	@cp -R claude $(DEV_PLUGIN_DIR)
	@python3 -I dev/dev_plugin.py "$(DEV_PLUGIN_DIR)" "$(MCP_DEV_URL)"
	@echo "✓ $(DEV_PLUGIN_DIR) → $(MCP_DEV_URL)"

dev-claude:
	$(check_mcp_token)
	@$(MAKE) --no-print-directory dev-plugin
	@echo "→ Abriendo Claude Code con $(DEV_PLUGIN_DIR)..."
	@claude --plugin-dir $(DEV_PLUGIN_DIR)

dev-clean:
	@rm -rf $(DEV_DIR)
	@echo "✓ $(DEV_DIR) eliminado"
