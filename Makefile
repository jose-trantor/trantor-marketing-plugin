BRANCH    := $(shell git rev-parse --abbrev-ref HEAD)
TIMESTAMP := $(shell git log -1 --format="%cd" --date=format:"%Y%m%dT%H%M%S")

MCP_URL_PROD    := https://skull-api.trantorai.ws/mcp
MCP_URL_STAGING := https://skull-api-staging.trantorai.ws/mcp

# STAGE y MCP_URL: sufijo del zip y URL del MCP que se fija en el paquete de ChatGPT
ifeq ($(BRANCH),staging)
STAGE   := -staging
MCP_URL := $(MCP_URL_STAGING)
else
STAGE   :=
MCP_URL := $(MCP_URL_PROD)
endif

# URL que debe tener claude/.mcp.json en el repo; vacía = rama sin comprobación estricta
ifeq ($(BRANCH),main)
CLAUDE_MCP_EXPECTED := $(MCP_URL_PROD)
else ifeq ($(BRANCH),staging)
CLAUDE_MCP_EXPECTED := $(MCP_URL_STAGING)
else
CLAUDE_MCP_EXPECTED :=
endif

OUT_DIR := builds

# Nombre del zip: builds/trantor-marketing-<plataforma>[-staging]-<timestamp>.zip
dist = $(OUT_DIR)/trantor-marketing-$(1)$(STAGE)-$(TIMESTAMP).zip

CLAUDE_DIST  := $(call dist,claude)
CHATGPT_DIST := $(call dist,chatgpt)
CHATGPT_TMP  := $(OUT_DIR)/.chatgpt

.PHONY: help setup check-mcp claude-build claude-clean chatgpt-build chatgpt-clean

help:
	@echo "Trantor Marketing Plugin"
	@echo ""
	@echo "  setup          - Configura el driver de merge 'ours' en este clon (una vez)"
	@echo "  check-mcp      - Comprueba la URL de claude/.mcp.json para la rama $(BRANCH)"
	@echo "  claude-build   - Crea $(CLAUDE_DIST)"
	@echo "  claude-clean   - Elimina los zips del plugin de Claude"
	@echo "  chatgpt-build  - Crea $(CHATGPT_DIST) (MCP: $(MCP_URL))"
	@echo "  chatgpt-clean  - Elimina los zips del plugin de ChatGPT"

claude-build:
	@echo "→ Generando $(CLAUDE_DIST)..."
	@mkdir -p $(OUT_DIR)
	@rm -f $(CLAUDE_DIST)
	@zip -qr $(CLAUDE_DIST) claude/ -x '*.DS_Store'
	@echo "✓ $(CLAUDE_DIST)"

claude-clean:
	@rm -f $(OUT_DIR)/trantor-marketing-claude-*.zip
	@rmdir $(OUT_DIR) 2>/dev/null || true
	@echo "✓ Zips de Claude eliminados"

chatgpt-build:
	@echo "→ Generando $(CHATGPT_DIST) (MCP: $(MCP_URL))..."
	@mkdir -p $(OUT_DIR)
	@rm -f $(CHATGPT_DIST)
	@rm -rf $(CHATGPT_TMP)
	@cp -R chatgpt $(CHATGPT_TMP)
	@sed 's|$(MCP_URL_PROD)|$(MCP_URL)|g' chatgpt/mcp.json > $(CHATGPT_TMP)/mcp.json
	@grep -qF '"$(MCP_URL)"' $(CHATGPT_TMP)/mcp.json || { \
		echo "✗ chatgpt/mcp.json no contiene $(MCP_URL_PROD); no se puede fijar $(MCP_URL)"; \
		rm -rf $(CHATGPT_TMP); exit 1; }
	@cd $(CHATGPT_TMP) && zip -qr $(CURDIR)/$(CHATGPT_DIST) . -x '*.DS_Store'
	@rm -rf $(CHATGPT_TMP)
	@echo "✓ $(CHATGPT_DIST)"

chatgpt-clean:
	@rm -f $(OUT_DIR)/trantor-marketing-chatgpt-*.zip
	@rmdir $(OUT_DIR) 2>/dev/null || true
	@echo "✓ Zips de ChatGPT eliminados"
