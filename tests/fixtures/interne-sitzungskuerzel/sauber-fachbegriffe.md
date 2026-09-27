# Fachbegriffe, die den Wächter NICHT auslösen dürfen (erfunden)

Dieses Dokument ist frei erfunden für die Negativkontrolle des Wächters
`tools/interne-sitzungskuerzel-pruefen.js`. Jede Zeile hier ist ein
Fachbegriff oder eine Zeichenkette, die dem Sitzungskürzel-Muster oberflächlich
ähnelt, es aber nicht erfüllt.

- Ein Impfnachweis kann ein DCC (EU Digital Covid Certificate) tragen. Das
  Kürzel besteht aus drei Buchstaben ohne Ziffer und erfüllt darum nicht
  DC gefolgt von einer Ziffer.
- Metadaten im dc:-Namensraum (Dublin Core) wie dc:creator oder dc:title
  sind ein Metadatenstandard, kein Sitzungskürzel.
- Ein DID (Decentralized Identifier) wie did:web:beispiel.example trägt keine
  Ziffernfolge unmittelbar nach den Buchstaben DC oder VD.
- Eine Akzentfarbe ist als Hex-Wert #2bbcdc12 hinterlegt — die Ziffernfolge
  "12" grenzt zwar an die Buchstaben "dc", aber das vorangehende "c" in
  "bcdc" ist selbst ein Wortzeichen, darum entsteht dort keine Wortgrenze.
- Ein Base64-Fragment eines Schriftschnitts enthält zufällig die Zeichenfolge
  "avdc127xyz" — auch hier verhindert die umgebende Alphanumerik die
  Wortgrenze vor und nach dem vermeintlichen Kürzel.
- Eine Belegnummer lautet AVD204 — der vorangestellte Buchstabe nimmt der
  Ziffernfolge die Wortgrenze, die das Muster vor dem Kürzel verlangt.
- Der Markenname "Vivodepot" selbst trägt weder die Buchstabenfolge "vd"
  noch "dc" unmittelbar benachbart (V-i-v-o-d-e-p-o-t).
- Eine Versionsnummer wie v4.9.1 enthält kein "D" nach dem "V" und damit gar
  keine der beiden Buchstabenfolgen.
