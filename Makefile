.PHONY: help test check chrome firefox dev-chrome dev-firefox clean

help:
	@echo "Available targets:"
	@echo "  make test        Run the test suite"
	@echo "  make check       Check JavaScript syntax and tests"
	@echo "  make chrome      Build extension.zip for Chrome"
	@echo "  make firefox     Build a Firefox package with web-ext"
	@echo "  make dev-chrome  Prepare dist/chrome for loading unpacked"
	@echo "  make dev-firefox Launch Firefox with web-ext"
	@echo "  make clean       Remove generated packages and builds"

test:
	npm test --prefix tests

check: test
	@for file in $$(rg --files src -g '*.js'); do \
		node --check "$$file"; \
	done

chrome:
	./chrome.sh

firefox:
	./firefox.sh

dev-chrome:
	./dev.sh chrome

dev-firefox:
	./dev.sh firefox

clean:
	rm -rf dist extension.zip src/manifest.json web-ext-artifacts
