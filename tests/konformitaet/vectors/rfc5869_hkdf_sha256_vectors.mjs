// code/test_vectors/rfc5869_hkdf_sha256_vectors.mjs
//
// Test vectors from IETF RFC 5869 Appendix A.
// RFC 5869, May 2010. Krawczyk, H. and P. Eronen,
// "HMAC-based Extract-and-Expand Key Derivation Function (HKDF)".
// https://datatracker.ietf.org/doc/html/rfc5869#appendix-A
// IETF Trust Legal Provisions allow reproduction of RFC test vectors.
//
// Bezug: AP 5.2 Test 5.2-A-09 (Plan v3 §3, Plan v3 §4).
// Drei SHA-256 Test Cases (1, 2, 3) aus RFC 5869 Appendix A.
// Test Cases 4-7 sind SHA-1-basiert oder Edge-Cases anderer Art und
// für Vivodepots HKDF-SHA-256-Konstellation nicht direkt relevant.
//
// Schema pro Test:
//   tcId       Test Case Nummer (1, 2, 3) gemäß RFC 5869 Appendix A
//   ikm        Input Keying Material (Hex-String)
//   salt       Salt (Hex-String, kann leer sein)
//   info       Info / Context-Info (Hex-String, kann leer sein)
//   L          Output-Länge in Bytes
//   prk        Pseudorandom Key aus Extract-Schritt (Hex, zur Verifikation
//              der Zwischen-Berechnung verfügbar, Web Crypto API exponiert
//              PRK nicht direkt)
//   okm        Output Keying Material aus Expand-Schritt (Hex-String) —
//              das ist der Wert, den crypto.subtle.deriveBits liefern muss

export const rfc5869HkdfSha256Vectors = [
  {
    tcId: 1,
    comment: "RFC 5869 A.1 — Basic test case with SHA-256",
    ikm:  "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
    salt: "000102030405060708090a0b0c",
    info: "f0f1f2f3f4f5f6f7f8f9",
    L:    42,
    prk:  "077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5",
    okm:  "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865",
  },
  {
    tcId: 2,
    comment: "RFC 5869 A.2 — Test with SHA-256 and longer inputs/outputs",
    ikm:  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f",
    salt: "606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeaf",
    info: "b0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff",
    L:    82,
    prk:  "06a6b88c5853361a06104c9ceb35b45cef760014904671014a193f40c15fc244",
    okm:  "b11e398dc80327a1c8e7f78c596a49344f012eda2d4efad8a050cc4c19afa97c59045a99cac7827271cb41c65e590e09da3275600c2f09b8367793a9aca3db71cc30c58179ec3e87c14c01d5c1f3434f1d87",
  },
  {
    tcId: 3,
    comment: "RFC 5869 A.3 — Test with SHA-256 and zero-length salt/info",
    ikm:  "0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
    salt: "",
    info: "",
    L:    42,
    prk:  "19ef24a32c717b167f33a91d6f648bdf96596776afdb6377ac434c1c293ccb04",
    okm:  "8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8",
  },
];
