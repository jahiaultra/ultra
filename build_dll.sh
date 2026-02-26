#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$ROOT_DIR/RaldisCrackhouseV2ModMenu/RaldisCrackhouseV2ModMenu.csproj"
OUT_DLL="$ROOT_DIR/RaldisCrackhouseV2ModMenu/bin/Release/net472/RaldisCrackhouseV2ModMenu.dll"
VISIBLE_DLL="$ROOT_DIR/RaldisCrackhouseV2ModMenu.dll"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "[ERROR] dotnet ei ole asennettu. Asenna .NET SDK ja aja uudelleen." >&2
  exit 1
fi

if [ -z "${GameDir:-}" ]; then
  echo "[ERROR] GameDir puuttuu. Esim: export GameDir='/polku/peliin'" >&2
  exit 1
fi

if [ ! -d "$GameDir" ]; then
  echo "[ERROR] GameDir-kansiota ei löydy: $GameDir" >&2
  exit 1
fi

echo "[INFO] Building $PROJECT"
dotnet build "$PROJECT" -c Release

if [ ! -f "$OUT_DLL" ]; then
  echo "[ERROR] Build valmis, mutta DLL:ää ei löytynyt: $OUT_DLL" >&2
  exit 1
fi

cp -f "$OUT_DLL" "$VISIBLE_DLL"
echo "[OK] DLL valmis: $OUT_DLL"
echo "[OK] Kopio tehty tähän: $VISIBLE_DLL"
