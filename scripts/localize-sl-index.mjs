#!/usr/bin/env node
/** Gera sl/index.html a partir de de/index.html — tradução completa da home. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'de', 'index.html');
const DEST = path.join(ROOT, 'sl', 'index.html');

/** @type {Array<[string, string]>} — ordem: strings mais longas primeiro */
const RULES = [
  // meta title / desc / og / twitter
  ['Smartwatch fragt nach Passcode, misst Puls nicht oder bricht Training ab? | Sensor Tattoo Fix', 'Pametna ura zahteva geslo, ne meri pulza ali prekine vadbo? | Sensor Tattoo Fix'],
  ['Die Uhr fragt alle 10 Sekunden nach dem Passcode, misst den Puls nicht, trennt die Verbindung oder bricht das Training ab? Tattoo-Tinte blockiert oft den Sensor. Sensor Tattoo Fix Linse — Apple Watch, Samsung, Garmin. 3N20-Technologie.', 'Ura vsakih 10 sekund zahteva geslo, ne meri pulza, prekine povezavo ali vadbo? Tinta tetovaže pogosto blokira senzor. Leča Sensor Tattoo Fix — Apple Watch, Samsung, Garmin. Tehnologija 3N20.'],
  ['smartwatch fragt nach passcode, uhr passcode alle 10 sekunden, smartwatch ständig passcode, smartwatch pulsmessung funktioniert nicht, herzfrequenz funktioniert nicht, smartwatch misst puls nicht, sensor funktioniert nicht, smartwatch trennt verbindung, uhr verliert handgelenkserkennung, training bricht ab, apple watch passcode tattoo, apple watch herzfrequenz tattoo, samsung watch sensor, garmin herzfrequenz, smartwatch tattoo, handgelenkserkennung tattoo, Sensor Tattoo Fix', 'pametna ura zahteva geslo, ura geslo vsakih 10 sekund, pametna ura nenehno geslo, pametna ura merjenje pulza ne deluje, srčni utrip ne deluje, pametna ura ne meri pulza, senzor ne deluje, pametna ura prekine povezavo, ura izgubi zaznavo zapestja, vadba se prekine, apple watch geslo tetovaža, apple watch srčni utrip tetovaža, samsung watch senzor, garmin srčni utrip, pametna ura tetovaža, zaznava zapestja tetovaža, Sensor Tattoo Fix'],
  ['Smartwatch: Passcode oder Pulsmessung? | Sensor Tattoo Fix', 'Pametna ura: geslo ali merjenje pulza? | Sensor Tattoo Fix'],
  ['Passcode alle 10 Sekunden, Pulsmessung ausgefallen oder Training unterbrochen? Lösung für Smartwatch auf tätowierter Haut — Apple Watch, Samsung, Garmin.', 'Geslo vsakih 10 sekund, merjenje pulza ne deluje ali prekinjena vadba? Rešitev za pametno uro na tetovirani koži — Apple Watch, Samsung, Garmin.'],
  ['Sensor Tattoo Fix — Smartwatch auf tätowierter Haut', 'Sensor Tattoo Fix — Pametna ura na tetovirani koži'],
  ['Die Uhr fragt ständig nach dem Passcode, misst den Puls nicht oder trennt die Verbindung? Tattoo-Tinte kann den Sensor blockieren — entdecken Sie Sensor Tattoo Fix.', 'Ura nenehno zahteva geslo, ne meri pulza ali prekine povezavo? Tinta tetovaže lahko blokira senzor — spoznajte Sensor Tattoo Fix.'],

  // nav + header
  ['Harmonie zwischen Tinte und Silizium', 'Mir med tinto in silicijem'],
  ['<li><a href="#problema">Das Problem</a></li>', '<li><a href="#problema">Problem</a></li>'],
  ['<li><a href="#paliativos">Notlösungen</a></li>', '<li><a href="#paliativos">Začasne rešitve</a></li>'],
  ['<li><a href="#produtos">Produkte</a></li>', '<li><a href="#produtos">Izdelki</a></li>'],
  ['<li><a href="#quem-somos">Über uns</a></li>', '<li><a href="#quem-somos">O nas</a></li>'],
  ['<li><a href="#contato">Kontakt</a></li>', '<li><a href="#contato">Kontakt</a></li>'],
  ['aria-label="Social Media"', 'aria-label="Družbena omrežja"'],
  ['data-rotulo="Header Instagram DE"', 'data-rotulo="Header Instagram SL"'],
  ['data-rotulo="Header TikTok DE"', 'data-rotulo="Header TikTok SL"'],
  ['data-rotulo="Header YouTube DE"', 'data-rotulo="Header YouTube SL"'],
  ['title="Jetzt kaufen" aria-label="Jetzt kaufen" data-evento="clique_buy_now" data-rotulo="Menu buy now DE"', 'title="Kupi zdaj" aria-label="Kupi zdaj" data-evento="clique_buy_now" data-rotulo="Menu buy now SL"'],
  ['<span class="btn-nav-label">Jetzt kaufen</span>', '<span class="btn-nav-label">Kupi zdaj</span>'],
  ['aria-label="Menü öffnen"', 'aria-label="Odpri meni"'],

  // hero
  ['<span class="badge">3N20-Technologie • Patentiert</span>', '<span class="badge">Tehnologija 3N20 • Patentirano</span>'],
  ['<h1>Smartwatch fragt nach Passcode, misst Puls nicht oder bricht Training ab?</h1>', '<h1>Pametna ura zahteva geslo, ne meri pulza ali prekine vadbo?</h1>'],
  ['<p><strong>Passcode alle 10 Sekunden</strong>, <strong>Puls wird nicht gemessen</strong>, <strong>Verbindung bricht ab</strong> oder <strong>Training wird unterbrochen</strong>? Auf tätowierten Handgelenken blockiert die Tinte den optischen Sensor. Stellen Sie Handgelenkserkennung, Herzfrequenz und Training auf Apple Watch, Samsung, Garmin und mehr wieder her — mit der Sensor Tattoo Fix Linse (3N20).</p>', '<p><strong>Geslo vsakih 10 sekund</strong>, <strong>pulz se ne meri</strong>, <strong>povezava se prekine</strong> ali <strong>vadba se prekine</strong>? Na tetoviranih zapestjih tinta blokira optični senzor. Obnovite zaznavo zapestja, srčni utrip in vadbo na Apple Watch, Samsung, Garmin in drugih — z lečo Sensor Tattoo Fix (3N20).</p>'],
  ['<a href="#produtos" class="btn-primary">Lösung entdecken</a>', '<a href="#produtos" class="btn-primary">Spoznaj rešitev</a>'],
  ['data-rotulo="Hero onde comprar DE"><span class="hero-cta-buy-full">Wo kaufen</span><span class="hero-cta-buy-short">Jetzt kaufen</span>', 'data-rotulo="Hero onde comprar SL"><span class="hero-cta-buy-full">Kje kupiti</span><span class="hero-cta-buy-short">Kupi zdaj</span>'],
  ['data-rotulo="Hero official store DE"', 'data-rotulo="Hero official store SL"'],
  ['<strong>Offizieller Shop</strong>', '<strong>Uradna trgovina</strong>'],
  ['aria-label="Zahlungsmethoden"', 'aria-label="Načini plačila"'],
  ['<span class="store-pay-label">Karte</span>', '<span class="store-pay-label">Kartica</span>'],
  ['62,90 + Versand', '62,90 + poštnina'],
  ['Sendungsverfolgung · Preis beim Checkout', 'Sledenje pošiljki · cena na blagajni'],
  ['alt="Smartwatch misst Puls nicht oder fragt ständig nach Passcode am tätowierten Arm — Sensor Tattoo Fix Apple Watch Sensor-Fix"', 'alt="Pametna ura ne meri pulza ali nenehno zahteva geslo na tetoviranem roki — Sensor Tattoo Fix Apple Watch popravek senzorja"'],

  // problema
  ['<h2 class="section-title">Ein globales Problem</h2>', '<h2 class="section-title">Globalni problem</h2>'],
  ['<p>Tausende Menschen glauben, die Uhr sei defekt — dabei verhindert das Tattoo, dass der optische Sensor korrekt liest. Das beeinträchtigt Sicherheit, Gesundheitsüberwachung, kontaktlose Zahlungen und andere Smartwatch-Funktionen.</p>', '<p>Tisoči ljudi misli, da je ura pokvarjena — a tetovaža preprečuje pravilno delovanje optičnega senzorja. To ogroža varnost, spremljanje zdravja, brezstična plačila in druge funkcije pametne ure.</p>'],
  ['<h3>Fragt ständig nach Passcode</h3>', '<h3>Nenehno zahteva geslo</h3>'],
  ['<p>Selbst ohne die Smartwatch vom Handgelenk zu nehmen, verlangt sie wiederholt PIN oder Passwort.</p>', '<p>Tudi brez snemanja pametne ure z zapestja večkrat zahteva PIN ali geslo.</p>'],
  ['<h3>Pulsmessung funktioniert nicht</h3>', '<h3>Merjenje pulza ne deluje</h3>'],
  ['<p>Das Tattoo hindert den Sensor daran, die Herzfrequenz korrekt zu messen.</p>', '<p>Tetovaža senzorju preprečuje pravilno merjenje srčnega utripa.</p>'],
  ['<h3>Trennt die Verbindung von selbst</h3>', '<h3>Samodejno prekine povezavo</h3>'],
  ['<p>Die Smartwatch verliert die Handgelenkserkennung und verhält sich, als wäre sie abgenommen worden.</p>', '<p>Pametna ura izgubi zaznavo zapestja in se obnaša, kot da bi bila sneta.</p>'],
  ['<h3>Training wird unterbrochen</h3>', '<h3>Vadba se prekine</h3>'],
  ['<p>Workouts pausieren automatisch, wenn die Uhr die Handgelenksmessung verliert.</p>', '<p>Vadbe se samodejno ustavijo, ko ura izgubi meritev zapestja.</p>'],
  ['<h3>Zahlung funktioniert nicht</h3>', '<h3>Plačilo ne deluje</h3>'],
  ['<p>Apple Pay, Google Pay und andere Wallets funktionieren nicht mehr, sobald die Handgelenkserkennung ausfällt.</p>', '<p>Apple Pay, Google Pay in druge denarnice ne delujejo več, ko zaznava zapestja odpove.</p>'],
  ['<h3>Sicherheit beeinträchtigt</h3>', '<h3>Ogrožena varnost</h3>'],
  ['<p>Wird die Handgelenkserkennung deaktiviert, verschwinden die Passcode-Abfragen — aber Ihre Daten sind weniger geschützt.</p>', '<p>Če onemogočite zaznavo zapestja, izginejo zahteve za geslo — a vaši podatki so manj zaščiteni.</p>'],

  // paliativos
  ['<h2>Warum Notlösungen scheitern</h2>', '<h2>Zakaj začasne rešitve ne delujejo</h2>'],
  ['<p>Viele Nutzer probieren Hausmittel, die das Gerät beschädigen oder das Erlebnis ruinieren:</p>', '<p>Mnogi uporabniki poskusijo domače trike, ki poškodujejo napravo ali pokvarijo izkušnjo:</p>'],
  ['<strong>Harz- und Epoxid-Kuppeln:</strong> Geringe Haftung. Sie lösen sich leicht durch Schweiß, Wasser oder täglichen Gebrauch und werden zu einer frustrierenden Einweg-Lösung.', '<strong>Smolne in epoksidne kupole:</strong> Slaba oprijemljivost. Zaradi potu, vode ali vsakodnevne uporabe se zlahka odlomijo in postanejo frustrirajoča enkratna rešitev.'],
  ['<strong>Klebeband und Latexhandschuhe:</strong> Undurchsichtige Materialien, die Licht blockieren. Sie sehen schlecht aus, verfälschen Gesundheitswerte und reizen die Haut.', '<strong>Lepilni trak in lateksne rokavice:</strong> Neprosojni materiali, ki blokirajo svetlobo. Slabo izgledajo, pokvarijo zdravstvene meritve in dražijo kožo.'],
  ['<strong>Handgelenkserkennung deaktivieren:</strong> Die schlechteste Notlösung. Nutzer schalten die Erkennung ab, um keinen Passcode mehr eingeben zu müssen — machen die Uhr aber unsicher und deaktivieren alle Smart-Funktionen.', '<strong>Onemogočitev zaznave zapestja:</strong> Najslabša začasna rešitev. Uporabniki izklopijo zaznavo, da ne bi več vnašali gesla — a ura postane nevarna in izgubijo vse pametne funkcije.'],
  ['Notlösungen funktionieren nicht', 'Začasne rešitve ne delujejo'],

  // produtos
  ['<h2 class="section-title">Unsere professionelle Lösung</h2>', '<h2 class="section-title">Naša profesionalna rešitev</h2>'],
  ['<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Optische Korrektur</h3>', '<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Optična korekcija</h3>'],
  ['<p style="font-size: 0.85rem;">Präzise optische Schnittstelle.</p>', '<p style="font-size: 0.85rem;">Natančen optični vmesnik.</p>'],
  ['<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Patentiert</h3>', '<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Patentirano</h3>'],
  ['<p style="font-size: 0.85rem;">Originaltechnologie beim INPI.</p>', '<p style="font-size: 0.85rem;">Originalna tehnologija pri INPI.</p>'],
  ['<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Hohe Haltbarkeit</h3>', '<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Visoka vzdržljivost</h3>'],
  ['<p style="font-size: 0.85rem;">Extreme Haftung ohne Rückstände.</p>', '<p style="font-size: 0.85rem;">Izjemno lepljenje brez ostankov.</p>'],
  ['<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Weiches Material</h3>', '<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Mehak material</h3>'],
  ['<p style="font-size: 0.85rem;">Hypoallergen und angenehm.</p>', '<p style="font-size: 0.85rem;">Hipoalergen in prijeten.</p>'],
  ['<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Volles Laden</h3>', '<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Polno polnjenje</h3>'],
  ['<p style="font-size: 0.85rem;">Keine Störung beim Aufladen.</p>', '<p style="font-size: 0.85rem;">Brez motenj med polnjenjem.</p>'],
  ['<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Wasserdicht</h3>', '<h3 style="color: #ffc107; font-size: 1.1rem; margin-bottom: 10px;">Vodoodporno</h3>'],
  ['<p style="font-size: 0.85rem;">Beständig beim Schwimmen und Training.</p>', '<p style="font-size: 0.85rem;">Odporno na plavanje in vadbo.</p>'],
  ['alt="Anwendung" class="product-img"', 'alt="Aplikacija" class="product-img"'],
  ['data-rotulo="Botao produto buy now DE"', 'data-rotulo="Botao produto buy now SL"'],
  ['\n                       Jetzt kaufen\n                    ', '\n                       Kupi zdaj\n                    '],
  ['<!-- Kit auf .com / DE ausgeblendet — nur Linse -->', '<!-- Komplet na .com / SL skrit — samo leča -->'],
  ['<h3>Im Kit enthalten:</h3>', '<h3>V kompletu:</h3>'],

  // reviews
  ['<h2 class="section-title">Was sagen die Leute?</h2>', '<h2 class="section-title">Kaj pravijo ljudje?</h2>'],
  ['<p class="reviews-summary"><i class="fas fa-star" aria-hidden="true"></i> 5,0 · echte Bewertungen (Google, Mercado Libre, WhatsApp, Instagram und mehr)</p>', '<p class="reviews-summary"><i class="fas fa-star" aria-hidden="true"></i> 5,0 · prave ocene (Google, Mercado Libre, WhatsApp, Instagram in drugo)</p>'],

  // sobre nós — história completa
  ['<h2 class="section-title">Über uns</h2>', '<h2 class="section-title">O nas</h2>'],
  ['<p class="about-origin"><strong>Sensor Tattoo Fix</strong> entstand aus einer echten Erfahrung.</p>', '<p class="about-origin"><strong>Sensor Tattoo Fix</strong> je nastal iz resnične izkušnje.</p>'],
  ['<p class="about-body">Sensor Tattoo Fix wurde nicht in einem fernen Labor oder mit geheimer Luft- und Raumfahrttechnik entwickelt. Es entstand in Imirim, Nordzone von São Paulo, im „Haus der Oma“ — wo ich geboren wurde und Jahre später, nachdem Oma Maria in den Himmel ging, mein Zuhause machte.</p>', '<p class="about-body">Sensor Tattoo Fix ni nastal v oddaljenem laboratoriju ali s skrivno vesoljsko tehnologijo. Nastalo je v Imirimu, severni coni São Paula, v «Hiši babice» — kjer sem se rodil in leta pozneje, ko je babica Maria šla v nebesa, to mesto postal moj dom.</p>'],
  ['<p class="about-body">Seit meiner Kindheit bin ich verrückt nach Tattoos; ich konnte kein schlecht gemachtes Spinnennetz vorbeiziehen sehen, ohne hypnotisiert zu werden, und kaufte jeden Aufkleber am Kiosk. Mit der Zeit wurde ich ein großer Bewunderer und Sammler der Tattoo-Kunst. Ich füllte meinen Körper mit Tinte und lernte viele Menschen aus der Tattoo-Welt kennen.</p>', '<p class="about-body">Od otroštva sem bil nor na tetovaže; nisem mogel mimo slabo narejenega pajkovega mreženja brez hipnotiziranja in kupil vsake nalepke na kiosku. Sčasoma sem postal velik oboževalec in zbiralec tetovažne umetnosti. Telo sem napolnil z tinto in spoznal veliko ljudi iz sveta tetovaž.</p>'],
  ['<p class="about-body">Mit 49 führte mich der Wunsch, mein Training zu tracken und auf meine Gesundheit zu achten, dazu, die modernste Smartwatch auf dem Markt zu kaufen.</p>', '<p class="about-body">Pri 49 letih me je želja po spremljanju vadbe in skrbi za zdravje pripeljala do nakupa najnovejše pametne ure na trgu.</p>'],
  ['<p class="about-body"><strong>Da war es — die unvollkommene Mischung: Tattoo + Smartwatch = Problem.</strong></p>', '<p class="about-body"><strong>In tu je bilo — nepopolna kombinacija: tetovaža + pametna ura = problem.</strong></p>'],
  ['<p class="about-body">Frust. Mit dem Gegenwert eines Motorrads am Handgelenk sperrte sich die Uhr ständig und verlangte ununterbrochen den Passcode. Der Wendepunkt kam bei einem Spaziergang mit meinem Onkel: Das Training pausierte alle paar Meter von selbst.</p>', '<p class="about-body">Frustracija. Z vrednostjo motorja na zapestju se je ura nenehno zaklejala in neprestano zahtevala geslo. Prelomni trenutek je prišel med sprehodom z stricem: vadba se je sama ustavljala vsakih nekaj metrov.</p>'],
  ['<h3 class="about-story-heading">Die Entdeckung und Entwicklung</h3>', '<h3 class="about-story-heading">Odkritje in razvoj</h3>'],
  ['<p class="about-body">Bei der Online-Recherche fand ich heraus, dass Tausende Menschen dasselbe Problem hatten: dunkle Tattoo-Pigmente blockieren die Lichtstrahlen biometrischer Sensoren. Die einzigen Lösungen waren Tricks: improvisierte Aufkleber, die unter der Dusche abgingen, generische Folien, die Messwerte verfälschten, und Notlösungen, die das Gerät beschädigen konnten.</p>', '<p class="about-body">Pri spletnem iskanju sem ugotovil, da so tisoči ljudi imeli enak problem: temni pigmenti tetovaže blokirajo svetlobne žarke biometričnih senzorjev. Edine rešitve so bile triki: improvizirane nalepke, ki so padle pod tušem, generične folije, ki so pokvarile meritve, in začasne rešitve, ki so lahko poškodovale napravo.</p>'],
  ['<p class="about-body">Die Uhr zu verkaufen war eine Option — aber meine Tattoos wegzulassen? Niemals! Meister wie Polaco, Mauro Landim und André Rodrigues würden mir das nie verzeihen.</p>', '<p class="about-body">Prodaja ure je bila možnost — a odstraniti tetovaže? Nikoli! Mojstri, kot so Polaco, Mauro Landim in André Rodrigues, mi tega nikoli ne bi oprostili.</p>'],
  ['<p class="about-body">3N20 gibt es seit über 20 Jahren, mit Fokus auf Softwareentwicklung — ich hatte nie daran gedacht, in Hardware-Lösungen zu investieren. Nach vielen Tests mit Hochleistungsmaterialien und angewandter Technik fanden wir die Antwort: zuerst ein Kleber, der im Wasser nicht abgeht, dann eine präzise optische Linse.</p>', '<p class="about-body">3N20 obstaja že več kot 20 let, osredotočen na razvoj programske opreme — nikoli nisem razmišljal o vlaganju v strojne rešitve. Po številnih testih z visokozmogljivimi materiali in uporabno tehniko smo našli odgovor: najprej lepilo, ki ne odpade v vodi, nato natančna optična leča.</p>'],
  ['<p class="about-body">Mit wasserbeständiger Haftung und einer Linse, die Licht perfekt durch die Tinte bricht: voilà! Sensor Tattoo Fix war geboren.</p>', '<p class="about-body">Z vodoodpornim lepljenjem in lečo, ki svetlobo popolnoma lomi skozi tinto: voilà! Sensor Tattoo Fix je bil rojen.</p>'],
  ['<p class="about-body">Die Verkäufe wuchsen über unseren offiziellen Shop und Mundpropaganda: ein Verkauf, dann 10, 40, 400.</p>', '<p class="about-body">Prodaja je rasla prek naše uradne trgovine in ustnega posredovanja: ena prodaja, nato 10, 40, 400.</p>'],
  ['<h3 class="about-story-heading">Legitimität und patentierte Innovation</h3>', '<h3 class="about-story-heading">Legitimnost in patentirana inovacija</h3>'],
  ['<p class="about-body">Was als persönliches Projekt begann, funktionierte so gut, dass wir es der Welt zugänglich machen wollten. Wir haben unsere Struktur angepasst und die Innovation patentiert, um die Authentizität des Produkts in Brasilien und im Ausland zu schützen:</p>', '<p class="about-body">Kar se je začelo kot osebni projekt, je delovalo tako dobro, da smo ga hoteli omogočiti svetu. Prilagodili smo strukturo in patentirali inovacijo, da zaščitimo avtentičnost izdelka v Braziliji in v tujini:</p>'],
  ['aria-label="Patentunterlagen"', 'aria-label="Patentna dokumentacija"'],
  ['<span class="about-patent-label">Nationales Patent · INPI</span>', '<span class="about-patent-label">Nacionalni patent · INPI</span>'],
  ['<span class="about-patent-label">Internationales Patent · PCT</span>', '<span class="about-patent-label">Mednarodni patent · PCT</span>'],
  ['<h3 class="about-story-heading">Vom Haus der Oma in die Welt</h3>', '<h3 class="about-story-heading">Od hiše babice v svet</h3>'],
  ['<p class="about-body">Heute verkauft <strong>3N20</strong> die Sensor Tattoo Fix Linse über unseren <strong>offiziellen Shop</strong> — PayPal und Karten, Sendungsverfolgung. Keine Tricks, kein Verlust von Gesundheitsfunktionen — Unterstützung von Menschen, die das Problem auf der Haut erlebt haben. Wörtlich.</p>', '<p class="about-body">Danes <strong>3N20</strong> prodaja lečo Sensor Tattoo Fix prek naše <strong>uradne trgovine</strong> — PayPal in kartice, sledenje pošiljki. Brez trikov, brez izgube zdravstvenih funkcij — podpora ljudi, ki so problem doživeli na lastni koži. Dobesedno.</p>'],
  ['<p>In einer unserer Bewertungen hieß es: <em>„Zeigt echte Kundengeschichten — das schafft Verbindung. Aber die Marke präsentiert sich noch als ‚fertige Lösung‘, ohne die Gesichter der Gründer oder die Entstehungsgeschichte zu zeigen.“</em></p>', '<p>V eni od naših ocen je bilo rečeno: <em>«Pokažite resnične zgodbe strank — to ustvarja povezavo. A blagovna znamka se še vedno predstavlja kot »gotova rešitev« brez prikaza obrazov ustanoviteljev ali zgodbe nastanka.»</em></p>'],
  ['<p class="about-closing">Also: von einem Tätowierten zu anderen, die die Kunst ebenfalls bewundern — hier ist die wahre Geschichte von Sensor Tattoo Fix.</p>', '<p class="about-closing">Torej: od tetoviranega do drugih, ki prav tako občudujejo to umetnost — tu je resnična zgodba Sensor Tattoo Fix.</p>'],
  ['alt="Fábio Nardoni, Gründer von Sensor Tattoo Fix"', 'alt="Fábio Nardoni, ustanovitelj Sensor Tattoo Fix"'],
  ['<p class="about-signature-role">Gründer · Sensor Tattoo Fix · 3N20</p>', '<p class="about-signature-role">Ustanovitelj · Sensor Tattoo Fix · 3N20</p>'],

  // faq
  ['<h2 class="section-title">Häufig gestellte Fragen (FAQ)</h2>', '<h2 class="section-title">Pogosto zastavljena vprašanja (FAQ)</h2>'],

  // onde comprar
  ['<h2 class="section-title">Wo kaufen</h2>', '<h2 class="section-title">Kje kupiti</h2>'],
  ['<p class="onde-comprar-intro">Nur offizieller Shop — PayPal &amp; Karten · Sendungsverfolgung.</p>', '<p class="onde-comprar-intro">Samo uradna trgovina — PayPal in kartice · sledenje pošiljki.</p>'],
  ['data-rotulo="Where to buy official store DE"', 'data-rotulo="Where to buy official store SL"'],
  ['<p class="onde-comprar-trust"><i class="fas fa-star" aria-hidden="true"></i> 5,0 · verifizierte Käufer</p>', '<p class="onde-comprar-trust"><i class="fas fa-star" aria-hidden="true"></i> 5,0 · preverjeni kupci</p>'],

  // contato
  ['<h2 class="section-title">Kontakt</h2>', '<h2 class="section-title">Kontakt</h2>'],
  ['<p>Fragen zur Kompatibilität oder Großbestellungen?</p>', '<p>Vprašanja o združljivosti ali veleprodajnih naročilih?</p>'],
  ['value="Kontakt — Sensor Tattoo Fix"', 'value="Kontakt — Sensor Tattoo Fix"'],
  ['placeholder="Vollständiger Name"', 'placeholder="Ime in priimek"'],
  ['placeholder="Ihre E-Mail-Adresse"', 'placeholder="Vaš e-poštni naslov"'],
  ['placeholder="Wie können wir Ihnen heute helfen?"', 'placeholder="Kako vam lahko danes pomagamo?"'],
  ['<button type="submit" class="btn-primary">Nachricht senden</button>', '<button type="submit" class="btn-primary">Pošlji sporočilo</button>'],
];

const GERMAN_LEAKS = [
  'Das Problem', 'Notlösungen', 'Jetzt kaufen', 'Über uns', 'Gründer',
  'Häufig gestellte', 'Offizieller Shop', 'Warenkorb', 'Passcode alle',
  'Smartwatch fragt', 'Harmonie zwischen', 'Menü öffnen', 'Vollständiger Name',
  'Nachricht senden', 'Was sagen die Leute', 'Ein globales Problem',
  'Passcode', 'Pulsmessung', 'Handgelenkserkennung', 'Herzfrequenz',
];

function applyLocalePatches(html) {
  let out = html;
  out = out.replace(/lang="de"/g, 'lang="sl"');
  out = out.replace(/\/de\//g, '/sl/');
  out = out.replace(/stf-i18n-de-overrides/g, 'stf-i18n-sl-overrides');
  out = out.replace(/data-lang="de"/g, 'data-lang="sl"');
  out = out.replace(/hreflang="de"/g, 'hreflang="sl"');
  out = out.replace(/og:locale" content="de_DE"/g, 'og:locale" content="sl_SI"');
  out = out.replace(/stf-lang-nav\.js\?v=\d+/g, 'stf-lang-nav.js?v=6');
  out = out.replace(
    /<li class="nav-lang-stack">[\s\S]*?<\/li>/,
    '<li class="nav-lang-stack" aria-label="Language"></li>',
  );
  out = out.replace(/WhatsApp flutuante DE/g, 'WhatsApp flutuante SL');
  return out;
}

function applyFooterScripts(html) {
  return html
    .replace(/stf-page-lang\.js\?v=\d+/g, 'stf-page-lang.js?v=2')
    .replace(/stf-i18n-sl-overrides\.js\?v=\d+/g, 'stf-i18n-sl-overrides.js?v=2')
    .replace(/stf-i18n\.js\?v=\d+/g, 'stf-i18n.js?v=49')
    .replace(/sessionStorage\.setItem\('stf_lang', '[^']+'\)/g, "sessionStorage.setItem('stf_lang', 'sl')")
    .replace(/home-content\.js\?v=\d+/g, 'home-content.js?v=3');
}

function applyRules(html) {
  let out = html;
  let applied = 0;
  for (const [from, to] of RULES) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
      applied++;
    }
  }
  return { html: out, applied };
}

function checkGermanLeaks(html) {
  const found = GERMAN_LEAKS.filter((w) => html.includes(w));
  return found;
}

fs.mkdirSync(path.dirname(DEST), { recursive: true });

let html = fs.readFileSync(SRC, 'utf8');
html = applyLocalePatches(html);
const { html: translated, applied } = applyRules(html);
html = applyFooterScripts(translated);

fs.writeFileSync(DEST, html);

const leaks = checkGermanLeaks(html);
console.log(`Regras aplicadas: ${applied} / ${RULES.length}`);
console.log(`Escrito: ${DEST}`);
if (leaks.length) {
  console.log(`⚠ Palavras alemãs restantes (${leaks.length}): ${leaks.join(', ')}`);
} else {
  console.log('✓ Nenhuma palavra alemã comum detectada.');
}
