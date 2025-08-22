.PHONY: help dev web web-test test lint fmt clean

help:
	@echo "Targets: dev, test, lint, fmt, clean"
	@echo "- dev: run local app (python if src/main.py exists)"
	@echo "- web: serve ./web on http://localhost:8000"
	@echo "- web-test: run Node unit tests for web core"
	@echo "- test: run tests (pytest if available)"
	@echo "- lint: run ruff/eslint if installed"
	@echo "- fmt: run black/prettier if installed"
	@echo "- clean: remove caches"

dev:
	@if [ -f src/main.py ]; then \
		python3 -m src.main; \
	else \
		echo "No src/main.py found. Create it to run the app."; \
	fi

web:
	@echo "Serving ./web at http://localhost:8000 (Ctrl+C to stop)"; \
	python3 -m http.server 8000 -d web

web-test:
	@if command -v node >/dev/null 2>&1; then \
		node web/tests/run.mjs; \
	else \
		echo "Node.js not found. Install Node to run web tests."; \
		exit 1; \
	fi

test:
	@if command -v pytest >/dev/null 2>&1; then \
		pytest -q; \
	else \
		echo "pytest not found. Install with 'pip install pytest' or use your test runner."; \
	fi

lint:
	@set -e; \
	if command -v ruff >/dev/null 2>&1; then ruff check src tests || true; else echo "ruff not found"; fi; \
	if command -v eslint >/dev/null 2>&1; then eslint . || true; else echo "eslint not found"; fi

fmt:
	@set -e; \
	if command -v black >/dev/null 2>&1; then black src tests || true; else echo "black not found"; fi; \
	if command -v prettier >/dev/null 2>&1; then prettier -w . || true; else echo "prettier not found"; fi

clean:
	@find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	@find . -type d -name ".pytest_cache" -prune -exec rm -rf {} +
	@find . -type f -name ".DS_Store" -delete
