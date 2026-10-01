# 1EdTech Digital Credentials Public Validator — aus der offiziellen Quelle gebaut (U2-ADR-445)
# 1EdTech verteilt kein fertiges Image und kein Release-JAR (gemessen 28.09.2026). Gepinnt sind die Quelle
# (Archiv am Commit des Tags v1.11.3, SHA-256) und beide Basis-Images (Digest). Das Kernmodul inspector-core
# kommt als Binärdatei aus dem öffentlichen Maven-Server von 1EdTech (nexus.1edtech.net, checksumPolicy fail
# im pom.xml der Quelle); seinen Quellcode veröffentlicht 1EdTech nicht. Das gebaute JAR ist nicht
# reproduzierbar — seine Image-ID dient nur als Cache-Prüfung, nie als Pin.
# Gebaut von: node tools/1edtech-validator-beschaffen.mjs
FROM maven:3.9.9-eclipse-temurin-17@sha256:f58d59b6273e785ac0a4477f6e9b5ba1d7731c75b906c0f7b34076f1851318cc AS bau
ADD --checksum=sha256:221504cabced1532e25a2c708831edcb4dab4f2eb0ab0657fdb0c671cb271068 https://github.com/1EdTech/digital-credentials-public-validator/archive/9995ad9da1fbc5475ef9841c466e59f83d300b5f.tar.gz /quelle.tar.gz
RUN mkdir /quelle && tar xzf /quelle.tar.gz -C /quelle --strip-components=1
WORKDIR /quelle
RUN mvn -B -q -DskipTests package -pl inspector-vc-web -am

# Laufzeit wie im Dockerfile der Quelle (inspector-vc-web/Dockerfile): Temurin 17 und libsodium.
FROM eclipse-temurin:17-jdk-jammy@sha256:60fcdd4a85c94a23ef86d0d55867c6a8dbc4f7c3efc8286e259956c3ea4ef08c
RUN apt-get update && apt-get install -y --no-install-recommends libsodium23 && rm -rf /var/lib/apt/lists/*
COPY --from=bau /quelle/inspector-vc-web/target/inspector-vc-web.jar /app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
