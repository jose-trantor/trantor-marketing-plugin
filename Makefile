BRANCH    := $(shell git rev-parse --abbrev-ref HEAD)
TIMESTAMP := $(shell git log -1 --format="%cd" --date=format:"%Y%m%dT%H%M%S")

ifeq ($(BRANCH),staging)
DIST := trantor-marketing-staging-$(TIMESTAMP).zip
else
DIST := trantor-marketing-$(TIMESTAMP).zip
endif

.PHONY: help build clean

help:
	@echo "Trantor Marketing Plugin"
	@echo ""
	@echo "  build   - Crea el zip del plugin (rama: $(BRANCH))"
	@echo "  clean   - Elimina los zips generados"

build:
	@echo "→ Generando $(DIST)..."
	@zip -r $(DIST) claude/ .claude-plugin/ README.md
	@echo "✓ $(DIST)"

clean:
	@rm -f trantor-marketing-*.zip
	@echo "✓ Zips eliminados"
