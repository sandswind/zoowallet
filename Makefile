## ZooWallet Makefile
## Usage: make <target>
## Run `make help` to see all available targets.

.PHONY: help install dev dev-web build build-debug check clippy fmt clean \
        db-path db-clear info loc

# ── Helpers ───────────────────────────────────────────────────────────────────

## help: Show this help
help:
	@echo "ZooWallet — available targets:"
	@grep -E '^## [a-z]' Makefile | sed 's/## /  make /'

# ── Setup ─────────────────────────────────────────────────────────────────────

## install: Install all dependencies (yarn + cargo fetch)
install:
	yarn install
	cd src-tauri && cargo fetch

# ── Development ───────────────────────────────────────────────────────────────

## dev: Start development mode (Vite HMR + Tauri window)
dev:
	yarn tauri dev

## dev-web: Start Vite frontend only (no Tauri window)
dev-web:
	yarn dev

# ── Build ─────────────────────────────────────────────────────────────────────

## build: Production build (generates installer packages)
build:
	yarn tauri build

## build-debug: Debug build (faster, keeps symbols)
build-debug:
	yarn tauri build --debug

# ── Quality ───────────────────────────────────────────────────────────────────

## check: Full type check (Rust cargo check + TypeScript tsc --noEmit)
check:
	cd src-tauri && cargo check --all-targets
	yarn typecheck

## clippy: Rust lint
clippy:
	cd src-tauri && cargo clippy --all-targets -- -D warnings

## fmt: Format Rust + TypeScript code
fmt:
	cd src-tauri && cargo fmt
	yarn prettier --write "src/**/*.{ts,tsx}" 2>/dev/null || true

# ── Database ──────────────────────────────────────────────────────────────────

## db-path: Show cache database path for current platform
db-path:
	@echo "macOS:   ~/Library/Application\ Support/com.zoowallet.app/cache.db"
	@echo "Windows: %APPDATA%/com.zoowallet.app/cache.db"
	@echo "Linux:   ~/.local/share/com.zoowallet.app/cache.db"

## db-clear: Delete the cache database (useful for debugging)
db-clear:
	@rm -f ~/Library/Application\ Support/com.zoowallet.app/cache.db \
	       ~/.local/share/com.zoowallet.app/cache.db
	@echo "Cache database cleared (macOS/Linux)"

# ── Utils ─────────────────────────────────────────────────────────────────────

## clean: Remove all build artifacts
clean:
	rm -rf dist node_modules/.vite
	cd src-tauri && cargo clean

## info: Show toolchain versions
info:
	@echo "Node:  $$(node --version 2>/dev/null || echo 'not found')"
	@echo "Yarn:  $$(yarn --version 2>/dev/null || echo 'not found')"
	@echo "Rust:  $$(rustc --version 2>/dev/null || echo 'not found')"
	@echo "Cargo: $$(cargo --version 2>/dev/null || echo 'not found')"
	@echo "Tauri: $$(cargo tauri --version 2>/dev/null || yarn tauri --version 2>/dev/null || echo 'not found')"

## loc: Count lines of code
loc:
	@find src src-tauri/src -name '*.rs' -o -name '*.ts' -o -name '*.tsx' | \
	  xargs wc -l 2>/dev/null | tail -1 || echo "wc not available"
