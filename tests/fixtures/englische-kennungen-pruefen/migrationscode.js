// Fixture: simuliert die Migrationsstufe, die den alten Schlüssel NENNEN muss,
// um ihn umzuschreiben — steht in der Ausnahmeliste, ist kein Verstoß.
if (data['bereich.altesFeld'] !== undefined) {
  data['area.newField'] = data['bereich.altesFeld'];
  delete data['bereich.altesFeld'];
}
