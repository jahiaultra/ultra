# Raldi's Crackhouse V2 Mod Menu (Single DLL)

Tein tämän niin, että lopputulos on **yksi DLL**: `RaldisCrackhouseV2ModMenu.dll`.

## Mitä tämä DLL sisältää
- F1 avaa/sulkee menun
- God Mode
- NoClip
- Infinite Stamina
- Infinite Items
- Speed slider
- Refill HP + stamina
- Teleport spawniin
- Item-lista -> valitse 1 item -> spawn peliin
- Spawn kaikki löydetyt itemit

## Tee DLL uudelleen (suositus)
Aja repojuuressa:

```bash
export GameDir="/polku/Raldi's Crackhouse v2"
./build_dll.sh
```

Scripti buildaa projektin ja kopioi näkyvän DLL:n tähän:
- `RaldisCrackhouseV2ModMenu/bin/Release/net472/RaldisCrackhouseV2ModMenu.dll`
- `RaldisCrackhouseV2ModMenu.dll` (repojuuri, helppo löytää)

## Manuaalinen build
```bash
dotnet build RaldisCrackhouseV2ModMenu/RaldisCrackhouseV2ModMenu.csproj -c Release
```

## Asennus
Kopioi `RaldisCrackhouseV2ModMenu.dll` kansioon:
`BepInEx/plugins/`

## Huom
Eri pelibuildeissa kenttien/metodien nimet voivat vaihdella, joten plugin käyttää reflectionia mahdollisimman laajasti.
Jos jokin toiminto ei toimi tietyssä buildissä, lisää oikea kenttä/metodinimi `Plugin.cs`-tiedostoon.
