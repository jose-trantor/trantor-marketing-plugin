BRANCH    := $(shell git rev-parse --abbrev-ref HEAD)
TIMESTAMP := $(shell git log -1 --format="%cd" --date=format:"%Y%m%dT%H%M%S")

MCP_URL_PROD    := https://skull-api.trantorai.ws/mcp
MCP_URL_STAGING := https://skull-api-staging.trantorai.ws/mcp

ifeq ($(BRANCH),staging)
STAGE   := -staging
MCP_URL := $(MCP_URL_STAGING)
else
STAGE   :=
MCP_URL := $(MCP_URL_PROD)
endif

# Nombre del zip: trantor-marketing-<plataforma>[-staging]-<timestamp>.zip
dist = trantor-marketing-$(1)$(STAGE)-$(TIMESTAMP).zip

CLAUDE_DIST  := $(call dist,claude)
CHATGPT_DIST := $(call dist,chatgpt)
BUILD_DIR    := build

.PHONY: help claude-build claude-clean chatgpt-build chatgpt-clean

help:
	@echo "Trantor Marketing Plugin"
	@echo ""
	@echo "  claude-build   - Crea $(CLAUDE_DIST) (rama: $(BRANCH))"
	@echo "  claude-clean   - Elimina los zips del plugin de Claude"
	@echo "  chatgpt-build  - Crea $(CHATGPT_DIST) (rama: $(BRANCH), MCP: $(MCP_URL))"
	@echo "  chatgpt-clean  - Elimina los zips del plugin de ChatGPT"

claude-build:
	@echo "→ Generando $(CLAUDE_DIST)..."
	@rm -f $(CLAUDE_DIST)
	@zip -qr $(CLAUDE_DIST) claude/ .claude-plugin/ README.md -x '*.DS_Store'
	@echo "✓ $(CLAUDE_DIST)"

claude-clean:
	@rm -f trantor-marketing-claude-*.zip
	@echo "✓ Zips de Claude eliminados"

chatgpt-build:
	@echo "→ Generando $(CHATGPT_DIST) (MCP: $(MCP_URL))..."
	@rm -f $(CHATGPT_DIST)
	@rm -rf $(BUILD_DIR)/chatgpt
	@mkdir -p $(BUILD_DIR)
	@cp -R chatgpt $(BUILD_DIR)/chatgpt
	@sed 's|$(MCP_URL_PROD)|$(MCP_URL)|g' chatgpt/mcp.json > $(BUILD_DIR)/chatgpt/mcp.json
	@grep -qF '"$(MCP_URL)"' $(BUILD_DIR)/chatgpt/mcp.json || { \
		echo "✗ chatgpt/mcp.json no contiene $(MCP_URL_PROD); no se puede fijar $(MCP_URL)"; \
		rm -rf $(BUILD_DIR); exit 1; }
	@cd $(BUILD_DIR)/chatgpt && zip -qr $(CURDIR)/$(CHATGPT_DIST) . -x '*.DS_Store'
	@rm -rf $(BUILD_DIR)
	@echo "✓ $(CHATGPT_DIST)"

chatgpt-clean:
	@rm -f trantor-marketing-chatgpt-*.zip
	@echo "✓ Zips de ChatGPT eliminados"
