Alias: $beispiel = https://example.org/fhir/CodeSystem/beispiel-typ

CodeSystem: BeispielTyp
Id: beispiel-typ
* ^url = "https://example.org/fhir/CodeSystem/beispiel-typ"
* ^status = #active
* #brief "Brief"
* #vollmacht "Vollmacht" "Eine erfundene Vollmacht-Art für die Fixture"

ValueSet: BeispielTypVS
* ^url = "https://example.org/fhir/ValueSet/beispiel-typ"
* include codes from system $beispiel
* #fremd "Kein Konzept des CodeSystems"
