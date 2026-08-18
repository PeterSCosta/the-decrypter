# Receita — Consulta de imóvel em Blumenau (inscrição → endereço → coordenada)

Consolidação das três sondagens. Onde elas se contradizem, a decisão está marcada com **DECISÃO** e o motivo. O que ninguém executou está marcado **NÃO VERIFICADO**.

---

## 1. Caminho recomendado (um só)

**Camada ArcGIS `consulta_construir/Lotes_info`, layer 0, via MapServer (somente leitura).** É a única camada do geoportal que junta, no mesmo registro, inscrição imobiliária + logradouro + bairro + CEP + polígono do lote. As três sondagens convergiram nela de forma independente.

URL exata (lookup por inscrição de 15 dígitos):

```
https://geo.blumenau.sc.gov.br/server/rest/services/consulta_construir/Lotes_info/MapServer/0/query
  ?where=INSCRICAO_CADASTRAL%3D'412400200002000'
  &outFields=INSCRICAO_CADASTRAL,IQ,TRDSIQ,LOGRADOURO,NUMERO,COMPLEMENTO,BAIRRO,NOBAIRRO,CEP,NUMERO_QUADRA,NUMERO_LOTE,LOTEAMENTO,AREA_CARTOGRAFICA,ATIVO
  &returnGeometry=true
  &outSR=4326
  &f=json
```

Variantes úteis, todas testadas:

| Objetivo | Parâmetro |
|---|---|
| Consultar pelo formato com hífens | `where=TRDSIQ%3D'4-1-24-20-2'` (ou `IQ`, campo idêntico) |
| Saída pronta pro Leaflet | `f=geojson` (já sai EPSG:4326, `[lng,lat]`) |
| Só contar | `returnCountOnly=true` |
| Paginar | `resultOffset=N&resultRecordCount=5000` |
| `where` muito longo | **POST** no mesmo `/query` (testado, mesma resposta do GET) |

**Correção obrigatória do enunciado:** o caminho **não** é `/arcgis/rest/services` (devolve **404 do IIS**, medido). É `/server/rest/services`. ArcGIS Server 10.71, anônimo, sem token, sem captcha, sem login.

### DECISÃO 1 — MapServer, não FeatureServer
A sondagem 3 usou `.../Lotes_info/FeatureServer/0/query`; a sondagem 1 usou `MapServer/0`. Os dados são os mesmos. **Fica MapServer**, porque o FeatureServer da mesma camada anuncia `capabilities: Query,Create,Update,Delete,Uploads,Editing` **sem exigir autenticação** — o MapServer é `Map,Query,Data` (só leitura). Não há ganho em falar com um endpoint gravável quando existe o gêmeo somente-leitura. Ninguém testou escrita e ninguém deve testar (ver §6).

### DECISÃO 2 — o número predial não sai daqui
Se a prova exigir **número da casa / apartamento**, a `Lotes_info` não resolve (§4). O único caminho público que devolve número + complemento + unidade é o **SIATU** (`ConsultaImovel.aspx`), que é ASP.NET WebForms com ViewState e **CORS quebrado** — obrigatoriamente via backend. Ele é **plano B com escopo restrito**, não o caminho principal: exige 2 requisições encadeadas com tokens one-shot, é raspagem de sistema de arrecadação e quebra a cada deploy da Prefeitura.

Caminho reverso (endereço → inscrição), se precisar: `consulta_construir/Consulta_endereco/MapServer/**1**` — Table `GEO.CONSULTA_ENDERECO`, 170.993 endereços, campos `TRDSIQ`, `DESCRICAO`, `NUMERO`, **sem geometria**. Fluxo: rua → `TRDSIQ` aqui → `Lotes_info` → coordenada.
*(A sondagem 3 descreveu esse serviço como "GEO.LOTES, 84.540 feições, só IQ". **DECISÃO:** são layers diferentes do mesmo serviço — layer 0 = lotes, layer 1 = a tabela de endereços. Vale a sondagem 1, que consultou o layer 1 e trouxe linhas reais.)*

---

## 2. Estrutura da inscrição imobiliária e o portão (regex) antes da rede

### Estrutura — 15 dígitos em 6 grupos: `T . R . DD . QQQQ . LLLL . UUU`

| # | Grupo | Larg. | Nome | Base |
|---|---|---|---|---|
| 1 | T | 1 | distrito/região cadastral | **inferência** dos dados |
| 2 | R | 1 | setor | **inferência** |
| 3 | D | 2 | subsetor / quadra-mestra | **inferência** |
| 4 | Q | 4 | **quadra** | `NUMERO_QUADRA` (nome da própria Prefeitura) |
| 5 | L | 4 | **lote** | `NUMERO_LOTE` |
| 6 | U | 3 | **unidade** (apto/box/loja; `000` = lote inteiro) | `UNIDADE_IMOVEL` |

Duas grafias do mesmo número convivem no mesmo registro:
- `INSCRICAO_CADASTRAL` = 15 dígitos, **com** zeros à esquerda, sem pontos e sem hífens → `412400200002000`
- `IQ` / `TRDSIQ` = 5 grupos com hífen, **sem** zeros à esquerda e **sem** a unidade → `4-1-24-20-2`

A fórmula de conversão foi validada contra **2.000 registros reais: 2.000 batem, 0 divergem**. Reforços: a máscara do próprio campo do SIATU é `9,9,99,9999,9999,999`; `len=15` → 84.491 registros, `len=13/14/16` → 0 cada; `NUMERO_QUADRA>9999` → 0 (nunca estoura os 4 dígitos); T assume só 1,2,3,4,6 (T=5 → 0 registros; soma fecha em 84.491).

**Nomes dos 3 primeiros grupos: NÃO VERIFICADO** — são inferência a partir da distribuição geográfica. Não se achou lei/decreto que descreva a composição dígito a dígito (`leismunicipais.com.br` devolve 403 a leitura automatizada; Carta de Serviços e SEFAZ não detalham). Se precisar de fonte legal, é pedido via LAI/e-SIC à SEPLAN.

### Portão — regex ANTES de ir à rede

Aceita as duas grafias que a equipe vai encontrar (carnê de IPTU vem com pontos/hífens e sem zeros à esquerda; o geoportal, com hífens):

```regex
^\s*(?:
    (?<cru>\d{12}|\d{15})
  |
    (?<t>\d)[.\-](?<r>\d)[.\-](?<d>\d{1,2})[.\-](?<q>\d{1,4})[.\-](?<l>\d{1,4})(?:[.\-](?<u>\d{1,3}))?
)\s*$
```
(compilar com `RegexOptions.IgnorePatternWhitespace`)

Normalização (é ela que fecha o portão, não só o casamento):

```csharp
// grupos -> pad 1,1,2,4,4,3 ; 12 dígitos crus -> acrescenta "000"
var insc = t.PadLeft(1,'0') + r.PadLeft(1,'0') + d.PadLeft(2,'0')
         + q.PadLeft(4,'0') + l.PadLeft(4,'0') + (u ?? "000").PadLeft(3,'0');
if (!Regex.IsMatch(insc, @"^[1-6]\d{14}$")) return NaoEncontrado;   // rejeita antes da rede
var iq = $"{int.Parse(t)}-{int.Parse(r)}-{int.Parse(d)}-{int.Parse(q)}-{int.Parse(l)}"; // sem zeros
```

Regras do portão:
- **Ponto não existe nesta base** como separador interno de dígitos — é só grafia de entrada; normalize sempre para os 15 dígitos.
- **Zeros à esquerda são obrigatórios** na consulta: `4.1.24.18.26.2` **não acha**; `4.1.24.0018.0026.002` acha.
- `^[1-6]` é heurística barata (T observado: 1,2,3,4,6). **T=5 hoje tem 0 lotes** — permita, mas não conte com isso como validação forte.
- Na `Lotes_info` a unidade é **sempre `000`** (a camada é do terreno). Unidade ≠ 000 só existe no SIATU.

---

## 3. O que a consulta devolve e como sai a coordenada

**Campos** (63 no total; os úteis): `INSCRICAO_CADASTRAL`, `IQ`, `TRDSIQ`, `LOGRADOURO`, `NUMERO`, `COMPLEMENTO`, `BAIRRO`, `NOBAIRRO`, `CEP`, `NUMERO_QUADRA`, `NUMERO_LOTE`, `UNIDADE_IMOVEL`, `LOTEAMENTO`, `AREA_CARTOGRAFICA` (m²), `QUOTA_INUNDACAO`, `ATIVO`, `DATA_CADASTRO`, `CD_BAIRRO`.

**Coordenada — sim, e o servidor já converte.** Nativo é `wkid 31982` = **SIRGAS 2000 / UTM 22S**. Passando `&outSR=4326` o servidor devolve WGS84. A conversão foi conferida na unha (UTM inverso, GRS80, k0=0.9996, MC −51, falso norte 10.000.000): vértice nativo `[691819.7377, 7021190.6835]` → `[-49.068247, -26.917928]`, **bate nas 6 casas**. Não é preciso proj4 no cliente. Ordem ArcGIS é `[x,y] = [lng,lat]`.

Geometria: `esriGeometryPolygon` com `rings` (polígono do lote, não ponto). Com `f=geojson` vira `Polygon/coordinates` em `FeatureCollection` com CRS EPSG:4326.

**Para o pin, calcule o centroide no cliente** (média dos vértices do ring).

> **DECISÃO 3 — `returnCentroid` não entra na receita.** A sondagem 1 testou `returnCentroid=true` no **MapServer 10.71** e o servidor **aceitou e ignorou** o parâmetro (voltou só `attributes`, sem `centroid`). A sondagem 3 usou `returnCentroid=true` no **FeatureServer** e reportou centroides no dump inteiro. Explicação provável: o suporte existe no FeatureServer e não no MapServer — mas isso é **NÃO VERIFICADO** (ninguém rodou os dois lado a lado). Como já decidimos ficar no MapServer, **peça o polígono e calcule o centroide** — é determinístico, custa nada e não depende de qual gêmeo respondeu.

Exemplo real completo, ponta a ponta:

```
412400200002000 / 4-1-24-20-2
→ 15 DE NOVEMBRO, 1231, CENTRO, CEP 89010003, quadra 20, lote 0002,
  1.395,49 m², quota de inundação 14,0, ATIVO='S',
  polígono de 14 vértices → centroide -26.917976 / -49.067821
```
Outros dois validados: `440100090008000` → 15 DE NOVEMBRO 55, CENTRO, −26.921608/−49.057710; `421400070198000` → BONN, PONTA AGUDA, CEP 89050495, −26.902765/−49.053602.

---

## 4. Armadilhas medidas

**Volume / limite de itens**
- `maxRecordCount = 5000`. A resposta traz `exceededTransferLimit: true` e **trunca em silêncio** — sem paginar por `resultOffset`, você perde ~94% da base sem nenhum erro. Paginação testada: `resultOffset=20000&resultRecordCount=2000` → 2.000 features.
- **Inscrição inexistente não dá 404.** `where=INSCRICAO_CADASTRAL='999999999999999'` → **HTTP 200, `features: []`, `error: null`**. Trate lista vazia como "não encontrado".
- 84.539 lotes, mas só **84.484 inscrições distintas — 55 duplicadas**. Trate o retorno como lista, nunca como chave única.
- **Camadas erradas que parecem certas:** `Cadastro_Imobiliario/Lotes_Blumenau` (84.540, só IQ/NOBAIRRO/LOTEAMENTO — zero endereço), `Cadastro_Imobiliario/Lotes`, e principalmente `Lotes/PUBLICACAO_LOTES`, que **anuncia 383.795 features mas repete OBJECTID ~4,5× cada** (é view com join duplicando linha; `resultRecordCount=6` devolveu OBJECTID 1 quatro vezes). Não use para contar nem paginar.
- As camadas de `publicacao/Publicacao_WFS` **duplicam linhas** (QUADRAS, LOTES, EDIFICACOES) — deduplique por OBJECTID.
- **A listagem de pasta mente:** `publicacao`, `Servico_Mapas`, `Publicacao_downloads`, `teste`, `FORMULARIO_CAMPO` listam ZERO serviços no `?f=json` da pasta, mas `publicacao/Publicacao_WFS/MapServer` existe e responde. Tente a URL do serviço direto.

**Campos com nome estranho**
- `TRDSIQ` — é a inscrição com hífens; `IQ` é o mesmo valor com outro nome, no mesmo registro.
- `NOBAIRRO` convive com `BAIRRO` (nomes de bairro em campos distintos).
- `ESRI_OID` na Table de endereços; `NUMUAV` nas edificações.
- No SIATU o resultado **não está no HTML visível**: vem como JSON na variável `ctl00_ContentBody_StoreImoveis_Data = [...]`, e o campo `InscricaoCadastral` volta **com um espaço no início**.
- **IQ das edificações tem 7 componentes**, não 5 (`lote + bloco + pavimento`, ex. `2-6-19-3-103-1-1`). Casar com o lote exige cortar nos 5 primeiros — `where=IQ='4-1-24-20-2'` em edificações vem **vazio** por isso.

**Qualidade do dado — a armadilha que mata o desenho da prova**
| Campo | Cobertura medida |
|---|---|
| Coordenada | **100%** |
| `LOGRADOURO` | 100% (84.491) |
| `CEP` não nulo | 99,99% — mas ~95% de CEP *real* (`89000001` é placeholder) |
| `NUMERO` não nulo | 47,7% (40.312) |
| `NUMERO` **útil** (≠ null e ≠ `'00'`) | **12,4% (10.470)** |

> **DECISÃO 4 — vale o número estrito (12,4%).** A sondagem 3 reportou "47,7% com número de porta"; a sondagem 1 mediu que, tirando o literal `'00'`, sobram 12,4%. Não é contradição: a 3 não filtrou o placeholder, e ela mesma registra que `NUMERO` pode ser `'00'`. **Monte a prova sobre rua + bairro + CEP + coordenada; nunca sobre o número predial.**

- `LOGRADOURO` vem **sem tipo de logradouro e com numeral em dígito**: é `15 DE NOVEMBRO`, não "Rua XV de Novembro". Testado: `XV DE NOVEMBRO` → 0; `QUINZE` → 0. Idem `INOMINADA 2500` como lixo de endereço.

**Acentuação corrompida — NÃO VERIFICADO.** Nenhuma das três sondagens mediu charset/mojibake em nenhum endpoint. Regra defensiva, então: o ArcGIS REST é JSON (UTF-8 por especificação) — decodifique como UTF-8 e **não** confie no header; o SIATU roda em **IIS 7.5 antigo com ASP.NET WebForms**, onde `windows-1252 / ISO-8859-1` é o padrão histórico — se for usá-lo, decodifique explicitamente e valide um bairro acentuado conhecido (`GLÓRIA`, `FIDÉLIS`) como canário no primeiro request. Não deixe isso implícito no `HttpClient`.

**Timeout / carga**
| Endpoint | Medido |
|---|---|
| ArcGIS `/query` (lookup) | **0,20–0,25 s** |
| ArcGIS — 25 chamadas sequenciais | 25/25 HTTP 200 em 5 s (~5 req/s), **zero 429** |
| ArcGIS — dump completo (17 páginas) | **28,0 s**, 84.539 linhas, zero throttling |
| SIATU `ConsultaImovel.aspx` (GET+POST) | 316–563 ms, média ~450 ms, 8/8 OK |
| SIATU — busca por CEP (212 registros) | 2,4 s |
| **Espelho cadastral em PDF** (`RelConsultaImovel.aspx?ID=`) | **89–92 s, constante nas 3 chamadas** — não é cold start |

O PDF de 89 s **inviabiliza consulta ao vivo**. Se for usar, gere antes do evento e sirva do nosso lado. E não varra a faixa de IDs (é enumerável/IDOR-ish, seria martelar serviço público).

**Armadilhas do SIATU (só se cair no plano B)**
- CORS **quebrado**: `Access-Control-Allow-Origin: *` vem **duplicado** (IIS + ARR/2.5) e junto de `Allow-Credentials: true`. O browser rejeita ("contains multiple values"). **Não dá para chamar do React** — só por backend.
- Precisa de 2 requisições (GET dos tokens `__VIEWSTATE`/`__VIEWSTATEGENERATOR`/`__PREVIOUSPAGE`/`__EVENTVALIDATION` + POST). Tokens são de sessão/one-shot: **cachear ViewState quebra**.
- Enviar `ctl00$ContentBody$DropDownListDescLograd` com o combo vazio derruba com "Argumento de postback ou de retorno de chamada inválido".
- CEP tem que ir com 8 dígitos **sem hífen** (`89010-001` → zero).
- **Inversão traiçoeira da unidade:** a `Lotes_info` só tem `UNIDADE=000`, mas no SIATU `4.1.24.0018.0026.**000**` devolve **zero**; consulte pelo **prefixo sem a unidade** (`4.1.24.0018.0026` → os 9 cadastros do lote). O manual oficial da Prefeitura diz literalmente para digitar "sem os últimos três zeros".
- `ShowGoogleMap.aspx` é **isca**: o `new google.maps.LatLng(-26.907236, -49.055947)` no fonte é o **centro fixo do mapa**, igual para qualquer imóvel — o lote testado estava 1,5 km dali. A página ainda **expõe em texto claro a chave da API do Google Maps da Prefeitura**: credencial de terceiro, **não usar em nada nosso**.

---

## 5. Ao vivo pelo backend .NET, ou base baixada uma vez?

**Base baixada uma vez, versionada no repositório, com a consulta ao vivo apenas como fallback e como rotina de atualização na véspera do evento.**

O dump foi **executado de ponta a ponta**: 17 páginas, 84.539 linhas, **28 segundos**, todas HTTP 200, sem throttling. Saída de 8,6 MB em CSV (**2,46 MB gzipado**), 100% das linhas com coordenada; cabe folgado num SQLite. O índice em memória com as duas grafias (169.004 chaves) resolveu lookup instantâneo e **confere com a consulta ao vivo**. Com polígono em vez de centroide, estimam-se ~21 MB — ainda gerenciável (**estimativa, NÃO VERIFICADA**).

```
.../Lotes_info/MapServer/0/query?where=1%3D1
  &outFields=INSCRICAO_CADASTRAL,IQ,LOGRADOURO,NUMERO,BAIRRO,CEP,NUMERO_QUADRA,NUMERO_LOTE
  &returnGeometry=true&outSR=4326
  &resultOffset=N&resultRecordCount=5000&f=json
```
(itere `N` de 5000 em 5000 enquanto `exceededTransferLimit` for `true`; calcule o centroide na ingestão)

Motivos, em ordem:
1. **O risco real não é volume, é o geoportal cair ou ficar lento no dia da prova.** 28 s de reprocessamento eliminam essa dependência inteira.
2. **Some a discussão de CORS.** O ArcGIS ecoa a `Origin` recebida (`access-control-allow-origin: <origin>` + `allow-credentials: true`, testado com origens arbitrárias) — dá para chamar do browser hoje, mas *justamente porque ecoa qualquer origem* isso é configuração frágil, não contrato. Offline, é irrelevante.
3. **Latência zero e carga zero na Prefeitura** durante a gincana — que é a postura correta com serviço público sem termo de uso publicado.
4. **Determinismo.** A prova é preparada e conferida contra o mesmo arquivo que o app vai consultar.

**O backend .NET entra em dois papéis, não como proxy de leitura:** (a) rodar o dump/refresh e servir o índice local; (b) ser o **único** caminho possível para o SIATU, se a prova precisar de número/complemento/unidade — porque lá o CORS é inutilizável.

Complemento opcional, se a prova algum dia der **rua+número em vez de inscrição**: **CNEFE 2022 do IBGE**, recorte 4202404 (`ftp.ibge.gov.br/.../CSV/Municipio/42_SC/4202404_BLUMENAU.zip`, 3,70 MB → 27,3 MB, **175.212 endereços, 100% com coordenada, 95,5% com número de porta**, baixado e conferido). É o **único achado com licença explícita** (IBGE, uso livre com citação). Mas ele **não conhece inscrição imobiliária** — é complemento, nunca substituto. Armadilha: `NUM_QUADRA` do CNEFE é quadra de **setor censitário**, não a quadra cadastral da Prefeitura; os números não conversam.

**OSM está descartado:** Overpass devolveu 14.544 ways com `addr:housenumber` e **zero lotes cadastrais** — ~17% de cobertura e nenhuma noção de inscrição. Além disso o share-alike da ODbL contamina qualquer derivado publicado misturado com a base municipal. Não usar (a não ser como tiles de fundo, que é outro regime).

**Sempre citar a fonte: "Município de Blumenau".** A página oficial de metadados (`geo.blumenau.sc.gov.br/wfs/wfs.html`, item 12) declara licença de uso livre exigindo citação; guarde também a **data e a proveniência do dump**.
> Contradição registrada: a sondagem 3 afirma que **não existe** licença publicada no geoportal; a sondagem 1 cita o texto literal da página `wfs.html`. **DECISÃO:** vale a sondagem 1 (leu o texto), e o comportamento prático é o mesmo em ambos os cenários — citar a fonte, manter volume civilizado e, para redistribuir o dump, pedir OK formal via LAI/e-SIC.

---

## 6. O que ficou BLOQUEADO, e por quê

**Bloqueado por decisão nossa (não por falha técnica) — regra permanente para o time**
- **Escrita nos FeatureServers do geoportal.** `consulta_construir/Lotes_info/FeatureServer` e `Cadastro_Imobiliario/Lotes_Blumenau` anunciam `Create, Update, Delete, Uploads, Editing` **sem exigir token**. **Ninguém testou e ninguém deve testar** — seria alteração não autorizada de sistema público da Prefeitura. Usar **somente** `/query`, e só no MapServer. Tem cara de ArcGIS publicado com permissão errada; **recomendo comunicar a Diretoria de Cartografia e Cadastro Multifinalitário (47 3381-6789)**. Não é problema que a gincana deva explorar.
- **Emissão de guias / carnê de IPTU** (`GuiasAtualizadas.aspx`): abre sem login, mas é fluxo de **emissão de boleto** em nome de terceiro, não consulta cadastral. Nada emitido, e não recomendo — o endereço já sai de graça pelo caminho principal.
- **Varredura da faixa de IDs do espelho cadastral em PDF** — enumerável, mas seria martelar serviço público a 89 s por chamada.
- **Chave da API do Google Maps da Prefeitura**, exposta em texto claro no `ShowGoogleMap.aspx`: credencial de terceiro, uso vedado.

**Bloqueado por captcha / CPF / login (parou-se ali)**
- Certidão Exclusiva de Imóvel (`EmissaoCNDImovel.aspx`) — cadastro + CPF/CNPJ + **CAPTCHA** + finalidade.
- CND normal (`EmissaoCND.aspx`) — CPF/CNPJ + **CAPTCHA**.
- Declarações de Quitação ITBI e FACILITA ITBI — nº da guia (DAM) + **CAPTCHA**; e a entrada é a guia, não a inscrição — não serviria de qualquer forma.
- **BICIM** e Praça do Empreendedor — redirecionam para a área logada (conta com CPF/CNPJ + senha).
- Consulta de Viabilidade / consulta prévia — login do Portal do Cidadão, CNAEs e taxa; é licenciamento, não consulta de dado.
- Alvarás PJ/PF, VISA, FAEMA, processos ITBI, comprovante cadastral — todos atrás de `PageLogin.aspx`. **Nenhum deles é consulta por inscrição imobiliária.**

**Não existe (procurado e não encontrado)**
- **Portal de dados abertos municipal (CKAN)** — verificados `transparencia.blumenau.sc.gov.br`, `grp.blumenau.sc.gov.br/transparencia`, a página "Dados Geográficos" e o `dados.gov.br`. A página de Dados Geográficos é texto descritivo, zero download. O portal de transparência é orçamentário.
- **Endpoint WFS/OGC**, apesar de a home do geoportal prometer "download via WFS": a pasta `Publicacao_downloads` responde 200 com lista **vazia**. O `/query` REST é o substituto funcional e é melhor. Não perca tempo caçando.
- **Planta genérica de valores (PGV)** em arquivo estruturado. Se for mesmo necessária (valor venal), o caminho é LAI, não raspagem.
- **Fonte legal da composição da inscrição** dígito a dígito (§2).
- **Dono/proprietário, IPTU devido, matrícula do registro de imóveis:** não existem nesta base. O geoportal só tem cadastro físico; o espelho em PDF, apesar de completo (terreno, testadas, topografia, unidades de avaliação), **não traz nome nem CPF**. Dado de contribuinte não está exposto — e nem deveria. Não é lacuna a preencher.

**NÃO VERIFICADO (ninguém testou)**
- `returnCentroid` no MapServer vs FeatureServer (§3) — por isso a receita calcula o centroide localmente.
- Charset/acentuação em qualquer endpoint (§4).
- Grade do **Rol de Ruas** (GeneXus, `extrawwrolderuastransp.aspx`): a página abre pública (HTTP 200, sem login), mas as linhas carregam por AJAX com estado em `GXState` e **não foram extraídas**. O mapeamento `Cód. Rua` ↔ combo do SIATU foi conferido só em 6 amostras (744 = 15 DE NOVEMBRO, 437 = CURT HERING…). Como dataset de ruas, a camada de eixos do ArcGIS é caminho melhor.
- CORS dos endpoints em `blumenau.sc.gov.br/monitorarecurso/` (presumido igual ao do SIATU, ou seja, quebrado).
- Query exata montada pelo app oficial `consulta-construir`: a config dos serviços é carregada em runtime, nada de `/rest/services` em texto no `app.js`/`consulta.js`. Não foi necessário — chegou-se à camada certa pela própria árvore REST.
- Tamanho do dump **com polígonos** (~21 MB é estimativa).

---

**Resumo executivo:** uma URL resolve a prova — `consulta_construir/Lotes_info/MapServer/0/query`, com `outSR=4326`, servida de um dump local de 28 segundos. O portão é o regex das duas grafias com padding 1-1-2-4-4-3. A coordenada é 100%; rua, bairro e CEP são ~95–100%; **o número da casa é 12,4% e não pode entrar no desenho da prova**. Nada foi burlado, e o único ponto que pede ação externa é avisar a Prefeitura sobre o FeatureServer gravável anonimamente.