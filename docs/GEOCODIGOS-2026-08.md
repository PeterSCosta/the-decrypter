# Lista final — geocódigos candidatos à bancada (The Decrypter)

> **Correção que precede toda decisão:** **Itajaí é `4208203`**. O `4208302` é **Itapema**. A Frente 3 usou o código errado em *todos* os seus exemplos (CAR, setor censitário, prefixos). Agravante: **o DV não pega esse erro** — os dois códigos são DV-válidos. O DV é porteiro contra número aleatório, não contra troca de município; a tabela é que manda.
>
> **Regra de arquitetura que vale para tudo abaixo:** o decoder `location` termina num **Geohash frouxo com `forcedScore 0.90`**. Qualquer formato novo de MAIÚSCULA+dígitos perde por construção se nascer como decoder solto. Todos os aprovados entram **dentro de `detectLocation`, antes do Geohash** (como MGRS/GEOREF/GARS já fazem) — e por isso **não somam nenhum decoder aos ~106**.

---

## 1. Os que valem

| sistema | como se parece | assinatura | decodifica offline? | esforço | destino |
|---|---|---|---|---|---|
| **Geo URI (RFC 5870)** | `geo:-26.9194,-49.0661;u=35` | **Forte** — esquema `geo:` registrado na IANA, não existe em mais nada. *Medido*: hoje não casa em nada (o `parseDD` ancora `^…$` e o prefixo o mata) | **Sim, total** — é só parsing | ~10 linhas | **Leque** (ramo de `detectLocation`) |
| **OSM shortlink** | `https://osm.org/go/M_NHnvWM` | **Fortíssima** — prefixo literal `osm.org/go/`. **A forma nua (`M_NHnvWM`) não tem assinatura: exigir o prefixo** | **Sim** — Morton/Z-order + base64 modificada | ~15 linhas | **Leque** |
| **Placekey (where part)** | `@khg-8w9-89z` ou `zzw-22y@5vg-7gt-qzz` | **Forte com o `@`; nula sem ele.** *Medido*: `khg-8w9-89z` sem arroba cai em `youtube[0.50]`; a regex nua casa com 3,4% das triplas de palavras de 3 letras (75,7 mi de 2,197 bi) | **Sim** — BigInt + `h3-js`, que **já é dependência** | ~40 linhas; armadilha resolvida: somar **255** aos dígitos não usados ao remontar o índice H3 (só o filler 256 deixa `…f00` e o h3-js reprova) | **Leque** |
| **ISO 6709 canônico** | `-26.9194-049.0661/` | **Boa** — sinal obrigatório nos dois, lon com pad de **3** dígitos, **barra final**. O DD comum não tem nenhuma das três | **Sim** — só padding/parsing | ~15 linhas | **Leque** |
| **C-squares** | `5204:469:390` | **Forte** — `:` entre grupos, 1º dígito ∈ {1,3,5,7}, quadrante de ciclo ∈ {1,2,3,4}. *Medido*: slot limpo (n=5/6, tudo ≤0,27). **Exigir ao menos um `:`** (4 dígitos nus = WMO square = sem assinatura) | **Sim** — conta pura, zero base | ~20 linhas. **Correção da spec das frentes:** os ciclos **não são sempre de 3** — a spec 1.1 da CSIRO tem `7307:4` (5°) e `7307:487:3` (0,5°); o regex precisa aceitar ciclo final de 1 dígito | **Leque** |
| **CAR (SICAR)** | `SC-4202404-D9ADE9…485A` (32 hex) | **A melhor de todo o levantamento** — UF válida + 7 dígitos com DV IBGE conferível + exatos 32 hex maiúsculos. *Medido*: sem colisão | **Meio a meio (honesto):** UF+município **sim, sem base nenhuma**; o polígono **não** (base do SICAR, e a consulta pública redireciona 302 para captcha) | DV do IBGE (10 linhas) + regex. **Destrava o setor censitário de brinde** | **Leque**, entregando meia resposta certa |
| **BCI de Itajaí** (inscrição imobiliária) | `201.020.03.0051` | **Boa** — `\d{3}\.\d{3}\.\d{2}\.\d{4}` com padding não colide com IP (4 grupos), semver nem data. *Medido*: n=6, nada relevante | **Sim, com base** — ArcGIS de Itajaí aberto, sem token | Puxar a base cheia (a camada testada é demonstrativa, 650 feições; as cheias são `lotes`, `secfaz_cadastrolotes`, `cadastroimoveispts`) | **Leque** |
| **IQ de Blumenau** (inscrição imobiliária) | `4-1-24-17-14` | **Média** — o funil (p1∈2-4, p2∈1-5, p3≤24, p4≤38) + pertencer à base é estreito, mas *medido*: colide com `barcode[0.85] EAN-8 válido` e `ncm[0.55]`. Vai **disputar posição** com um EAN-8 legítimo | **Sim, com base** — 84.540 centroides ≈ **1,2 MB** comprimido (menor que a base de postes já embarcada) | Extração + funil + desempate contra o EAN-8 | **Leque, atrás do BCI** |
| **BDG / estações geodésicas do IBGE** | `RN 1400M`, `9304C`, `99861` | **Fraca isolada, boa com portão duplo:** prefixo `RN`/`RN-` **ou** pertencimento à base recortada de SC. *Medido*: `1400M` sozinho já vira Geohash 0.90 | **Sim** — API REST aberta, sem chave nem captcha; **20 registros em Blumenau, 17 em Itajaí** | Baixar SC uma vez; base minúscula | **Leque** — e é o achado mais "gincana" das três frentes: **chapa de bronze que a equipe vai tocar** |
| **NAC (Natural Area Code)** | `BWB18 BHD2P` (lon **primeiro**) | **Média** — dois grupos de **comprimento igual ≥4**, sem vogal, separados por espaço. *Medido*: não colide. Risco: Plus Code partido | **Sim** — é só mudança de base 30 | ~15 linhas | **Leque, por último.** A obscuridade é a favor (mesma razão de GeoTude/GeoHex) |
| **UN/LOCODE recortado ao Brasil** | `BRITJ`, `BRBNU` | **Média** — 5 letras só sobrevivem com a base como portão (~4 mil linhas BR) | **Sim** — CSV da UNECE, coordenada em DDMM, sem chave | Recorte BR | **Leque.** Não colide com o decoder de aeroportos (ICAO 4 / IATA 3); tema portuário em Itajaí justifica |
| **Setor censitário (15 díg.)** | `4202404………` | **Boa só por herança** — os 7 primeiros têm de formar geocódigo IBGE com DV válido. Sozinho, DV de 1 dígito deixa passar 10% do lixo | **Parcial** — UF/município/distrito por conta; o polígono exige a malha (recorte de Blumenau+Itajaí = poucos MB) | Quase zero se o DV já existir | **Leque, como ramo do `ibge-municipio` que já existe** — não decoder novo |
| **ISO 3166-2 / HASC** | `BR-SC` / `BR.SC` | **Boa pelo separador**, mas colide com prefixo de território do Mapcode e com o decoder `pais` | **Sim** — 27 linhas hardcoded | Trivial | **Leque, como extensão do decoder `pais`.** Resolve só até UF; valor baixo, custo ~zero |
| **Estações da ANA / HidroWeb** | `83800002` | **Fraca** — dígito puro. Só com portão "prefixo **83/84** *e* existe na base". *Medido*: colide com `ncm[0.55]` e `hash-id[0.50]` | **Sim** — SOAP legado `ServiceANA.asmx` responde sem chave (o HidroWeb novo já exige token: 401) | Baixar o inventário (poucos MB) | **Leque, item mais frágil que ainda recomendo.** A régua do Itajaí-Açu no centro de Blumenau *é* a 83800002 |

**Peça de infraestrutura (não é decoder):** **DV do geocódigo IBGE** — pesos 1,2,1,2,1,2 com soma dos algarismos do produto. Dez linhas que rendem três vezes: validam o CAR, o setor censitário e o `ibge-municipio` que já existe.

---

## 2. O código de Blumenau em cada um

### Gerados e conferidos contra exemplo publicado ou fonte ao vivo

| sistema | Blumenau | Itajaí | como foi conferido |
|---|---|---|---|
| **C-squares** | `5204:469:390` (0,1°) · `5204:469` (1°) · `5204` (10°) | `5204:468:496` | Implementação validada contra os **3** exemplos da spec (`1101:112`, `1000:100:100`, `1817`) antes de rodar o Vale |
| **OSM shortlink** | `https://osm.org/go/M_NHnvWM` (z16) · `…/M_NHnv--` (z9) | `https://osm.org/go/M_NtZyxP` | Exemplo do wiki do OSM reproduzido exato, **inclusive os dois hífens** (`0EEQjE--` = 51.5110/0.0550 z9) — conferido em **duas** frentes |
| **Placekey** | `@khg-8w9-89z` (volta em −26,919187 / −49,065705) | `@khg-bt6-jy9` (−26,908162 / −48,662303) | Exemplo canônico do Ferry Building reproduzido: `zzw-22y@5vg-7gt-qzz` → 37,7953 / −122,3940 |
| **ISO 6709** | `-26.9194-049.0661/` · com altitude `-26.9194-049.0661+21.0CRSWGS_84/` | `-26.9078-048.6618/` | Formatação direta pela norma. Armadilha real: **2 dígitos na lat, 3 na lon** (`-026.9194` está errado) |
| **Geo URI** | `geo:-26.9194,-49.0661;u=35` | `geo:-26.9078,-48.6618` | Trivial; e *medido* que hoje não dispara nada |
| **NAC** | `BWB18 BHD2P` (5+5) · `BWB187GZ BHD2P000` (8+8) | `BXBBX BHFSW` | Único exemplo público (Bruxelas `HBV6R RG77T`) reproduzido caractere a caractere |
| **Mapcode** *(já no repo)* | `BR-SC 2LC.7P` · `AAA 9C8K5.8MN7` | `BR-SC V1H.2N` · `AAA 9C9XN.PBRB` | Round-trip: `AAA 9C8K5.8MN7` → −26,919402 / −49,066119. **Só a forma `AAA` é auto-suficiente** (467 de 533 territórios aceitam a mesma forma curta) |
| **IBGE município** | **`4202404`** | **`4208203`** ← *corrigido* | Fonte IBGE; DV conferido por conta pura nos dois |
| **IQ de Blumenau** | `4-1-24-17-14` → **−26,917503 / −49,072771** (quarteirão do Teatro Carlos Gomes). Também `4-1-24-16-22` → −26,916843 / −49,071111 e `4-1-23-23-54` → −26,917705 / −49,074442 | *(Itajaí não usa este formato)* | Puxado ao vivo do ArcGIS de Blumenau (`Cadastro_Imobiliario/Lotes`, `outSR=4326`) |
| **BCI de Itajaí** | *(Blumenau não usa este formato)* | `201.020.03.0051` → **−26,910503 / −48,656356** (R. Camboriú, 309). Também `216.173.01.0130` e `216.230.01.0080` | Puxado ao vivo do ArcGIS de Itajaí |
| **BDG / IBGE** | **RN 1400M** → −26,882031 / −49,102575 (*chapa na mureta da ponte Gov. Adolfo Konder, sobre o Itajaí-Açu*) · **RN 1400C** → −26,894444 / −49,084444 (*base do monumento ao Cel. Feddersen*) · **1400S / 8121259** → −26,951111 / −49,077222 (*pilar piramidal no pátio da repetidora da Celesc*) | **9304C** → −27,141111 / −48,593056 (*marco com chapa "RN-1 Marinha"*) | API `servicodados.ibge.gov.br/api/v1/bdg` respondendo em 18/08/2026 |
| **ANA / HidroWeb** | **83800002** = BLUMENAU (PCD) → −26,9186 / −49,0656 (~250 m do marco zero) · `83700002` → −26,8925 / −49,1389 · `83800000` (PCH Salto) · `84017010` (Rio Garcia) | *sem estação própria* — as do baixo Itajaí-Açu ficam nos vizinhos | SOAP `HidroInventario` respondendo em 18/08/2026 |
| **UN/LOCODE** | **BRBNU** | **BRITJ** (Porto de Itajaí) | Busca web em múltiplas fontes de rastreamento portuário |
| **ISO 3166-2 / HASC** | `BR-SC` / `BR.SC` (só até UF) | idem | Exemplo direto da norma |
| **CAR** | prefixo **`SC-4202404-`** + 32 hex | prefixo **`SC-4208203-`** + 32 hex ← *corrigido* | O prefixo é gerável e verificável **offline**; o hash de 32 hex é **aleatório e não se gera** |
| **Setor censitário** | prefixo **`4202404`**……… | prefixo **`4208203`**……… ← *corrigido* | Estrutura confirmada na doc do Censo 2022; o ponto exige a malha |

### Onde NÃO consegui — e por quê

| sistema | situação |
|---|---|
| **QDGC** | Gerado (`W049S26DDD` / `W048S26CDC`) mas **NÃO VERIFICADO**: não há exemplo publicado no hemisfério sul-oeste. A célula-base `W049S26` contém Blumenau corretamente, mas a **convenção das letras A/B/C/D no quadrante SO é dedução**. Só confiar depois de validar contra a lib do `ragnvald` — e como o sistema vai para a aba, não vale o esforço |
| **Marsden square 212** | **NÃO VERIFICADO** — conta própria, não conferida contra tabela publicada |
| **CIAD (ANAC)** de Blumenau (SSBL) e Itajaí (SSIJ) | **Não fixado** — as duas URLs de dados abertos da ANAC voltaram vazias; o caminho do CSV mudou |
| **Sinal náutico (DHN)** — Farol de Cabeçudas, Farolete do Molhe Sul, Ponta do Varrido | **Não extraído** — os números nacionais estão no PDF da 40ª edição (2026-2027) da Lista de Faróis. Pendência de extração, não dúvida de formato |
| **Ottocódigo Pfafstetter** do Itajaí | **Não fixado dígito a dígito** — e, sem assinatura, não entraria no leque de qualquer forma |
| **SIGEF/INCRA** | Nenhum par verificado: o WFS do `acervofundiario.incra.gov.br/geoserver/ows` devolveu **404**, o caminho mudou |
| **CIB (Receita/SINTER)** | **Impossível** — a base não é de consulta pública |
| **DIGIPIN** | **Não existe para Blumenau.** A fonte oficial do India Post **lança `"Latitude out of range"`** (caixa: lat 2,5–38,5 / lon 63,5–99,5). Verificado rodando o código oficial |
| **HTM/QTM, rHEALPix, Fullercode, Geohash-36, SayWhere, A5(parcial), S2** | Não gerados por decisão: sem lib, sem spec fechada, ou sem valor que justifique implementar à mão |
| **OSNG, JIS X 0410, Eircode, GhanaPostGPS, postcode da Nigéria** | Não existe código de Blumenau — cobertura geográfica exclui o Brasil |

**Ressalva de procedência:** a peneira **não** reimplementou os algoritmos de C-squares, NAC, QDGC e Geohash-36, nem re-consultou os endpoints do IBGE/BDG e da ANA. Esses valores vêm de **uma** frente cada, com o método de conferência descrito acima.

---

## 3. Os que ficam de fora

### Sem assinatura (o critério que já reprovou o S2 — **manter a rejeição escrita**)

| sistema | veredito |
|---|---|
| **A5** | **Aba.** Hex de 64 bits, idêntico ao S2. *Medido*: `37d1ef0d25480000` já cai como Geohash 0.90 → −25,03744 / −120,77202. É a melhor engenharia da lista (células de área rigorosamente igual, `a5-js@0.9.0` Apache-2.0), e **engenharia boa não cria assinatura**. Dizer isso alto: a tentação de adotar é grande |
| **S2 (CellId e token)** | **Aba.** O token hex é marginalmente melhor que o inteiro e ainda assim colide com `hash-id` |
| **Geohash-36** | **Aba, duas reprovações.** `npm/geohash36` responde **404**; *medido*, `KtDBPtj39N` já é respondido como Geohash 0.90 → −14,03474 / 26,70404. Checksum **opcional** não é assinatura. A Frente 1 superestimou |
| **QDGC** | **Aba.** *Medido*: `W049S26DDD` → Geohash 0.90 (0,26549 / 93,70594). Some a irrelevância geográfica (atlas de biodiversidade africana) |
| **HTM / QTM** | **Aba.** *Medido*: `N3200123` → Geohash 0.90. E ~150 linhas de trigonometria esférica pelo retorno |
| **WMO squares** | **Aba, de graça.** É literalmente o prefixo de 4 dígitos do C-square — documentar, não gastar disparo. E `5204` cobre meio Sul do Brasil |
| **Marsden squares** | **Aba, por completude histórica.** *Medido*: `212` já dispara `ddi`, `roman`, `pais` |
| **CIAD (ANAC)** | **Aba.** *Medido*: `SC0004` dispara Geohash 0.90 **e** `local-geocode[0.50]` **afirmando "Blumenau"** — resposta plausível e errada no escopo certo, pior que ruído |
| **Ottocódigo de Pfafstetter** | **Aba.** Inteiro sem prefixo, sem separador, sem DV — precisamente o critério do S2. Invenção brasileira, merece a nota de catálogo |
| **HEALPix / ISEA / COBE / IVEA** | **Aba, "grades científicas".** Não existe string de ponto: `ISEA4H9` nomeia a **grade**, não o lugar |
| **Órbita/ponto do INPE (`220/079`), estação do INMET (`A817`), poço SIAGAS (10 díg.), Fistel/Anatel, NIRF, código SNCR, logradouro DNE** | **Fora até da aba.** Dois números com barra, letra+3 dígitos, número puro — e nenhum resolve em ponto ou tem objeto físico legível na rua |

### Proprietário / sem spec pública

- **GhanaPostGPS** — o algoritmo ("Spiral Matrix Postcode") **nunca foi publicado**; só a API deles. Vivo e **fechado** são coisas diferentes. Aba, uma linha.
- **Eircode / OpenPostcode** — os 4 caracteres finais **não codificam posição**, só apontam para a base ECAD, licenciada e paga. Aba, uma linha.
- **CIB (Receita/SINTER)** — não vira coordenada por conta nenhuma e a base não é aberta. Aba, **com nota de reavaliação**: é o futuro identificador único do imóvel brasileiro (LC 214/2025); se o SINTER abrir consulta, promove.
- **Postcode da Nigéria** — **ainda não nasceu** (1ª fase anunciada para outubro/2026). Registrar para não confundir anúncio com sistema; reavaliar em 2027.
- **Matrícula de cartório, hidrômetro/poço de visita do SAMAE e do SEMASA** — sem base pública, sem formato nacional único.
- **WhatFreeWords** — **fora de tudo.** Repo derrubado por ameaça jurídica da what3words em 2021: risco legal sem ganho, já que o what3words está contemplado.

### Abandonado / vaporware

- **Geopeg** — **fora até da aba.** Busca dirigida por `"Geopeg"` e `"London.RedFish"` não retorna **nada**: sem site, sem repo, sem menção independente. Existe na tabela da Wikipedia e em lugar nenhum mais. No máximo, nota de rodapé de que foi investigado.
- **Fullercode** — **fora.** `npm/fullercode` responde **404**; a página "under the hood" não fecha a convenção de montagem; **0 estrelas em 10 repositórios** (com portes para Z80 e Fig-Forth, o que já diz o tamanho da coisa). Alfabeto colide com Plus Code truncado e com placa.
- **SayWhere** — **aba, como curiosidade.** Existe de verdade (Codeberg, último commit 11/07/2026), mas **2 estrelas**, projeto de uma pessoa, sem npm, e **GPL-3.0 contagiosa**. Ninguém no mundo real cola um SayWhere numa gincana.
- **Munich Orientation Convention, DIME, TIN DEM, Arakawa Grids** — **fora.** Órfãos bibliográficos ou modelos de dados que não são geocódigo (DIME é interpolação de faixa predial dos anos 1970; Arakawa é arranjo de variáveis em modelo atmosférico).
- **FIPS 10-4** (retirado em 2008) e **WOEID** (API do Yahoo! descontinuada) — mortos.

### Só faz sentido fora do Brasil

- **DIGIPIN** — dói descartar: é o sistema nacional novo mais sério do levantamento (India Post + IIT Hyderabad + NRSC-ISRO, quadtree 4×4 em 10 níveis, ~40 linhas, zero base, formato revisado em 2026 para string contínua sem pontuação). **Mas a caixa é a Índia** e todo acerto local seria falso. Aba, e é o melhor conteúdo de aba da lista.
- **OSNG / Irish Grid** — Grã-Bretanha e Irlanda; ainda exige Helmert de 7 parâmetros. Aba.
- **JIS X 0410 / World Grid Squares** — a fórmula assume lon 100–180E. Aba.
- **State Plane, LV95, RT90, ITM, NIG, HGRS87, Bermuda National Grid, UPS** — pares de metros sem assinatura nenhuma, cobertura que exclui o Brasil (o UPS só existe acima de 84N / abaixo de 80S). Fora.
- **Bloco administrativo estrangeiro** — NUTS, GEOID, SGC, GSS/ONS, HUC, ICES, NTS, FIPS, SALB, Longhurst, UN M.49, MARC, IOC, FIFA, ITU. **Um bloco único na aba, sem decoder.** Curiosidade: o mar em frente a Itajaí cai na província Longhurst **SATL**; Blumenau, sendo terra firme, não tem código Longhurst.
- **Local OLC de Cabo Verde e National Level Addressing Grid (Índia)** — são **adaptações** do Plus Code, não formatos novos; muda só o encurtamento por nome de localidade.

### Exige base grande / não é código curto

- **CNEFE 2022 (IBGE)** — **não é decoder, é BASE — e é o melhor achado de base das três frentes.** Endereço → coordenada com **precisão de porta**, aberto, sem chave; o Censo 2022 foi o primeiro 100% georreferenciado em campo. Recortado em Blumenau+Itajaí é embarcável e é **mais fino que CEP e que o rol de ruas**, que a bancada já usa. Vai em **`BASES_GEO`**, ao lado de Postes/CEP/ruas — não em `GRUPOS_GEO`.
- **SIGEF/INCRA** — o código da parcela é **UUID**: dispararia em qualquer UUID colado, e o identificador **não carrega informação geográfica alguma** (ao contrário do CAR, que carrega UF e município no próprio código). Isso derruba o valor. Aba e link.
- **Sinal náutico da DHN** — formato aceitável (`^[A-Z]\s?\d{4}(\.\d{1,2})?$` + base), farol de Cabeçudas é o marco mais fotogênico de Itajaí, mas **ninguém cola "G 1234"** e a extração do PDF ficou pendente. **Backlog de base**, não decoder.
- **Códigos postais estrangeiros** (ZIP/ZIP+4, PIN, CEDEX, UK/AU/NZ) — cobertura errada e/ou base licenciada. **Exceção:** o **CEP** já está na bancada — garantir só que a aba diga que **CEP é geocódigo hierárquico** (`89xxx-xxx` = Blumenau e região, `88300-xxx` = Itajaí).
- **GNIS / ANSI INCITS 446, SALB** — chaves de banco, inteiros sem assinatura, base grande.

### Já resolvido — não é lacuna

- **Mapcode** — a premissa "só detecta" **está desatualizada**. `src/features/location/mapcode.ts` já tem `detectMapcode` síncrono **e** `resolveMapcode` com `import("mapcode-ts")` dinâmico, com a lib no `package.json`. E a solução que está lá é a certa (os ~305 KB gzip da tabela mundial são maiores que o bundle inteiro). Nada a fazer.
- **IBGE município** — já é decoder (`ibge-municipio`, resolvido via `ctx.hits`). O incremento real **não é o decoder, é o DV como validador reutilizável**.
- **Poste da Celesc / Cidade Iluminada-Exati** — já deferido no repo (45.285 pontos de Blumenau). Não re-investigado.

### Ficou de fora **por falta de tempo, não por mérito** — reabrir

- **SNV/DNIT (`470BSC0330`) e marco quilométrico da BR-470 / BR-101.** Assinatura razoável (3 dígitos + letra de tipo + UF + 4 dígitos) e os marcos são **fisicamente visíveis atravessando as duas cidades**. Não deu para verificar a estrutura exata nem baixar a tabela SNV com coordenada de trecho. **É o candidato mais promissor que ficou fora** — e, sendo MAIÚSCULA+dígitos, também tem de nascer dentro de `detectLocation`, antes do Geohash.

---

## 4. Se fosse escolher TRÊS

**1. Geo URI + ISO 6709 (contam como uma).** Uma tarde, ~25 linhas somadas, zero dependência, zero risco de regressão — e tapam um buraco **medido**: hoje `geo:-26.9194,-49.0661;u=35` não casa em nada e o `parseDD` engole os números perdendo a incerteza e a altitude. São os dois formatos que a pessoa **de fato cola**: o Geo URI é o que sai de QR de local e do botão "abrir no mapa" do Android; o ISO 6709 é o que está em EXIF/XMP. Melhor razão esforço/retorno de todo o levantamento.

**2. Placekey (`@`) + OSM shortlink.** Assinatura de **prefixo literal**, que é a única espécie de assinatura imune ao Geohash frouxo de 0.90 — falso positivo estruturalmente zero. O Placekey usa o `h3-js` que **já é dependência** (custo de bundle: nenhum), tem padrão vivo e independente de API (a Senzing comprou em 11/12/2025 e manteve livre e aberto), e a armadilha do `+255` já está resolvida. O OSM shortlink é o formato com **maior chance real de aparecer numa pista**, porque é o que sai quando alguém compartilha um ponto do OSM. Em ambos, a regra é a mesma e é inegociável: **exigir o `@` e exigir o `osm.org/go/`** — *medido*, `khg-8w9-89z` nu vira "Vídeo do YouTube".

**3. DV do IBGE → CAR.** Dez linhas de aritmética que destravam a **melhor assinatura de todo o levantamento** (`SC-4202404-<32 hex>`, sem colisão medida) e, de brinde, o ramo de setor censitário e um reforço no `ibge-municipio` que já existe. O detalhe que decide: o CAR **decodifica UF e município offline, sem base nenhuma** — a bancada entrega "imóvel rural em Blumenau" com DV conferido mesmo sem baixar um byte do SICAR. Meia resposta certa e honesta, e numa gincana meia resposta certa costuma bastar.

**Por que não as bases municipais no pódio:** o IQ de Blumenau e o BCI de Itajaí são os itens de **maior valor local** da lista (`4-1-24-17-14` → o quarteirão do Teatro Carlos Gomes), mas exigem puxar e versionar base de prefeitura, e o IQ ainda tem de vencer um **EAN-8 válido em 0,85**. Ficam para a rodada seguinte, o BCI antes do IQ. E, logo atrás, o **BDG do IBGE** — base minúscula, API aberta, e a única resposta desta lista inteira que é **uma chapa de bronze que a equipe vai até lá tocar**.