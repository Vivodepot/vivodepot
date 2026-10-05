// enclave-signieren.swift — ES256 mit einem Schlüssel in der Secure Enclave dieses Macs (03.10.2026)
// ────────────────────────────────────────────────────────────────────────────
// Der Schlüssel entsteht in der Secure Enclave und verlässt sie nie („Works only with NIST P-256 elliptic curve
// keys“, Apple: Protecting keys with the Secure Enclave). Im Schlüsselbund liegt nur sein Verweis
// (dataRepresentation), der auf keinem anderen Gerät etwas taugt. Jede Signatur verlangt Touch ID; gebunden mit
// .biometryAny, nicht .biometryCurrentSet (der Schlüssel bliebe nach einer Fingeränderung sonst unbrauchbar).
//
// EIN KLICK FÜR VIELE SIGNATUREN: `signieren` liest die ganze Liste, zeigt sie in der Touch-ID-Abfrage an und
// signiert danach genau diese Liste mit demselben, einmal bestätigten Kontext. Der Kontext endet mit dem Prozess;
// eine zweite Liste braucht eine zweite Bestätigung.
// DIE ANZEIGE BAUT DER HELFER SELBST (03.10.2026, Gegenlesung S1): aus den Signatur-Eingaben, nicht aus einem Text des
// Aufrufers — sonst könnte ein Aufrufer „3 Rezepte“ anzeigen und etwas anderes signieren lassen. Je Eingabe stehen
// typ, slug und Prüfsumme aus der Nutzlast da, dazu die Gesamtprüfsumme über alle Eingaben (auch im Terminal).
// `anzeige` zeigt diesen Text, ohne zu signieren (für die Probe; braucht keine Secure Enclave).
//
// Befehle (Ein- und Ausgabe JSON):
//   erzeugen <kennung>      legt den Schlüssel an (nur die Person, die ihn hält; bricht ab, wenn er schon besteht)
//   oeffentlich <kennung>   gibt den öffentlichen Schlüssel als JWK aus (keine Bestätigung nötig)
//   signieren <kennung>     stdin {"eingaben": ["<JWS signing input>", …]}
//   anzeige <kennung>       wie signieren, gibt nur den Anzeigetext aus
//                           stdout {"signaturen": ["<base64url, 64 Byte r‖s>", …], "gesamt": "<sha256 der Liste>"}
// Aufgerufen von tools/lib/enclave-signierer.js; dort auch der Bau (swiftc) und die Probe.
import CryptoKit
import Foundation
import LocalAuthentication
import Security

let DIENST = "de.vivodepot.enclave-signatur"

func fehler(_ text: String) -> Never {
  FileHandle.standardError.write(("[enclave-signieren] " + text + "\n").data(using: .utf8)!)
  exit(1)
}

func b64u(_ d: Data) -> String {
  d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
    .replacingOccurrences(of: "=", with: "")
}

func verweisLesen(_ kennung: String) -> Data? {
  let anfrage: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: DIENST,
                                kSecAttrAccount as String: kennung, kSecReturnData as String: true]
  var ergebnis: CFTypeRef?
  return SecItemCopyMatching(anfrage as CFDictionary, &ergebnis) == errSecSuccess ? ergebnis as? Data : nil
}

func verweisSchreiben(_ kennung: String, _ daten: Data) {
  let eintrag: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: DIENST,
                                kSecAttrAccount as String: kennung, kSecValueData as String: daten,
                                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
  let status = SecItemAdd(eintrag as CFDictionary, nil)
  if status != errSecSuccess { fehler("Schlüsselbund: Eintrag nicht geschrieben (Status \(status))") }
}

func b64uDecode(_ s: Substring) -> Data? {
  var t = s.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
  while t.count % 4 != 0 { t += "=" }
  return Data(base64Encoded: t)
}

func hex(_ d: some Sequence<UInt8>) -> String { d.map { String(format: "%02x", $0) }.joined() }

/* Je Eingabe eine Zeile aus der NUTZLAST (zweiter Teil von „kopf.nutzlast“): typ, slug, rezeptPruefsumme, sonst die
   Prüfsumme der Eingabe. Kopfzeile: Anzahl und Gesamtprüfsumme (SHA-256 über die Eingaben, je mit \n getrennt). */
func anzeigeAus(_ eingaben: [String]) -> (text: String, gesamt: String) {
  var zeilen: [String] = []
  var typen = Set<String>()
  for (i, e) in eingaben.enumerated() {
    let teile = e.split(separator: ".", omittingEmptySubsequences: false)
    var zeile = "· Eingabe \(i + 1): " + String(hex(SHA256.hash(data: Data(e.utf8))).prefix(12))
    if teile.count == 2, let roh = b64uDecode(teile[1]),
       let n = try? JSONSerialization.jsonObject(with: roh) as? [String: Any] {
      let typ = n["typ"] as? String ?? "?"
      typen.insert(typ)
      let slug = n["slug"] as? String ?? "?"
      let summe = (n["rezeptPruefsumme"] as? String).map { String($0.prefix(12)) } ?? String(hex(SHA256.hash(data: Data(e.utf8))).prefix(12))
      zeile = "· \(slug) \(summe)"
    } else { typen.insert("unbekannt") }
    zeilen.append(zeile)
  }
  let gesamt = hex(SHA256.hash(data: Data(eingaben.joined(separator: "\n").utf8)))
  let was = typen == ["vivodepot/rezept"] ? "Vivodepot: Rezepte freigeben" : "Vivodepot: signieren (" + typen.sorted().joined(separator: ", ") + ")"
  let text = was + " — \(eingaben.count) Signatur" + (eingaben.count == 1 ? "" : "en") + ", gesamt " + String(gesamt.prefix(16)) + ":\n" + zeilen.joined(separator: "\n")
  return (text, gesamt)
}

func jwk(_ k: P256.Signing.PublicKey) -> [String: String] {
  let roh = k.rawRepresentation
  return ["kty": "EC", "crv": "P-256", "x": b64u(roh.prefix(32)), "y": b64u(roh.suffix(32))]
}

func ausgeben(_ objekt: Any) {
  let d = try! JSONSerialization.data(withJSONObject: objekt, options: [.sortedKeys])
  FileHandle.standardOutput.write(d)
  FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}

let argumente = CommandLine.arguments
guard argumente.count == 3, ["erzeugen", "oeffentlich", "signieren", "anzeige"].contains(argumente[1]) else {
  fehler("Aufruf: enclave-signieren erzeugen|oeffentlich|signieren|anzeige <kennung>")
}
let befehl = argumente[1]
let kennung = argumente[2]
guard kennung.range(of: "^[a-z0-9][a-z0-9-]{0,62}$", options: .regularExpression) != nil else { fehler("ungültige Kennung") }
func eingabenLesen() -> [String] {
  let eingabe = FileHandle.standardInput.readDataToEndOfFile()
  guard let objekt = try? JSONSerialization.jsonObject(with: eingabe) as? [String: Any],
        let eingaben = objekt["eingaben"] as? [String], !eingaben.isEmpty else {
    fehler("stdin: {\"eingaben\": [ … ]} erwartet")
  }
  if objekt["anzeige"] != nil { fehler("eine vorgegebene Anzeige wird nicht angenommen — der Helfer baut sie selbst") }
  return eingaben
}

if befehl == "anzeige" {
  let a = anzeigeAus(eingabenLesen())
  ausgeben(["anzeige": a.text, "gesamt": a.gesamt])
  exit(0)
}
guard SecureEnclave.isAvailable else { fehler("dieser Rechner hat keine Secure Enclave") }

switch befehl {
case "erzeugen":
  if verweisLesen(kennung) != nil { fehler("für „\(kennung)“ besteht schon ein Schlüssel — nichts überschrieben") }
  var cfFehler: Unmanaged<CFError>?
  guard let zugriff = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                                                      [.privateKeyUsage, .biometryAny], &cfFehler) else {
    fehler("Zugriffsregel nicht erzeugt")
  }
  do {
    let schluessel = try SecureEnclave.P256.Signing.PrivateKey(accessControl: zugriff)
    verweisSchreiben(kennung, schluessel.dataRepresentation)
    ausgeben(["kennung": kennung, "jwk": jwk(schluessel.publicKey)])
  } catch { fehler("Schlüssel nicht erzeugt: \(error.localizedDescription)") }

case "oeffentlich":
  guard let verweis = verweisLesen(kennung) else { fehler("kein Schlüssel „\(kennung)“ auf diesem Rechner") }
  do {
    let schluessel = try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: verweis)
    ausgeben(["kennung": kennung, "jwk": jwk(schluessel.publicKey)])
  } catch { fehler("Schlüssel nicht lesbar: \(error.localizedDescription)") }

default:  // signieren
  guard let verweis = verweisLesen(kennung) else { fehler("kein Schlüssel „\(kennung)“ auf diesem Rechner") }
  let eingaben = eingabenLesen()
  let (anzeige, gesamt) = anzeigeAus(eingaben)
  FileHandle.standardError.write(("[enclave-signieren] " + anzeige + "\n[enclave-signieren] Gesamtprüfsumme " + gesamt + "\n").data(using: .utf8)!)
  let kontext = LAContext()
  kontext.localizedReason = anzeige
  var bestaetigt = false
  var grund: Error?
  let warten = DispatchSemaphore(value: 0)
  kontext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: anzeige) { ok, f in
    bestaetigt = ok; grund = f; warten.signal()
  }
  warten.wait()
  guard bestaetigt else { fehler("nicht bestätigt: \(grund?.localizedDescription ?? "abgebrochen")") }
  do {
    let schluessel = try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: verweis, authenticationContext: kontext)
    var signaturen: [String] = []
    for e in eingaben {
      guard let d = e.data(using: .utf8) else { fehler("Eingabe nicht lesbar") }
      signaturen.append(b64u(try schluessel.signature(for: d).rawRepresentation))
    }
    kontext.invalidate()
    ausgeben(["signaturen": signaturen, "gesamt": gesamt])
  } catch { fehler("Signatur fehlgeschlagen: \(error.localizedDescription)") }
}
