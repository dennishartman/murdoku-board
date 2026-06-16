# Murdoku Board Maker PWA v11

Deze versie is geschikt gemaakt voor GitHub Pages.

## Belangrijkste wijzigingen

- Vite gebruikt nu `base: "./"`, zodat de app werkt vanaf een GitHub Pages submap zoals `https://gebruikersnaam.github.io/murdoku-board/`.
- De manifest-bestanden gebruiken relatieve paden.
- De service worker wordt relatief geregistreerd en krijgt bij build automatisch een lijst met alle assets in `dist`.
- De GitHub Actions workflow `.github/workflows/deploy.yml` bouwt de app en publiceert de `dist` map naar GitHub Pages.
- `.nojekyll` wordt automatisch toegevoegd tijdens de build.

## Lokaal starten

```cmd
npm.cmd install
npm.cmd run dev -- --host 0.0.0.0
```

## Productieversie bouwen

```cmd
npm.cmd run build
```

Daarna staat de publiceerbare versie in de map `dist`.

## GitHub Pages

1. Maak een nieuwe repository op GitHub.
2. Upload alle bestanden uit deze projectmap naar de repository.
3. Ga naar Settings > Pages.
4. Zet Source op GitHub Actions.
5. Push naar de `main` branch of start de workflow handmatig.

De app wordt daarna beschikbaar via:

```text
https://JOUW-GITHUB-NAAM.github.io/REPOSITORY-NAAM/
```

## iPhone

1. Open de GitHub Pages URL in Safari.
2. Wacht tot de app volledig geladen is.
3. Tik op Delen.
4. Kies Zet op beginscherm.
5. Open daarna de app via het icoon op je beginscherm.

De borddata wordt lokaal op je iPhone opgeslagen in IndexedDB.
