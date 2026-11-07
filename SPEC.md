# Spider – pelin määrittely (luonnos v0.1)

> Tila: **luonnos**. Avoimet kysymykset on merkitty ❓ ja koottu loppuun.

## 1. Tiivistelmä

Mobiilissa pelattava Spider-pasianssi. Pelikorttien sijaan pelataan omilla
"kuvakorteilla": jokaisen kortin yläreunassa on numero 1–13, ja keskellä on kuva.
Oletuskuva on hämähäkki. Asetuksista pelaaja voi valita kuvat puhelimen galleriasta
ja päättää, mikä kuva kuuluu millekin numerolle.

Ulkoasu **ei saa** muistuttaa kasinoa tai pelikortteja, mutta sen pitää olla
graafisesti kaunis.

## 2. Säännöt

Perustana ovat Spider-pasianssin tavalliset säännöt:

- Pakassa on 104 korttia: 8 täyttä sarjaa, joissa kussakin numerot 1–13.
- Pöydällä on 10 saraketta. Alussa jaetaan 54 korttia: neljään ensimmäiseen
  sarakkeeseen 6 korttia ja muihin 5. Vain sarakkeen alin kortti on kuvapuoli ylöspäin.
- Loput 50 korttia jäävät jakopakkaan. Jokainen jako antaa yhden kortin
  jokaiseen sarakkeeseen, joten jakoja on yhteensä 5.
- Kortin voi siirtää minkä tahansa kortin päälle, jonka numero on yhtä suurempi
  (esim. 7 → 8), sarjasta riippumatta.
- Useamman kortin pinon voi siirtää kerralla vain, jos se on laskeva ja **samaa sarjaa**.
- Tyhjään sarakkeeseen voi siirtää minkä tahansa kortin tai siirrettävän pinon.
- Kun sarakkeeseen syntyy täysi saman sarjan jono 13 → 1, se poistuu pöydältä automaattisesti.
- Peli voitetaan, kun kaikki 8 jonoa on kerätty.
- ❓ Estetäänkö jako, jos jokin sarake on tyhjä (perinteinen sääntö)?

### 2.1 Sarjat (maiden korvike)

Perinteisessä Spiderissä vaikeustaso tulee maiden määrästä: 1, 2 tai 4 maata.
Tässä pelissä maiden tilalla käytetään **värisävyjä**, esimerkiksi kortin kehyksen
tai taustan väriä. Hertat, padat ja muut maat eivät näy missään.

| Vaikeus | Sarjoja | Esimerkki |
|---|---|---|
| Helppo | 1 | kaikki kortit samaa sävyä |
| Keskitaso | 2 | esim. sammal ja meri |
| Vaikea | 4 | esim. sammal, meri, auringonlasku ja laventeli |

- ❓ Käytetäänkö värisävyjä sarjoina, vai riittääkö pelkkä 1-sarjainen peli?
- ❓ Onko kuva sama kaikissa sarjoissa samalle numerolle (13 kuvaa), vai saako
  jokainen sarja omat kuvansa (enintään 52 kuvaa)? Ehdotan aloitukseksi 13 kuvaa.

## 3. Kortit ja kuvat

### 3.1 Kortin rakenne

```
┌───────────────┐
│ 7             │  ← numero yläreunassa, isolla ja selvästi luettavana
│               │
│    [ kuva ]   │  ← kuva keskellä (oletuksena hämähäkki)
│               │
└───────────────┘
```

- Kun kortit ovat pinossa päällekkäin, vain yläreunan kaistale näkyy. Siksi numeron
  pitää olla selvästi luettavissa juuri siitä kaistaleesta.
- Kortin taustapuoli on oma, rauhallinen kuvio, esimerkiksi hämähäkinverkko.
  Se ei saa näyttää pelikortin selkämykseltä.
- Oletushämähäkki piirretään itse vektorigrafiikkana (SVG), joten siihen ei tarvita
  ulkopuolisia kuvia eikä lisenssejä.
- ❓ Käytetäänkö yhtä hämähäkkiä kaikilla numeroilla, vai 13 eri hämähäkkiä
  (esim. koko tai asento muuttuu numeron mukaan)?

### 3.2 Omat kuvat galleriasta

- Asetuksissa on näkymä, jossa on 13 paikkaa, yksi kullekin numerolle 1–13.
- Paikkaa napauttamalla avautuu puhelimen galleria, josta valitaan kuva.
- Kuvat voi järjestää uudelleen raahaamalla ne paikasta toiseen.
- Jokaisen paikan voi palauttaa hämähäkkikuvaan, ja kaikki paikat voi nollata kerralla.
- Kuva rajataan kortin muotoon automaattisesti keskeltä.
- Kuvat pienennetään (esim. 512 px) ja tallennetaan laitteelle, jotta peli pysyy
  nopeana ja toimii ilman verkkoyhteyttä. Kuvia ei lähetetä minnekään.
- ❓ Riittääkö automaattinen rajaus, vai pitääkö kuvaa voida itse siirtää ja zoomata?
  Ehdotan, että manuaalinen rajaus tulee myöhemmin.

## 4. Visuaalinen suunta

Tavoite on rauhallinen, luonnonläheinen ja kaunis ulkoasu, joka ei tuo mieleen kasinoa.

- **Ei käytetä:** vihreää huopapöytää, punamusta-väritystä, maasymboleja (♠♥♦♣),
  J/Q/K/A-merkintöjä eikä kasinofontteja.
- **Ehdotus:** "metsän aamu". Tausta on tumma, pehmeä liukuväri (yönsininen tai
  sammaleenvihreä), jossa on hento hämähäkinverkkokuvio ja ehkä kastepisaroita.
  Kortit ovat pyöreäkulmaisia "laattoja", joissa on pehmeä varjo ja kermanvalkoinen
  tai lasimainen pinta. Numerot ovat modernilla, pyöreällä fontilla.
- Animaatiot ovat sulavia: kortti liukuu paikalleen, ja kun jono valmistuu, se
  "kelautuu verkkoon".
- Peli toimii pystyasennossa, ja 10 saraketta mahtuu puhelimen leveydelle.
- ❓ Tumma vai vaalea teema, vai molemmat?

## 5. Ominaisuudet

### MVP (ensimmäinen versio)
- Uusi peli ja vaikeustason valinta
- Korttien siirto raahaamalla ja napauttamalla (napautus siirtää kortin parhaaseen kohteeseen)
- Jako pakasta
- Kumoa (undo), rajattomasti
- Valmiiden jonojen automaattinen poisto ja voittonäkymä
- Keskeneräinen peli tallentuu automaattisesti ja jatkuu, kun sovellus avataan uudelleen
- Omat kuvat ja niiden järjestäminen numeroille
- Toimii ilman verkkoyhteyttä

### Myöhemmin (ehdotuksia)
- Vihje-nappi
- Tilastot (pelatut, voitetut, paras aika tai vähiten siirtoja)
- Pisteet ja ajastin
- Äänet ja tärinäpalaute
- Kuvan manuaalinen rajaus
- Useita kuvasettejä (teemoja), joiden välillä voi vaihtaa

## 6. Teknologiaehdotus

**Suositus: PWA-sovellus, eli web-tekniikalla tehty sovellus, jonka voi asentaa
puhelimen kotinäytölle.**

- TypeScript ja Vite. Käyttöliittymä tehdään kevyellä kirjastolla (Preact) tai
  ilman kirjastoa. Kortit ovat DOM-elementtejä ja liikkuvat CSS-animaatioilla,
  mikä riittää hyvin 104 kortille.
- Kuvat valitaan tavallisella kuvanvalitsimella (`<input type="file" accept="image/*">`),
  joka avaa puhelimen gallerian sekä Androidilla että iOS:llä.
- Kuvat ja pelitilanne tallennetaan laitteen IndexedDB-tietokantaan.
- Service worker mahdollistaa offline-käytön ja kotinäytölle asentamisen.
- Sovelluksen voi julkaista ilmaiseksi GitHub Pagesiin. App Storea, Google Playta
  tai kehittäjätiliä ei tarvita.
- Jos myöhemmin halutaan oikea sovelluskauppa-appi, saman koodin voi paketoida
  Capacitorilla Androidille ja iOS:lle.

**Vaihtoehto:** React Native ja Expo, eli natiivisovellus. Sen hyödyt ovat hieman
natiivimpi tuntuma ja varmempi tallennus. Haittana jakelu on työläämpää,
erityisesti iOS:llä.

- ❓ Onko puhelimesi Android vai iPhone? iPhonella PWA:n tallennus on hieman
  rajoitetumpi, joten silloin kannattaa harkita Capacitor-paketointia aikaisemmin.

## 7. Avoimet kysymykset

1. Käytetäänkö värisävyjä sarjoina (1/2/4), vai riittääkö 1-sarjainen peli?
2. Kuvia 13 (sama kuva kaikissa sarjoissa) vai yksi kuva jokaiselle sarjan ja numeron parille?
3. Estetäänkö jako, jos jokin sarake on tyhjä?
4. Yksi hämähäkki kaikilla numeroilla, vai jokaiselle numerolle oma?
5. Riittääkö kuvan automaattinen rajaus MVP:ssä?
6. Tumma vai vaalea teema, vai molemmat?
7. Onko puhelimesi Android vai iPhone?
8. Hyväksytkö teknologiaehdotuksen (PWA, TypeScript, Vite)?
