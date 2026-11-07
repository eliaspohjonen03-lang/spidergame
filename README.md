# Custom Spider

Spider-pasianssi puhelimeen omilla kuvilla. Pelikorttien sijaan jokaisessa kortissa on
numero 1–13 ja kuva: oletuksena hämähäkki, tai omasta galleriasta valittu kuva.
Määrittely on tiedostossa [SPEC.md](SPEC.md).

Peli on asennettava verkkosovellus (PWA). Kaikki kuvat, pelit ja tilastot tallentuvat
vain pelaajan omaan laitteeseen.

## Kehitys

```sh
npm install
npm run dev      # kehityspalvelin
npm test         # pelilogiikan testit
npm run build    # tuotantoversio kansioon dist/
```

## Julkaisu GitHub Pagesiin

1. Tee repositoriosta julkinen: *Settings → General → Danger Zone → Change visibility*.
2. Valitse *Settings → Pages → Build and deployment → Source*: **GitHub Actions**.
3. Yhdistä muutokset `main`-haaraan. Työnkulku `.github/workflows/deploy.yml` ajaa testit,
   kääntää pelin ja julkaisee sen osoitteeseen
   `https://<käyttäjä>.github.io/spidergame/`.

Julkaisun voi käynnistää myös käsin välilehdeltä *Actions → Julkaise GitHub Pagesiin → Run workflow*.

## Rakenne

- `src/game/engine.ts` – säännöt, jako, kumoaminen, vihjeet ja pisteet (testit vieressä)
- `src/store/` – IndexedDB-tallennus ja sovelluksen tila
- `src/images/imaging.ts` – kuvien pienennys, maskin pehmennys ja korttikuvien piirto
- `src/ui/` – pelinäkymä, kuvaeditori, kuvasetit, tilastot, asetukset ja asennusohje
- `design/tyyliluonnos.html` – graafisen ilmeen luonnos
