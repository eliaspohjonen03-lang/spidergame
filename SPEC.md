# Custom Spider – määrittely

> Versio 0.2 · Tila: haastattelu valmis, graafinen ilme suunnittelematta (ks. kohta 11)

## 1. Tiivistelmä

**Custom Spider** on Spider-pasianssi puhelimeen. Kortit lajitellaan sarjoiksi 13 → 1.
Peli on tavallinen pasianssi, mutta pelikortteja ei käytetä: jokaisen kortin
vasemmassa yläkulmassa on numero 1–13 ja kortissa on kuva. Oletuskuva on hämähäkki.
Pelaaja voi tehdä omia kuvasettejä puhelimen galleriasta, muokata kuvia (rajaus,
zoomaus, kierto, taustan pyyhkiminen) ja valita, mikä kuva näkyy millä numerolla.
Maiden tilalla ovat värisävyt.

- Ulkoasu on kaunis eikä tuo mieleen kasinoa tai pelikortteja.
- Peli on asennettava verkkosovellus (PWA). Sitä jaetaan perheelle linkillä.
  Jokaisen pelaajan kuvat jäävät vain hänen omaan puhelimeensa.
- Peli on suomenkielinen.
- Ensisijainen alusta on Android. Pelin pitää toimia myös iPhonella.

## 2. Säännöt

- Pakassa on 104 korttia: 8 täyttä jonoa, joissa kussakin numerot 1–13.
- Pöydällä on 10 saraketta. Alussa jaetaan 54 korttia: sarakkeisiin 1–4 kuusi korttia
  ja sarakkeisiin 5–10 viisi korttia. Vain sarakkeen alin kortti on kuvapuoli ylöspäin.
- Jakopakkaan jää 50 korttia. Jokainen jako antaa yhden kortin jokaiseen sarakkeeseen,
  joten jakoja on 5.
- **Jakaminen ei onnistu, jos jokin sarake on tyhjä.** Peli kertoo syyn lyhyellä ilmoituksella.
- Kortin voi siirtää kortin päälle, jonka numero on yhtä suurempi, sarjasta riippumatta.
- Useamman kortin pinon voi siirtää kerralla vain, jos se on laskeva ja **samaa sarjaa**.
- Tyhjään sarakkeeseen voi siirtää minkä tahansa kortin tai siirrettävän pinon.
- Kun sarakkeen alin kortti jää kuvapuoli alaspäin, se käännetään automaattisesti.
- Kun saman sarjan jono 13 → 1 on valmis, se poistuu pöydältä automaattisesti
  ja siirtyy valmiiden jonojen alueelle.
- Peli voitetaan, kun kaikki 8 jonoa on kerätty. Automaattista loppuun pelaamista ei ole.
- Jaot ovat satunnaisia, kuten perinteisesti. Jaon siemenluku tallennetaan, jotta saman jaon
  voi pelata uudelleen.

### 2.1 Vaikeustasot eli sarjojen määrä

Pelaaja valitsee 1, 2, 3 tai 4 sarjaa. Sarjat erotetaan toisistaan värisävyllä.
Pakassa on aina 8 jonoa, ja ne jaetaan sarjoille näin:

| Sarjoja | Jonoja sarjaa kohden |
|---|---|
| 1 | 8 |
| 2 | 4 + 4 |
| 3 | 3 + 3 + 2 |
| 4 | 2 + 2 + 2 + 2 |

### 2.2 Pisteet, siirrot ja aika (Windowsin klassisen Spiderin tapaan)

- Peli alkaa 500 pisteestä.
- Jokainen siirto tai jako vähentää yhden pisteen.
- Jokainen valmis jono tuo 100 pistettä.
- Kumoa-nappia saa käyttää rajattomasti. Jokainen kumoaminen lasketaan siirroksi ja
  vähentää pisteen. Myös jaon ja jonon valmistumisen voi kumota. Jonon valmistuminen
  kumoutuu yhdessä siirron kanssa, joka sen aiheutti.
- Vihjeen käyttö ei maksa pisteitä.
- Ajastin käy vain, kun peli on näkyvissä. Se pysähtyy, kun sovellus menee taustalle
  tai näyttö sammuu.
- Pisteet, aika ja siirtojen määrä näkyvät pelin aikana yläpalkissa.

### 2.3 Pelin aikana

- **Vihje:** korostaa yhden mahdollisen siirron. Hyödylliset siirrot ovat etusijalla, eli ne,
  jotka kääntävät kortin, rakentavat saman sarjan jonoa tai tyhjentävät sarakkeen.
  Jos hyödyllisiä siirtoja ei ole mutta pakassa on kortteja, vihje osoittaa jakopakkaa.
- **Siirrot loppuivat:** kun pakka on tyhjä eikä yhtään laillista siirtoa ole, peli näyttää
  ilmoituksen. Vaihtoehdot ovat Kumoa, Pelaa sama jako uudelleen ja Uusi peli.
- **Uusi peli kesken pelin:** peli kysyy vahvistuksen. Keskeytetty peli kirjataan
  tilastoihin häviönä.
- **Pelaa sama jako uudelleen:** tämä onnistuu valikosta ja häviöilmoituksesta.
  Jos peli on kesken, se kirjataan häviönä.
- Keskeneräinen peli tallentuu jokaisen siirron jälkeen, ja se jatkuu, kun sovellus
  avataan uudelleen.

## 3. Ohjaus

- **Raahaus:** kortin tai siirrettävän pinon voi raahata sormella toiseen sarakkeeseen.
  Jos pudotuskohta ei kelpaa, kortit liukuvat takaisin paikalleen.
- **Napautus:** kortti tai pino siirtyy automaattisesti parhaaseen sallittuun paikkaan.
  Paras paikka on saman sarjan jatko, sitten muu sallittu kortti ja viimeisenä tyhjä sarake.
  Jos sallittua paikkaa ei ole, kortti heilahtaa kevyesti.
- **Jako:** jakopakkaa napautetaan.
- **Näytön kierto:** peli toimii pysty- ja vaaka-asennossa, ja asettelu mukautuu,
  kun puhelin kääntyy. Pelitilanne ja meneillään oleva raahaus eivät katoa kierron aikana.
- Pitkät sarakkeet tiivistyvät pystysuunnassa niin, että ne mahtuvat aina näytölle
  ilman vieritystä.

## 4. Kortit

### 4.1 Rakenne

- Numero 1–13 on **vain vasemmassa yläkulmassa**. Sen on oltava luettavissa myös silloin,
  kun kortti on pinossa ja siitä näkyy vain yläreuna. Puhelimen pystyasennossa sarake on
  noin 34 px leveä, ja numero mitoitetaan sen mukaan.
- Numero on aina sarjan värinen. Artefaktilla kokeillaan myös vaihtoehtoja, joissa sarjan
  väri näkyy lisäksi kortin taustassa tai kehyksessä.
- Kuvan läpinäkyvillä alueilla näkyy **kortin taustaväri, joka on sarjan värisävy**.
  Sama kuva näyttää siis eri sarjoissa eri väriseltä.
- **Kuvan asettelu** valitaan kuvasettikohtaisesti:
  - *Koko kortti:* kuva peittää koko kortin, ja numero on kuvan päällä.
    Numeron luettavuus varmistetaan esimerkiksi pienellä taustalaatalla tai varjolla.
  - *Kuva-alue:* kuvalla on oma alueensa numeron alapuolella.
- **Rajat:** viivan kortin ulkoreunassa ja laatikon kuvan ympärillä voi piilottaa erikseen.
  Kuvan ympärillä oleva laatikko on oletuksena piilossa.
- **Selkäpuoli:** oma rauhallinen kuvio, esimerkiksi hämähäkinverkko. Se ei saa näyttää
  pelikortin selkämykseltä.

### 4.2 Oletuskuva

- Hämähäkki piirretään itse vektorigrafiikkana (SVG), joten ulkopuolisia kuvia tai
  lisenssejä ei tarvita.
- Sama hämähäkki on kaikilla numeroilla. Hämähäkki on yksivärinen, ja sen väri tulee
  sarjan värisävystä.

### 4.3 Sarjojen värit

- Valmiina on neljä hyvin toisistaan erottuvaa oletussävyä, ja ne sopivat sekä tummaan
  että vaaleaan teemaan.
- Sävyjä voi muuttaa asetuksista värinvalitsimella, ja oletukset voi palauttaa yhdellä napilla.
- Värit ovat **yhteiset kaikille kuvaseteille**.
- Värisokeuskuvioita ei tehdä.

## 5. Kuvasetit

- Pelaajalla voi olla **useita nimettyjä kuvasettejä**, esimerkiksi "Lemmikit" ja "Mökki".
- Valmiina on poistamaton "Hämähäkit"-setti, jossa on pelkkä oletuskuva.
- **Aktiivinen setti** valitaan asetuksista, ja se pysyy käytössä, kunnes pelaaja vaihtaa sen.
  Vaihto näkyy heti, myös kesken pelin.
- Setin voi luoda, nimetä uudelleen, monistaa ja poistaa. Poisto vaatii vahvistuksen.
- Jokaisessa setissä on:
  - **kuvakirjasto**, jossa on 1–13 kuvaa galleriasta
  - **numerokartoitus**, jossa jokaiselle numerolle 1–13 valitaan jokin kirjaston kuvista.
    Sama kuva voi olla usealla numerolla. Numero, jolle ei ole valittu kuvaa, saa hämähäkin.
  - **asettelu** (koko kortti tai kuva-alue) ja rajojen näkyvyys
- Numerokartoitusta muokataan näkymässä, jossa on 13 paikkaa. Paikkaa napautetaan, ja
  kirjastosta valitaan kuva. Kuvia voi raahata paikasta toiseen.
- Kuvat eivät koskaan lähde laitteelta. Varmuuskopiointia ja vientiä ei tehdä.

## 6. Kuvaeditori

Editori avautuu, kun kuva lisätään galleriasta. Kuvaa voi muokata myöhemmin uudelleen.

- **Rajaus:** kehys on kortin tai kuva-alueen muotoinen, setin asettelun mukaan.
- **Siirto, zoomaus ja kierto** kahdella sormella. Kiertoon on lisäksi 90°-pikanapit.
- **Pyyhekumi**, jolla taustan pyyhkii sormella pois.
- **Palautussivellin**, jolla pyyhityn alueen saa takaisin.
- Siveltimen koko on säädettävä. Siveltimen koko pysyy samana näytöllä zoomauksesta
  riippumatta, joten lähentämällä saa tarkkaa jälkeä.
- **Reunan pehmennys:** pyyhityille reunoille tulee pieni häivytys, jotta reuna ei ole
  terävä eikä sumea. Voimakkuutta voi säätää liukusäätimellä, ja oletus on pieni.
- **Kumoa ja tee uudelleen** editorin sisällä.
- **Esikatselu:** valmis kortti näytetään kaikissa sarjojen väreissä, sekä kokonaisena
  että pinoon peittyneenä.
- Tallennus säilyttää alkuperäisen kuvan pienennettynä, editorin asetukset (siirto,
  zoomaus, kierto ja maski) sekä valmiin kortin kuvan. Siksi kuvaa voi muokata myöhemmin
  ilman laadun heikkenemistä.

## 7. Tilastot

Tilastoilla on oma näkymänsä, ja vaikeustasot (1, 2, 3 ja 4 sarjaa) ovat eri välilehdillä.

- **Luvut:** pelatut pelit, voitetut pelit, voittoprosentti, pisin voittoputki ja nykyinen putki.
- **Paras tulos ja keskiarvo:** pisteet, aika ja siirrot. Aika ja siirrot lasketaan
  voitetuista peleistä.
- **Viivadiagrammit:** pisteet, aika ja siirrot peli peliltä. Jokaisessa on mukana
  liukuva keskiarvo, ja kunkin pelin tiedot saa näkyviin napauttamalla.
- **Nollaus:** tilastot voi nollata vahvistuksen jälkeen, joko yhden vaikeustason tai kaikki.
- Jokaisesta pelistä tallennetaan päivämäärä, vaikeustaso, tulos (voitto, häviö tai
  keskeytys), pisteet, aika, siirrot ja kumoamisten määrä.

## 8. Asetukset

- **Vaikeustaso** uutta peliä varten: 1, 2, 3 tai 4 sarjaa.
- **Aktiivinen kuvasetti** ja kuvasettien hallinta.
- **Sarjojen värit**, joille on palautus oletusarvoihin.
- **Teema:** Järjestelmä (oletus), Vaalea tai Tumma.
- **Äänet:** oletuksena pois päältä, ja äänenvoimakkuus on säädettävä.
  - Äänet ovat hiljaisia ja luonnonläheisiä: pehmeä liukuääni siirrossa, kevyt kahina
    jaossa, hento kilahdus jonon valmistuessa ja lyhyt melodia voitossa.
  - Äänet syntetisoidaan Web Audio -rajapinnalla, joten äänitiedostoja tai lisenssejä ei tarvita.
- **Animaatioiden nopeus:** Normaali tai Nopea.
- **Vasenkätinen asettelu:** jakopakka ja valmiiden jonojen alue vaihtavat puolta.
- **Asennusohje** avataan uudelleen tästä.
- Värinää ei tehdä.

## 9. Ensimmäinen avaus ja asennusohje

- Kun peli avataan selaimessa eikä asennettuna sovelluksena, näkyy selkeä ja kuvitettu
  asennusohje, joka on kirjoitettu ei-teknisille käyttäjille.
  - **Android (Chrome):** ohjeessa on suora "Asenna"-nappi, jos selain tukee sitä.
    Muuten ohje neuvoo käyttämään valikkoa ⋮ ja kohtaa "Lisää aloitusnäytölle" tai "Asenna sovellus".
  - **iPhone (Safari):** jaa-painike ja sitten "Lisää Koti-valikkoon".
    Jos iPhonella käytetään muuta selainta kuin Safaria, ohje neuvoo avaamaan sivun Safarissa.
  - Puhelimen käyttöjärjestelmä tunnistetaan automaattisesti, ja oikea ohje näytetään ensin.
- Ohjeen voi ohittaa valinnalla "Pelaa selaimessa". Ohjeen saa myöhemmin auki asetuksista.
- Kun peli on asennettu, ohjetta ei enää näytetä.

## 10. Tekniikka

| Osa-alue | Valinta |
|---|---|
| Kieli ja työkalut | TypeScript ja Vite |
| Käyttöliittymä | Preact. Kortit ovat DOM-elementtejä ja liikkuvat CSS-transformeilla. |
| Kosketus | Pointer Events (raahaus, napautus ja kahden sormen eleet) |
| Kuvaeditori | Canvas 2D: maski omalla canvasillaan, pehmennys sumentamalla maskia |
| Tallennus | IndexedDB (kuvat Blobeina, setit, pelitilanne ja tilastot) |
| Kaaviot | Itse tehdyt SVG-viivadiagrammit, ei raskasta kaaviokirjastoa |
| PWA | `vite-plugin-pwa`: offline-käyttö, manifesti ja kuvakkeet |
| Testit | Vitest pelilogiikalle (säännöt, siirrot, kumoa, pisteet ja jako) |
| Julkaisu | GitHub Actions → GitHub Pages (repo tehdään julkiseksi) |

- Pelilogiikka on erillään käyttöliittymästä, ja se on puhdasta ja testattavaa TypeScriptiä.
- Pelissä ei ole palvelinta, analytiikkaa eikä ulkoisia kutsuja.
- Uusi versio otetaan käyttöön, kun sovellus avataan seuraavan kerran.
- Kaikki tallennettu data on vain laitteella. Peli pyytää selaimelta pysyvää tallennustilaa
  (`navigator.storage.persist()`), jotta selain ei poista kuvia muistin käydessä vähiin.

## 11. Seuraava vaihe: graafinen ilme

Ilme suunnitellaan artefaktina ennen toteutusta. Artefaktissa on 2–3 tyylivaihtoehtoa vierekkäin:

- pelinäkymä pysty- ja vaaka-asennossa, sekä tumma että vaalea teema
- kortin rakenne: numeron ja sarjan värin sijoitusvaihtoehdot, koko kortin ja kuva-alueen asettelu
  sekä rajat näkyvissä ja piilotettuina
- selkäpuolen kuvio ja oletushämähäkki
- neljä oletusväriä sarjoille
- ehdotuksia voittoanimaatioksi ja jonon valmistumisen animaatioksi

**Päätetty:**
- Oletustyyli on **Yöhehku**: syvä yötaivas, jolla on hento hämähäkinverkko ja hohtavat
  pisarat. Kortit hehkuvat sarjan värissä, ja numerot ovat Lexend-kirjasimella. Vaaleassa
  teemassa tausta on vaalea laventelinsumu, ja hehku on hillitympi.
- Yöhehkun oletusvärit sarjoille ovat tummassa teemassa `#6af0c6`, `#7cb8ff`, `#ffb86a`
  ja `#e78cff`, ja vaaleassa teemassa `#0e9b77`, `#2d6bd4`, `#cf7b19` ja `#a548c6`.
- Voittoanimaatio vaihtelee. Jokaisen voiton jälkeen näytetään satunnaisesti
yksi vaihtoehdoista: verkko kutoutuu tai kastepisarat syttyvät. Tyyliluonnos on
tiedostossa `design/tyyliluonnos.html`.

## 12. Rajattu pois (mahdollisia myöhempiä lisäyksiä)

- Vain ratkaistavat jaot
- Päivän haaste
- Kuvasettien vienti, tuonti ja varmuuskopiointi
- Automaattinen taustanpoisto tekoälyllä
- Englannin kieli
- Värinä

## 13. Toteutuksessa tehdyt tarkennukset

- Oletusvaikeus on 1 sarja. Vaikeustason voi vaihtaa Uusi peli -ikkunasta ja asetuksista.
- Sarjan värin paikka (numero, kehys tai tausta) on asetus, ja oletuksena väri näkyy numerossa.
  Muut tyylit (Aamukaste ja Muste) voi valita asetuksista.
- Uusi kuva asetetaan setin ensimmäiselle vapaalle numerolle. Numeron kuvan valinnassa on
  lisäksi pikavalinta "Käytä kaikilla numeroilla".
- Pystyasennossa kortit ovat pieniä, ja tämä on hyväksytty ratkaisu.
- Androidin takaisin-painike sulkee avoinna olevan näkymän.

### 13.1 Kuvaeditorin lisäykset

- Galleriasta voi valita useita kuvia kerralla. Ne lisätään suoraan settiin vapaille numeroille,
  ja kutakin voi muokata myöhemmin.
- Kierto on oletuksena lukittu, joten kahden sormen zoomaus ei käännä kuvaa. Kierron voi
  vapauttaa napista. Suorista-nappi palauttaa kuvan vaaka-asentoon niin, että zoomaus ja paikka säilyvät.
- Tausta-työkalu poistaa taustan värin perusteella:
  - automaattinen tunnistus kuvan reunoilta (myös kuvaan leivottu läpinäkyvyysruudukko)
  - värien poiminta napauttamalla, jolloin värejä voi olla useita
  - herkkyyden säätö
  - poisto vain reunoihin yhteydessä olevalta alueelta tai kaikkialta
  - poistetun alueen kohdalla näkyy kortin oma tausta, kuten hämähäkkikuvassa
- Läpinäkyvät PNG-kuvat säilyttävät läpinäkyvyytensä.

### 13.2 Häviö

- Kun pakka on tyhjä eikä hyödyllisiä siirtoja ole, peli näyttää häviöanimaation: hämähäkki laskeutuu
  langan varassa ja kortit himmenevät. Jos pöydällä on tyhjä sarake, häviö julistetaan vasta, kun
  laillisia siirtoja ei ole lainkaan.
- Häviönäkymän vaihtoehdot ovat Kumoa, Pelaa sama jako uudelleen, Uusi peli ja Jatka silti.
