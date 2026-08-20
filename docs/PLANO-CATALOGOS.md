<!-- Gerado em 2026-08-19. Linha de base: 117 decoders, 14 abas, 1.556 testes verdes. -->

> ## Correção medida antes de publicar — o item 0.1 é pior do que este plano diz
>
> O plano abaixo abre com "Geohash: o 4º caractere" e estima que Blumenau se parte em
> `6gjn` (54,0%) e `6gjp` (44,7%). **Medi sobre a caixa inteira e são quatro prefixos, não
> dois** — e o defeito é de outra natureza:
>
> | | medido |
> |---|---|
> | prefixos que tocam a caixa de Blumenau | `6gjp` 37,5% · `6gjn` 37,3% · `6gm0` 23,8% · `6gjj` 1,5% |
> | cobertura do único prefixo declarado (`6gjn`) | **37,4%** |
> | caudas lidas **erradas e aceitas** | **62,6%** |
> | caudas **rejeitadas** (bancada cala) | **0,0%** |
> | erro médio quando erra | **27 km** · pior caso **39 km** |
>
> **A bancada nunca cala.** A checagem de caixa não rejeita nada, porque a célula do
> prefixo (39×19,5 km) é menor que a caixa da cidade (52×26 km) — a validação é circular,
> exatamente o critério de cauda derivado em `docs/` para Plus Code e UTM.
>
> **E não há conserto por enumeração.** Testando os quatro prefixos e ficando com o que cai
> na caixa: o ponto certo está entre os candidatos em **100%** dos casos, mas os candidatos
> são **2 ou 3, nunca 1** (2 em 24,5%, 3 em 75,5%). Uma cauda de geohash com cidade assumida
> **não identifica ponto** — por construção.
>
> Portanto o item 0.1 não é "acertar o 4º caractere". As saídas honestas são duas, e a
> escolha é do dono:
>
> - **(a)** emitir as 2-3 leituras como alternativas explícitas, com nota de palpite
>   (≤ `atalhoFraco`), nunca uma resposta única; ou
> - **(b)** tirar a cauda de geohash do leque automático, porque ela não se autoverifica —
>   é o que a regra de admissão da §5/R1 deste mesmo plano exigiria (rejeição de 0,0%
>   contra o piso de 79,8%).
>
> Comparação, para calibrar: a **cauda de UTM** (item 1.2) rejeita **98,67%**. É o oposto
> exato deste caso, e por isso entra.

---

# Plano de ação — as ferramentas dos cinco catálogos

**Data:** 2026-08-19 · **Base medida:** 117 decoders (`decoders.length`; contar arquivos dá 85 e erra), 14 abas, 140+ verbetes de Cola, 128 arquivos de teste / 1.556 testes verdes, 2 testes de componente, 0 e2e.

---

## Abertura — o que foi pedido e o que dá para responder

O dono pediu "ter todas as ferramentas desses sites". Somando dCode, CyberChef, Boxentriq, cryptii e ciphereditor, isso são cerca de **1.000 entradas de menu** — e o número é enganoso por dois motivos: os cinco repetem muito entre si, e só o dCode gasta ~200 verbetes em fontes de ficção (Aurebesh, Klingon, Tengwar). Descontada a repetição e agrupado o que é a mesma coisa com nome diferente, sobram **181 capacidades distintas**.

A resposta honesta não é implementar 181 coisas. É dar **destino explícito** às 181 e um plano faseado para as que ficam:

- **65 já estão na bancada** (36%) — várias melhores que a versão dos catálogos.
- **33 entram**, em 26 itens de trabalho (18%).
- **5 viram legenda na Cola** (3%) — o que se lê e não se digita.
- **11 ficam terceirizadas com ficha** (6%) — a bancada diz onde abrir.
- **67 são recusadas por escrito, com critério e gatilho de reabertura** (37%).

Ao fim do plano a bancada responde por **103 das 181 (57%)**, e as 78 restantes têm razão escrita. Essa é a diferença entre "não temos" e "decidimos não ter" — e é a parte do trabalho que nenhum catálogo faz.

Custo estimado do que entra: **~23 a 26 dias de trabalho** para 33 capacidades (~5 h por capacidade). As 67 recusadas custariam, no mesmo ritmo, uns 40 dias — e produziriam a piora medida na seção 5.

**Ressalva de método, no lugar certo:** o inventário chegou **truncado** no item 23 do Grupo 3 (no meio do verbete de `whitespace-stego`). A conta de 181 é **piso, não teto**. E o inventário se contradiz em dois pontos, resolvidos aqui pelo lado mais conservador (§2.1 e §3.6).

---

## 1 · A conta

**Regra de contagem:** uma capacidade = uma escolha de menu naqueles sites. Blocos que os catálogos vendem como um item mas são N cifras (Quagmire I–IV = 4; Base-N = 11; as máquinas de rotor = 6) contam N. Blocos de largura pura sem estrutura (as ~200 fontes de ficção do dCode) contam 1, com a largura anotada — senão o total vira propaganda.

| destino | capacidades | % | o que significa |
|---|---:|---:|---|
| **já temos** | 65 | 36% | está em produção; em 9 casos a versão da casa é superior à dos cinco |
| **trazer** | 33 | 18% | 26 itens de trabalho, ondas 0 a 5 |
| **legenda na Cola** | 5 | 3% | entrada real é imagem; não há string para decodificar |
| **terceirizar com ficha** | 11 | 6% | `reference/sources.ts` já nomeia onde abrir |
| **descartar** | 67 | 37% | 8 grupos, critério escrito na §3 |
| **total distinto** | **181** | 100% | em 105 verbetes do inventário, ~1.000 entradas de menu nos cinco |

Distribuição por catálogo de origem, para calibrar a ansiedade: das 67 recusadas, **44 vêm de um único site** (dCode 33, CyberChef 11). Não é que a bancada esteja atrás dos cinco — é que um deles é um catálogo de enciclopédia e a bancada é uma mesa de rua.

Onde a casa já ganha hoje, medido: solver de substituição e quebra de Vigenère **pontuam em português** (nenhum dos cinco pontua), NATO lê **dígitos de rádio e PLUS** (nenhum dos cinco lê), `rot8000` gira 63.404 code points (nenhum dos cinco tem), `location` lê 26 formatos de coordenada, anagramas tem o vocabulário de ruas e bairros de Blumenau que wordlist nenhuma tem. O identificador de cifra da casa **resolve e ordena por evidência** em vez de chutar um nome, e ainda dá o diagnóstico **negativo**, que nenhum dos cinco dá.

---

## 2 · As ondas

**Contestação à ordem sugerida.** A ordem proposta foi: primeiro o que só existe aqui, depois o que quatro catálogos concordam, depois o resto. Concordo com o miolo e emendo nas duas pontas:

1. **Antes de tudo entra a Onda 0**, que não traz capacidade nenhuma — conserta resposta errada e silêncio em capacidade que a bancada **já anuncia**. A régua da casa diz que resposta errada com nota alta é o pior defeito possível; hoje existe uma viva, liderando a lista com 19,44 km de erro. Nenhuma capacidade nova compra tanto quanto tirar isso do topo, e essa onda inteira custa dois dias.
2. **Entre "só existe aqui" e "quatro concordam" entra a Onda 2**, o motor que já está pago e não tem tela. `engine/criptanalise.ts` são 879 linhas medidas e testadas com **zero consumidores de produção** fora do `vigenere-crack`. Não é matemática, é tela. Pela ordem sugerida isso cairia no meio do bloco "quatro concordam" e perderia a frente para itens que custam o triplo.

### Onda 0 — a bancada mente (9 itens, todos P · ~2 dias · 0 capacidade nova)

| # | item | esforço | por quê |
|---|---|---|---|
| 0.1 | **Geohash: o 4º caractere** | P (~2 h) | `anchors.ts` declara um prefixo por cidade (`6gjn`/`6gjq`), mas Blumenau se parte em `6gjn` (54,0%) e `6gjp` (44,7%). Reproduzido: cauda `309y` → real `-26,84672/-49,17223`, bancada `-27,02250/-49,17223`, **erro 19,44 km, nota 0,55 — a mais alta da lista**. 74,7% das caudas caem em Blumenau via `6gjp` e são inalcançáveis hoje. Mesma classe do `38HQ+J3` que a onda 1 consertou, e **não está na tabela de abertos**. |
| 0.2 | **Geohash devolve as duas cidades** | P (~1-2 h) | `decodeGeohashLocal` dá `return` no primeiro acerto. Medido em 199.467 caudas: **74,9% valem nas duas cidades, 0,0% valem só em Blumenau** — quando ela acerta, Itajaí também acerta, e a bancada esconde. Contraria a regra escrita no próprio arquivo (`formats.ts:568-580`). Sai na mesma refatoração de 0.1: o retorno tem de virar lista nas duas pontas. Plus Code conferido pelo mesmo teste: **0,00% de ambas** — não precisa ser tocado. |
| 0.3 | **Morse com separador tipográfico** | P (~30 min) | Portão conferido agora: `/^[.\-/\s|]+$/`. **Um** ponto médio ou travessão colado de PDF derruba a entrada inteira e a bancada cala. Um `replace` antes do portão. |
| 0.4 | **Braille ⠼ e ⠠** | P (~1 h) | Conferido: `decodeBraille` troca o desconhecido por `?`. Hoje `⠼⠁⠃⠉` (o número 123) sai `?abc` e o cartão é entregue como leitura boa. Duas linhas de tabela e um estado no laço. |
| 0.5 | **Dígito não-ASCII na porta** | P (~1 h) | Conferido: `use-decoder.ts:205` usa `\D`, que em JS é só 0-9 — dígito árabe-índico é **apagado** e todo decoder numérico (CEP, DDD, coordenada) cala em silêncio. É normalização de entrada, não decoder: não cobra pedágio no ranking. |
| 0.6 | **Mojibake (`informaÃ§Ã£o`)** | P (~2 h) | Não é cifra nova, é conserto: hoje o texto mojibake não casa com a wordlist pt-BR, **perde o selo de palavra real** e a cadeia inteira despenca. Assinatura literal (`Ã`/`Â`/`â€` em sequência). |
| 0.7 | **A vitrine** (`help/roadmap-content.ts` (**REMOVIDO em 20/08/2026**)) | P (~30 min) | Três defeitos, conferidos: (a) "Engine esperto" segue como *Ideia* com solver de substituição, quebra de Vigenère e detector de cifra — **os três entregaram na onda 4**; (b) "Compartilhar a ENTRADA por URL" segue como *A fazer* e o dono **matou** o item; (c) o verbete das runas. **Correção ao achado B:** o verbete de runas é sobre a **Cola**, não sobre o decoder, e a legenda realmente falta — o que é falso ali é "por falta de prova-âncora", contradito por `sources.ts:403` no mesmo repositório. Duas frases da casa se contradizem; **o dono escolhe qual cai**. |
| 0.8 | **`pnpm build:data`** | P (conserto) + **decisão do dono** | Conserto meu: o passo 1 sobrescreve o `public/data/streets.json` **versionado e enriquecido** pela versão crua sem coordenada, e derruba 3 testes de `enriquecimento.test.ts` — o comando deixa o repositório pior do que encontrou. Decisão do dono: `build:ceps` sai da cadeia ou o CSV volta (é a pergunta 6 do §8, ainda sem resposta). E três correções de doc: morre no **segundo** passo, não no primeiro; `ceps.json` **é** consumido (por `scripts/geocode-streets.ts:23`, no build); o "footgun do Makefile" está no repositório **da API**, não neste. |
| 0.9 | **Os argumentos falsos** | P (~1 h) · veredito é **decisão do dono** | Cinco superfícies, não quatro: `PLANO-2026-08.md` (náutico em `:119` **e** `:437`; Enigma `:458`), `TODO-CIFRAS.md` (anagrama `:155`; runas `:8-9` e `:399`; A31 `:51`), `PLANO-CIFRAS.md` (runas `:180` e `:429`; A31 `:447`) e a vitrine. O F3 é explícito: *muda a razão, não o veredito*. Também: separar as duas metades do §2.3 (o placar joga o `sync-data` em "fora", a tabela mantém `build:data` aberto), e **escrever** a decisão do dono sobre as 41 resoluções — decisão que não vira linha de documento volta como proposta na próxima passada. |

**Por que primeiro:** cinco desses nove fazem a bancada **falar onde hoje cala**, dois tiram **resposta errada do topo**, e nenhum acrescenta um decoder ao leque. Custo por tecla da onda inteira: zero.

### Onda 1 — o que nenhum dos cinco vai construir (4 itens + 2 legendas · 1 M + 5 P · ~3 dias)

| # | item | esforço | por quê |
|---|---|---|---|
| 1.1 | **Soletração pt-BR** (Ana, Bandeira, Carlos / "A de Amor") | **M** | **0 de 5** — o cryptii lista NATO, holandês, alemão, sueco e russo, e nenhum português. É a única vantagem competitiva pura do inventário inteiro. **Ressalva:** o inventário se contradiz (Grupo 1 diz P, Grupo 2 diz M) — **vale M**, e a razão do M não é a tabela, é o portão. As palavras do NATO são exóticas e 60% de acerto basta; as brasileiras são substantivos comuns (casa, lua, ouro, uva) e 60% dispararia em prosa portuguesa. Portão obrigatório: **100% dos tokens na tabela, ≥4 tokens, bônus para a forma "X de Y", saída tem de formar palavra real, teto de nota.** Sem esse portão o item vira exatamente a resposta errada com nota alta. Segunda ressalva: hoje a entrada não produz *nada* é falso — o `acrostic` já devolve as iniciais; o que falta é a tabela que prova a intenção e nomeia o cartão. |
| 1.2 | **Cauda de UTM** | P (~2 h) | O atalho mais seletivo do conjunto, medido em 300.000 pares: rejeita **98,67%** contra a VALE_BBOX e 99,62% contra caixa de cidade — 5× o Plus Code (79,8%) e ~66× a cauda de geohash (18,3%). O Vale inteiro cabe em E 653.868..744.044 · N 6.978.196..7.067.846, ou seja a cauda tem forma `\d{6}\s+\d{7}` com E em 65..74 e N em 697..706: **portão de assinatura, não palpite**. Bônus: `utmZone` deixa de ser campo morto (conferido — os dois únicos leitores são texto de tela) e o literal `"22J"` sai do `mgrs.ts`. |
| 1.3 | **Letras por linha no `countSeries`** | P (~1 h) | Conferido: `countSeries` emite quatro séries e nenhuma conta letras. Âncora: p04/2024 (20-5-14-5-20 → TENET). ~6 linhas; o `count-key` já faz a leitura A1Z26 de graça, com portão 1..26 e ≥3 contagens. Entra **sem tocar em ranking nem em score**. Decisão embutida: `RE_WORD` conta letra **e** dígito — a série nova precisa de letra pura, e o `fold` que já existe resolve o acento. |
| 1.4 | **Significado ICS anexado ao mapa NATO** | P (~26 linhas) | Portão já pago pelo NATO; risco de falso positivo zero. **Ressalva que pode matar o item:** a âncora ("o Challenge 2024 usou as bandeiras") está afirmada **só** em `sources.ts:403`, conferida agora, e não é corroborada em lugar nenhum; o `PLANO-CIFRAS` registra uma prova "Bandeiras" que é adulteração de brasão, mecânica diferente. Se a âncora cair, o item sai. |
| 1.5 | **Nyctográfico na Cola** | P | Único alfabeto visual do inventário com âncora de acervo afirmada (ITC 2019 P14). Se só uma legenda entrar nesta rodada, é esta. |
| 1.6 | **Runas: legenda de forma** | P | O decoder já existe (`alphabets.ts:513` Elder, `:573` Younger) e translitera; o buraco é quem vê o traço e não tem o caractere. Dados já no arquivo, falta o desenho. Mesma ressalva de âncora do 1.4 — e é a metade honesta do verbete que a vitrine hoje descreve errado. |

**Por que aqui:** nenhuma dessas seis será construída por dCode, CyberChef, Boxentriq, cryptii ou ciphereditor. São pt-BR e Vale do Itajaí. Todo dia sem elas é vantagem que ninguém está comprando no lugar da casa.

### Onda 2 — o motor pago que não tem tela (3 itens · 1 M + 2 P · ~3 dias)

| # | item | esforço | por quê |
|---|---|---|---|
| 2.1 | **Retrato estatístico do texto** | M | `retratoDoTexto`, `frequencias`, `icPorColuna`, `kasiski`, `quiQuadradoLetras/Ngramas`, `verossimilhancaBigrama` — exportados, testados, e **fora dos próprios testes ninguém importa**. A leitura em pt-BR já está pronta no comentário. É tela, não matemática. **Ressalva de coerência:** o inventário classifica isto como "já temos" no Grupo 1 (o motor) e "trazer" no Grupo 3 (a tela). Vale trazer — o usuário não usa `.ts`. |
| 2.2 | **Régua do IC e frequências na Cola** | P | Sem ela o painel de 2.1 mostra números que ninguém interpreta. Não inventa nada: cita as mesmas constantes que o motor usa (`IC_PORTUGUES` 0,073, `IC_INGLES`, `PERFIL_PT/EN`, `TOP_BI`, `TOP_TRI`). |
| 2.3 | **Busca de palavra por padrão com curinga** (`a??`, `1212`) | P | Só existe curinga de CEP e de GeoHex; nada para palavra. As 451 mil palavras já estão indexadas na memória da aba Anagramas — é um filtro por molde sobre o que já está carregado. Vale exatamente onde os dois solvers **calam**: abaixo de 150-200 letras, o criptograma curto. |

**Por que aqui:** maior devolução por hora do documento, e **zero decoder novo no leque** — três painéis, custo por tecla zero. Junto com o identificador que já existe, fecha o assunto "que cifra é esta".

### Onda 3 — o que quatro ou cinco catálogos concordam (9 itens · 1 M + 8 P · ~3-4 dias)

| # | item | esforço | por quê |
|---|---|---|---|
| 3.1 | **Conferir hash de texto** (MD5 · SHA-1 · SHA-256 · CRC-32) | P | 4/5 sites — o segundo sinal mais forte do inventário. Hoje só existe hash de **arquivo** (`arquivo/ficha.ts`). SHA-1/256 saem de graça do WebCrypto; MD5 e CRC-32 são ~60 linhas. **Forma certa: campo "conferir contra este hash", não decoder no fan-out** — hash não se decodifica, e um card de hash por tecla é ruído puro. |
| 3.2 | **Quebrar hash pelo vocabulário local** | M | O caso-modelo de consulta pré-resolvida legítima: ou bate e é resposta com certeza matemática, ou não bate e nada aparece. **Risco de resposta errada: zero** — raro nesta bancada. Worker sobre as 451 mil palavras. Depende de 3.1. |
| 3.3 | **Punycode (`xn--`)** | P | Assinatura literal perfeita; ruído estruturalmente impossível. Engancha no `registrobr` que já existe. Já aprovado em §4-7 / F11.4 e nunca implementado. O Bootstring vem de graça por dentro, sem cartão próprio. |
| 3.4 | **Quoted-Printable** | P | `=HH` em posição de byte, com quebra suave. Entrada realista: print de e-mail cru. |
| 3.5 | **MIME encoded-word (`=?UTF-8?B?…?=`)** | P | Encadeia direto no base64 existente. **Vem no mesmo papel colado que 3.4: se um entra, os dois entram.** |
| 3.6 | **Escapes `\uXXXX` / `\xNN` / `%uXXXX`** | P | Cabe dentro do `codecs.ts`, sem decoder novo. Valor menor: **entra de carona, não sozinho**. |
| 3.7 | **Timestamp Unix → data** | P | A metade contrária já existe inteira (`date-key.ts`: signo, Zeller, dia do ano, serial, Unix, lua). Assinatura aceitável (10 dígitos entre ~2001 e ~2033) e a saída se confere sozinha. **Com teto de nota, na gaveta, nunca no topo.** |
| 3.8 | **Fatoração em primos + sequências** (Fibonacci, triangulares) | P | Mais uma linha do painel de aritmética sob a regra de **palavra-dica** já testada ("primos", "fatores", "múltiplos" já estão lá) e mais um chip do sniffer. Sem a dica não dispara — é o que preserva a assinatura de um número solto, que não tem nenhuma. |
| 3.9 | **Numerais gregos e hebraicos** (isopsefia, gematria) | P | O portão já foi pago: quem decidiu que a entrada é grego/hebraico foi o `alfabeto.ts`, por bloco Unicode. Hoje `letter-values` só tem gematria latina e o alfabeto devolve posição ordinal — que é o **número errado** para uma prova de isopsefia (ρ=100, não 17ª). |
| **3.G** | **Portão: a primeira leva e2e** | M · **decisão do dono** | Conferido: zero `*.spec.ts`, zero `playwright.config`, Playwright nem instalado, CI roda lint/typecheck/test/build. 128 arquivos de teste, **2 de componente**. Argumento para mandar agora e não depois: as ondas 4 e 5 mexem em ranking e fan-out, e as quatro peças de risco nomeadas no plano (trilha de cadeia, selo de palavra real, faixa de chips, aba Diferenças) seguem sem teste. Primeira leva: config + CI + 5 a 8 caminhos (digitar → card certo no topo; "usar como entrada"; `/cifra/base64`; Geolocalização com `38HQ+J3` e `25JR+P8`; upload na aba Arquivo). |

### Onda 4 — os solvers que faltam (3 itens · 2 M + 1 P · ~4 dias)

| # | item | esforço | por quê |
|---|---|---|---|
| 4.1 | **Transposição sem chave**, em duas camadas | M | Aqui o repositório está errado sobre si mesmo: `PLANO-2026-08 §7.3` diz que scytale "já é coberta por columnar e railfence", mas o `columnar` **exige `ctx.key` e devolve `null` sem ela** — só serve para quem já sabe a resposta. Camada (a), **no leque**: 2 a 12 colunas nas duas leituras, ~22 variantes — mais barato que o `affine`, que já roda 312; scytale e caesar box saem de graça. Camada (b), **botão, não fan-out**: busca de permutação de colunas. Assinatura das duas: IC de português (0,073) com **zero** palavra real é a definição de transposição, e é a única família que produz essa combinação. Autoverificação perfeita — toda variante é anagrama da entrada, só a certa forma palavras. |
| 4.2 | **Aplicar um alfabeto de substituição dado** (K1/K2/K3) | P | É a **única peça de substituição que os cinco têm e a bancada não**. A assinatura está na chave, não no texto — mesmo padrão já aceito nos nove decoders que consomem `ctx.key`. Portão duro e barato: só dispara com 26 letras distintas no campo, ou palavra-chave de 3+ letras gerando K1/K2/K3 sob o portão de palavra real. **Zero ruído: sem chave nem entra na corrida.** Cobre o buraco real — mensagem curta com alfabeto dado, que o solver não pega (exige 200+ letras). |
| 4.3 | **Homóglifos e confusáveis** | M | Assinatura forte e medível: duas escritas dentro da mesma palavra não acontece em português legítimo; **uma ocorrência acusa**. Aprovado em §4-2 e verificado como não implementado. A saída que vale é a **lista de posições**, não o texto limpo. **Ressalva de bundle:** só o subconjunto latino/grego/cirílico, carregado sob demanda como os quadgramas — o `confusables.txt` inteiro são centenas de KB e não pode entrar no bundle inicial. |

### Onda 5 — os caros, com portão (5 itens · 2 G + 2 M + 1 P · ~8-10 dias)

| # | item | esforço | por quê |
|---|---|---|---|
| 5.1 | **LSB de imagem → texto** | M | O buraco assimétrico mais nítido: o lado do **som** está completo (`audio/lsb.ts` extrai do PCM cru, mede desvio e aplica `corteMinimo()` que **escala com o tamanho da busca**, devolvendo "possível", nunca "é"); o da **imagem** tem só a vista visual (`imagem/planos.ts`), sem nenhum caminho bits→texto. Falta aplicar ao pixel o motor e — o que importa mais — **a disciplina de falso positivo** que já existe. Ordem de canais, varredura por linha/coluna, 1 a 4 bits. |
| 5.2 | **Morbit** + **Pollux** | M + P | Morbit passa por assinatura (só dígitos, **nenhum zero**, comprimento par — nada mais no acervo tem essa forma) **e** por autoverificação em cascata (permutação certa → Morse válido → palavra real; errada morre no Morse). **Exigência não negociável: teto de trabalho com poda pelos primeiros pares** — 362.880 permutações a cada tecla atrasariam os outros 116 decoders mesmo sem emitir nada. Pollux pega carona no validador e no podador, mas **não no leque**: assinatura zero (é uma tira de dígitos qualquer). Só em `ctx.only`. |
| 5.3 | **Chip ADFGVX no sniffer** | P | Só o chip, que é o que a casa já decidiu no F17: assinatura literal (texto só de A/D/F/G/X, ou mais V, comprimento par) e o retorno é dizer em um segundo "isto é ADFGVX, faltam as duas chaves" — mesmo padrão do Mapcode. O decode fica com Boxentriq/cryptii: o acervo mostra que cifra clássica que exige chave sem entregá-la **zera** (Scotland Yard, 0 de 4 em seis horas). |
| 5.4 | **Cadeia automática de duas camadas** | G | Já está no Roadmap in-app e o filtro que faltava — o selo de palavra real — existe. As provas do acervo são cadeias de 2 a 4 camadas. **Só como botão**, sobre os N melhores da 1ª camada, emitindo apenas o que a cobertura de palavra real confirmar. 117² por tecla é inviável e, pior, geraria dezenas de leituras pronunciáveis. |
| 5.5 | **Mesa de substituição manual** | G | O outro lado do buraco abaixo de 150 letras, mas é UI inteira e cara. **Vem depois de 2.1 e 2.3, que entregam metade do valor por um décimo do custo — e é possível que sobre pouco a fazer.** Reavaliar antes de começar, não durante. |

### Gaveta — só começam se um gatilho disparar

Nihilist e Trifid (reabrem *se a F3 mostrar apetite por cifra clássica com chave*) · legenda de semáforo naval (*se a Cola aguentar, e atrás do nyctográfico na fila*) · bandeiras ICS como legenda (*se a âncora de 2024 for corroborada fora do `sources.ts:403`*) · UUencode (*se aparecer um arquivo de Usenet numa prova*) · cistercienses (*"se sobrar tarde"* — mantém nesse patamar, não promove).

---

## 3 · O que não entra, e o critério

Esta seção vale tanto quanto a de cima: **sem o critério escrito, a próxima pessoa reabre a discussão** — e o repositório já tem quatro documentos e uma vitrine repetindo argumentos que o próprio código desmente. Toda linha aqui precisa existir em `docs/` com o gatilho de reabertura junto.

| grupo | n | critério |
|---|---:|---|
| **Cifra de concurso com chave e sem assinatura** — Quagmire I–IV, Condi, Ragbaby, Portax, Nicodemus, Bazeries, Chaocipher, Gromark, AMSCO, Myszkowski, Grandpré, Route com chave, dupla transposição, Hill | 17 | Saída alfabética indistinguível de qualquer substituição **e** chave que ninguém digita numa mesa de rua (a do Hill é uma matriz invertível mod 26; a dupla transposição pede duas). O acervo mostra que cifra com chave não entregue **zera**. Reabre se uma prova entregar a chave junto. |
| **Dígitos sem forma própria** — straddling checkerboard, VIC, monôme-dinôme, Fractionated Morse, homofônica, cifra do relógio, serial do Excel, BCD | 8 | String de dígitos de comprimento variável colide de frente com a família de falsos positivos que já obrigou o `a1z26-ciclico` a exigir palavra real: CEP truncado, idade, placar, matrícula, número de lei. É a receita de **resposta errada com nota alta**. O VIC ainda pede data-chave, frase-chave e indicador pessoal. |
| **Mais alfabetos de base-N** — Base62, Base92, Z85, Base122, Bootstring | 5 | Alfanumérico puro é indistinguível de Base36, Base58, Base64, hash truncado ou ID de sistema — e a bancada já tem sete famílias de base. Cada um a mais aumenta a chance de erro **no mesmo leque**, sem cobrir caso novo. |
| **Mesa de analista de segurança** — HMAC, bcrypt, scrypt, Argon2, PBKDF2, UTF-7, hexdump, Bubble Babble, UUencode, yEnc, extratores de URL/e-mail/IP/MAC/data | 16 | O enunciado do produto exclui por nome. Assinatura literal só prova que **não faz ruído**, não que serve: um `begin 644` numa gincana de rua no Vale é probabilidade ~zero, e o Bubble Babble é notação de fingerprint de SSH. O único extrator que resolve prova aqui é coordenada, e o `location` já a acha na prosa em 26 formatos. |
| **Chega como imagem e não tem âncora** — ~200 alfabetos de ficção, Hexahue, Dancing Men, numerais maia/babilônico/cisterciense/egípcio/ático/suzhou, grade giratória de Cardan | 10 | Não há string para decodificar: a entrada real é foto, fonte instalada ou máscara física. E como legenda ficam fora por falta de âncora no acervo — **200 verbetes afogariam a Cola, e Cola inchada é Cola que ninguém lê às 23h.** |
| **Cosmético de texto** — caixa alta/baixa, remover espaços e pontuação, ordenar, únicos, buscar-e-trocar, regex | 6 | Sem assinatura por definição: a saída é a entrada com outra roupa. E redundante — `foldWord`/`stripDiacritics` já dobram caixa e acento dentro de cada decoder. O único caso real que a família cobre tem aba própria e melhor (Diferenças). |
| **Soletração estrangeira** — holandês, alemão, sueco, russo | 4 | Sem uso e sem âncora: o rádio da prova de 2024 era NATO, que já temos. O buraco real é o pt-BR (item 1.1). Gastar no alemão é copiar catálogo em vez de atender produto. |
| **Estado físico digitado** — Solitaire/Pontifex | 1 | Depende do estado de 54 cartas, que teria de ser digitado inteiro. Fora da mesa de rua por construção. |
| **total** | **67** | |

**Terceirizados com ficha (11):** Trifid, Nihilist, Four-square, Two-square, Enigma, Typex, Lorenz/SZ42, SIGABA, M-209, Purple, Hebern. Critério comum: configuração enorme ou chave dupla, assinatura nenhuma. Uma prova que use Enigma entrega a configuração inteira — foi o que a ITC 2024 p09 fez. O cryptii tem 13 modelos e o CyberChef tem o Bombe; nada disso se replica numa tarde, e nem se deve. `sources.ts` já nomeia onde abrir — **manter as fichas atualizadas é parte do plano**, não sobra.

---

## 4 · O que já estava em aberto — onde cada um caiu

| item aberto | onda | quem decide |
|---|---|---|
| Cauda de UTM | **1.2** | você/eu — conserto dentro da regra já escrita |
| Cauda de geohash devolvendo as duas cidades | **0.2** | você/eu |
| "Letras por linha" no `countSeries` | **1.3** | você/eu |
| Reescrever os argumentos falsos (5 superfícies) | **0.9** + a vitrine em **0.7** | **dono** para cada veredito; redação minha. A linha da vitrine não é decisão: é conserto |
| Testes de ponta a ponta | **3.G** | **dono** — registrado como "eu, quando mandar"; o argumento para mandar agora está no item |
| `pnpm build:data` numa clonagem limpa | **0.8** | **dono** para `build:ceps` sair da cadeia; o passo 1 destruir o `streets.json` é conserto meu |
| Onda 2 (senha, backup, `sync-data`) | fora | **já decidido** — fica escrito. Só separar as duas metades do §2.3, que hoje se contradizem (0.9) |
| **A** · o 4º caractere do geohash | **0.1** | você/eu — resposta errada tem prioridade sobre tudo que está aberto |
| **B** · a vitrine mente em três lugares | **0.7** | dono só no item da URL cancelada |
| **C** · decisão do dono não escrita (as 41 resoluções) | **0.9** | **dono** confirma; a escrita é minha |
| **D** · contagens | virou a linha de base deste documento | — |

As seis fases abertas (F7 homóglifos, F8 marco quilométrico, F11 língua do P, F14 CNEFE, F16 NAC/Geohash-36/S2, F17 Morbit/Pollux/ADFGVX) foram conferidas como ausentes de `src/`. Deste plano, **F7 cai na Onda 4.3** e **F17 na Onda 5.2/5.3**. F8, F11, F14 e F16 não são capacidade dos cinco catálogos e seguem na fila própria — este documento não as promove nem as rebaixa.

---

## 5 · Riscos deste plano

**R1 · O leque cresce e o topo fica mais disputado.** 117 → ~127 decoders (**+8,5%**), mas só ~10 dos 33 itens correm a cada tecla — os outros são painel, aba, botão, legenda ou normalização. Desses 10, quatro (Punycode, Quoted-Printable, MIME, escapes) têm assinatura literal e **não conseguem** fazer ruído. Sobram **6 disputando topo de verdade**: transposição sem chave, Morbit, mojibake, soletração pt-BR, timestamp e homóglifos. **Regra de admissão proposta:** nenhum decoder novo entra com rejeição medida **abaixo de 79,8%** — a do Plus Code curto, o pior atalho que a casa aceita hoje — sem portão extra. O UTM entra com 98,67%; a cauda de geohash de hoje, com 18,3%, não entraria, e é por isso que ela está na Onda 0.

**R2 · Cada decoder novo é mais uma chance de resposta errada com nota alta.** Os três candidatos reais e o portão de cada um: **soletração pt-BR** (substantivos comuns — 100% dos tokens, ≥4 tokens, palavra real na saída, teto de nota); **timestamp** (10 dígitos colidem com protocolo e matrícula — teto de nota, gaveta, nunca topo); **transposição sem chave** (~22 variantes × entrada curta pode formar palavra curta por acaso — piso de comprimento e cobertura, como no `substituicao`). **Regra do teto:** quem não se autoverifica entra com nota abaixo do piso de quem se autoverifica. Quem se autoverifica: Morbit (Morse válido), quebrar hash (bate ou não bate), UTM (caixa geográfica), homóglifos (posição, não texto).

**R3 · Custo por tecla.** Referência já em produção: o `affine` roda **312 variantes** por tecla. O plano acrescenta ~22 (transposição, camada a) mais o Morbit **com teto de trabalho e poda pelos primeiros pares** — sem esse teto são 362.880 permutações atrasando os outros 116 decoders **mesmo sem emitir nada**. **Regra: nada com busca combinatória entra no leque** — vai para botão (permutação de colunas, cadeia automática) ou para Worker (quebrar hash). Usar o mesmo **orçamento de trabalho** que o `substituicao` e o anagrama já usam, não relógio.

**R4 · Bundle.** Já sob demanda: quadgramas 161 KB, `words-packed` com 451 mil palavras. O plano acrescenta pouco — tabela pt-BR ~1 KB, ICS ~1 KB, MD5+CRC-32 ~60 linhas, nyctográfico e runas em ASCII ~2-4 KB — **com uma exceção nomeada: os confusáveis**, que viram centenas de KB se alguém copiar o `confusables.txt` inteiro. Restringir a latino/grego/cirílico e carregar sob demanda. **Regra: nada novo no bundle inicial.**

**R5 · As ondas 2 a 5 são majoritariamente UI, e não há rede.** 1.556 testes verdes, **2 de componente, 0 e2e**, e as quatro peças de risco do plano seguem sem teste. Se o dono não liberar a leva e2e da Onda 3, as ondas 4 e 5 — as que mexem em ranking e fan-out — entram sem rede. É o único risco do documento cuja mitigação depende de decisão de outra pessoa.

**R6 · O documento volta a mentir.** Cinco superfícies carregam argumento falso hoje, e uma delas é a vitrine que o usuário lê; duas frases da casa (`roadmap-content.ts:71` e `sources.ts:403`) se contradizem sobre a mesma âncora. **Regra: item fechado sem linha de doc é item que a próxima passada reabre; item descartado sem gatilho de reabertura escrito é discussão eterna.** As 67 recusas da §3 só valem alguma coisa se virarem texto.

**R7 · A Onda 5 come 40% do plano e entrega 5 das 33 capacidades.** Se o cronograma apertar, **é ela que se corta**, não a Onda 1 — e dentro dela o 5.5 é o primeiro a cair, porque 2.1 e 2.3 podem tê-lo tornado desnecessário.

**R8 · A conta é piso.** O inventário chegou truncado no Grupo 3, item 23. Pode haver verbete não contado, e o total distinto pode subir. O que não muda com isso é a proporção: em cinco catálogos de puzzle, a maior parte do volume é largura de enciclopédia, não capacidade de mesa de rua.

**R9 · Duas contradições dentro do próprio inventário**, resolvidas aqui pelo lado conservador: soletração pt-BR é **M**, não P (§2, Onda 1.1); semáforo naval é **descartado como decoder e condicionado como legenda**, não as duas coisas. Se o dono discordar de qualquer das duas, a decisão é dele e deve virar linha de documento na mesma passada.