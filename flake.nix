{
  description = "Dev shell for Obsidian plugin nwt-linker with hot reload and auto-copy to dev vault";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        node = pkgs.nodejs_20;
        pluginName = "nwt-linker";
        defaultVault = ".dev-vault";
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            node
            pkgs.jq
            pkgs.git
            pkgs.watchman
            pkgs.coreutils
            pkgs.rsync
            pkgs.inotify-tools
          ];
          NODE_OPTIONS = "--max-old-space-size=4096";
          shellHook = ''
            set -eu
            PROJECT_ROOT="$(pwd)"
            : ''${OBSIDIAN_DEV_VAULT:="$PROJECT_ROOT/${defaultVault}"}
            export OBSIDIAN_DEV_VAULT
            echo "Dev vault: $OBSIDIAN_DEV_VAULT"

            mkdir -p "$OBSIDIAN_DEV_VAULT/.obsidian/plugins"

            HOT_RELOAD_DIR="$OBSIDIAN_DEV_VAULT/.obsidian/plugins/hot-reload"
            if [ ! -d "$HOT_RELOAD_DIR" ]; then
              echo "Installing Hot Reload plugin into vault..."
              mkdir -p "$HOT_RELOAD_DIR"
              if command -v curl >/dev/null 2>&1; then
                API_URL="https://api.github.com/repos/pjeby/hot-reload/releases/latest"
                ZIP_URL="$(curl -sL "$API_URL" | jq -r '.assets[]? | select(.name|endswith(".zip")) | .browser_download_url' | head -n1 || true)"
                if [ -n "''${ZIP_URL:-}" ]; then
                  TMP_ZIP="$(mktemp -t hotreload.XXXXXX.zip)"
                  echo "Downloading Hot Reload: $ZIP_URL"
                  curl -sL "$ZIP_URL" -o "$TMP_ZIP"
                  TMP_DIR="$(mktemp -d)"
                  (cd "$TMP_DIR" && ${pkgs.unzip}/bin/unzip -q "$TMP_ZIP")
                  SRC_DIR="$(find "$TMP_DIR" -maxdepth 2 -type f -name manifest.json -print -quit | xargs -r dirname || echo "$TMP_DIR")"
                  rsync -a "$SRC_DIR"/ "$HOT_RELOAD_DIR"/
                  rm -rf "$TMP_DIR" "$TMP_ZIP"
                else
                  echo "Could not resolve Hot Reload release asset; falling back to git clone."
                  ${pkgs.git}/bin/git clone --depth=1 https://github.com/pjeby/hot-reload "$HOT_RELOAD_DIR"
                fi
              else
                ${pkgs.git}/bin/git clone --depth=1 https://github.com/pjeby/hot-reload "$HOT_RELOAD_DIR"
              fi
            fi

            COMMUNITY_PLUGINS="$OBSIDIAN_DEV_VAULT/.obsidian/community-plugins.json"
            if [ ! -f "$COMMUNITY_PLUGINS" ]; then
              echo "[]" > "$COMMUNITY_PLUGINS"
            fi
            if ! jq -e 'index("hot-reload")' "$COMMUNITY_PLUGINS" >/dev/null; then
              echo "Enabling Hot Reload in vault..."
              TMP="$(mktemp)"
              jq '. + ["hot-reload"] | unique' "$COMMUNITY_PLUGINS" > "$TMP"
              mv "$TMP" "$COMMUNITY_PLUGINS"
            fi

            PLUGIN_DIR="$OBSIDIAN_DEV_VAULT/.obsidian/plugins/${pluginName}"
            mkdir -p "$PLUGIN_DIR"
            touch "$PLUGIN_DIR/.hotreload"
            if [ -f "$PROJECT_ROOT/manifest.json" ]; then
              cp "$PROJECT_ROOT/manifest.json" "$PLUGIN_DIR/manifest.json"
            fi
            echo "Plugin path in vault: $PLUGIN_DIR"
            echo ""
            echo "Commands:"
            echo "  dev       -> install deps and run build/watch, auto-copy to vault"
            echo "  build     -> npm run build and sync files to vault once"
            echo "  open-obs  -> attempts to launch Obsidian (if in PATH)"
            echo ""

            dev() {
              set -eu
              : "$PLUGIN_DIR:?PLUGIN_DIR must be set by shellHook"
              : "$PROJECT_ROOT:?PROJECT_ROOT must be set by shellHook"
              # npm-only to avoid pnpm dependency
              npm install
              (npm run dev &) >/dev/null 2>&1
              echo "Watching for build outputs to sync into vault at: $PLUGIN_DIR"
              while true; do
                if command -v inotifywait >/dev/null 2>&1; then
                  inotifywait -e close_write,modify,move \
                    --include "main.js|manifest.json" \
                    "$PROJECT_ROOT" "$PROJECT_ROOT/out" &>/dev/null || true
                else
                  echo "no inotifywait available"
                  sleep 1
                fi
                changed=0
				sleep 1
                for f in manifest.json main.js styles.css; do
                  if [ -f "$PROJECT_ROOT/$f" ]; then cp -f "$PROJECT_ROOT/$f" "$PLUGIN_DIR/$f" && changed=1; fi
                  if [ -f "$PROJECT_ROOT/out/$f" ]; then cp -f "$PROJECT_ROOT/out/$f" "$PLUGIN_DIR/$f" && changed=1; fi
                  if [ -f "$PROJECT_ROOT/dist/$f" ]; then cp -f "$PROJECT_ROOT/dist/$f" "$PLUGIN_DIR/$f" && changed=1; fi
                done
                if [ "$changed" -eq 1 ]; then
                  [ -f "$PLUGIN_DIR/main.js" ] && touch "$PLUGIN_DIR/main.js"
                  [ -f "$PLUGIN_DIR/styles.css" ] && touch "$PLUGIN_DIR/styles.css"
                  echo "Synced plugin artifacts to $PLUGIN_DIR"
                fi
              done
            }

            build() {
              set -eu
              npm install
              npm run build || npm run dev || true
              for f in manifest.json main.js styles.css; do
                if [ -f "$PROJECT_ROOT/$f" ]; then cp "$PROJECT_ROOT/$f" "$PLUGIN_DIR/$f"; fi
                if [ -f "$PROJECT_ROOT/out/$f" ]; then cp "$PROJECT_ROOT/out/$f" "$PLUGIN_DIR/$f"; fi
                if [ -f "$PROJECT_ROOT/dist/$f" ]; then cp "$PROJECT_ROOT/dist/$f" "$PLUGIN_DIR/$f"; fi
              done
              echo "Synced build artifacts to $PLUGIN_DIR"
            }

            open-obs() {
              if command -v obsidian >/dev/null 2>&1; then
                obsidian "$OBSIDIAN_DEV_VAULT" >/dev/null 2>&1 &
              elif command -v xdg-open >/dev/null 2>&1; then
                xdg-open "obsidian://open?vault=$(basename "$OBSIDIAN_DEV_VAULT")" >/dev/null 2>&1 || true
              else
                echo "Launch Obsidian manually and open the vault: $OBSIDIAN_DEV_VAULT"
              fi
            }

            echo "Shell ready. Run: dev"
          '';
        };
      }
    );
}