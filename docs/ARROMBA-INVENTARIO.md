<!-- Levantamento de 2026-08-19 no dashboard da Equipe Arromba (sessão do dono, só leitura).
     Nada foi baixado, submetido ou alterado lá. -->

# O que existe no site da equipe, e o que dá para trazer

## Como o site é feito

WordPress (Elementor + JetEngine) em `equipearromba.com.br/dashboard/`, e **um app
separado embutido por iframe** em `equipearromba.com.br/bases/` — é ele que faz o
trabalho. O iframe carrega `custom/decoders.js`, `decoders2.js`, `recursivo.js`,
`cacarecos.js`, `bnucadernos.js`, `acertohistorico.js`, `scanner.js`,
`calculadoras.js`, `anagrama-multi.js` e `data/words-index.bin`.

**Duas páginas são porte do nosso código.** A *Biblioteca das bases* reusa as strings
do nosso `library-panel.tsx` ("No acervo", "Navegar", "Fora do acervo — onde
consultar") e a metade de baixo é o nosso `sources.ts` verbatim, nos mesmos 21
verbetes e na mesma ordem. O *Decodificador* traz os nossos exemplos nos chips
(`Nb1458750330`, `88xxx500`, `3722`). É cópia estática — não tem o campo de busca que
a nossa Biblioteca tem, e não consulta a nossa API.

## 1 · Decoders que eles têm e nós não

Conferido arquivo por arquivo em `src/features/decoder/engine/decoders/`.

### 1a · Bases locais do Vale — o que mais vale, e o que nós tentamos e falhamos

| deles | nota |
|---|---|
| **Vaga de estacionamento (Blumenau)** + **Vagas por rua** | 3.448 vagas da área azul. **Nós tentamos e falhamos** — a rota por MITM do app Rek Pay não passou. Eles têm o dado. |
| **Matrícula SAMAE (Blumenau)** | **CORRIGIDO — eles NÃO têm base.** O decoder é só um link para a página oficial. O comentário no código deles chega à mesma conclusão que a nossa, e vai além: o reCAPTCHA é anti-automação deliberado, *e* a 2ª via expõe nome, endereço e débitos do titular **só com a matrícula, sem autenticação** — é dado pessoal de terceiro. Não há o que pedir nem o que trazer. |
| **Imóvel rural (INCRA)** | 2.520 imóveis do SNCR, titulares removidos de propósito. |
| **Folha cartográfica (Blumenau)** | O "folha carta" que apareceu no WhatsApp. |
| **Marco geodésico (IBGE)** · **Chapa** · **Marcos próximos** | **CORRIGIDO — não é a F8.** A F8 do `PLANO-2026-08` é *marco quilométrico de rodovia*, outra coisa. Nós já temos `decoders/estacao-ibge.ts` pré-resolvido sobre `estacoes-ibge.json`. O delta real é o **portão**, que deixa metade da base inalcançável, e o `rotuloTipo`, que não conhece o tipo `E` — 47,3% das linhas mostram a letra crua. |
| **Abrigo da Defesa Civil** + **Abrigos por bairro** | 59 abrigos, aberto/fechado ao vivo. |
| **Acervo Cacarecos** | 8.481 itens em 9 categorias (Vinil 1.791 · Livro 1.619 · Revistas 1.119 · Gerais 1.044 · CD/K7 930 · DVD/VHS 758 · Gibi 475 · Jornal 373 · Brinquedos 322). Busca por código de barras — a mais frequente é `9771413183000`, um ISSN em EAN-13. |
| **Postes por perto** | **CORRIGIDO — já está feito, e é código morto.** `GET /api/postes/near` existe (`PostesController.cs:41`, `ORDER BY coord_bnu <-> point(…)` sobre índice GiST) e `postesProximos` existe (`src/features/poste/api.ts:27`). `grep -rn "postesProximos" src/` devolve **uma** ocorrência: a própria definição. Recurso construído nas duas pontas e nunca ligado. |

### 1b · Identificadores brasileiros

Boleto (linha digitável) · Cartão (bandeira + Luhn) · Certidão (nova matrícula) ·
Chassi/VIN · Processo judicial (CNJ) · Rastreio Correios · Código Mercado Livre ·
GTIN · **Peça ou set de LEGO (Bricker)** · Número por extenso.

### 1c · Cifras que o nosso plano dos catálogos já fila

> **Correção de 2026-08-19.** Quatro linhas desta seção afirmavam ausência onde já existe
> implementação nossa, conferido rodando: **Base91** (`decoders/base91.ts`), **Pigpen**
> (`reference/glyphs.ts`, quatro grades com desenho ASCII, âncora P21/2023), **número por
> extenso** (`decoders/numero-extenso.ts` — e no desenho *oposto* ao deles: nós fazemos
> extenso→dígitos no fan-out e trancamos dígitos→extenso em `ctx.only`) e **cifra de livro**
> (`letter-index` + `ctx.aux` + aba Posições, já `ja-temos` no `INVENTARIO-CATALOGOS.md:71`).
> Isso reforça o achado da frente de re-veredito: *"existe implementação ao lado" não é
> evidência independente — parte do código deles é o nosso voltando.*

| deles | onde cai no nosso plano |
|---|---|
| Punycode (xn--) | Onda 3.3 |
| Quoted-Printable | Onda 3.4 |
| Timestamp ↔ data | Onda 3.7 |
| Scytale (bastão) | Onda 4.1 |
| Substituição — análise de frequência | Onda 2.1 |
| ADFGVX / ADFGX | Onda 5.3 (nós só íamos fazer o chip) |
| Nihilist · Four-square/Two-square · Hill · Enigma (M3) | nós **descartamos ou terceirizamos** |
| Straddling checkerboard · Morse fracionada · UUencode · Base62 · Base91 | nós **descartamos por escrito** |
| Pigpen (Templários) · Grelha de Cardan · Bandeiras/semáforo náutico · Cifra de livro | nós tratamos como legenda ou gaveta |

**Isto não anula as nossas recusas** — o critério delas era assinatura e custo por
tecla, e continua valendo. O que muda é o fato: existe implementação de referência ao
lado, então o custo de trazer os que passarem na régua caiu.

### 1d · Técnico genérico
JWT · UUID · Endereço IP · Endereço MAC · GeoTude.

## 2 · Duas peças de engenharia à frente do nosso plano

**`recursivo.js` — cadeia automática.** É a nossa Onda 5.4, avaliada em **G**, já
funcionando: busca em largura, profundidade 3, 5 ramos por nível, teto de 60 nós e
300 ms, lista `IGNORAR` para o que não faz sentido encadear, e corte de legibilidade
em 0,55. Serve de referência direta.
**Onde nós ganhamos:** a régua de legibilidade deles é uma lista de ~200 palavras
comuns escrita à mão; a nossa é o vocabulário de 451 mil palavras mais os quadrigramas
e o selo de palavra real. Trazer o *desenho* deles com a *nossa* pontuação é
estritamente melhor que qualquer um dos dois.

**`words-index.bin` — wordlist empacotada.** É a Fase 0.1 do plano de performance
(front-coded, ~974 KB contra 1.502 KB, e a CPU do load some). Eles já embarcam.

## 3 · O arquivo de provas — isto resolve a F3

`Provas 2024/2025/2026`, com PDF de **Prova** e de **Apoio** por linha. 2025 tem ~62
entradas, incluindo `RESOLUÇÕES MADRUGADA`, `RESOLUCOES DO SÁBADO` e
`STATUS DE CUMPRIMENTO`. As 41 resoluções de 2024/2025 que faltam ao acervo — a
lacuna que a F3 descreve — **estão aqui**, publicadas.

Provas de 2025 que são exatamente o alvo da bancada: PALÍNDROMO · INICIAIS ·
ONDE ESTOU · ENDEREÇO · GENIO · ANIVERSARIANTES · SALGADINHO · CRÉDITO ·
CONHECIMENTO · NOSTALGIA.

Há também `Gabarito de Códigos` em PDF — o equivalente da nossa Cola.

## 4 · Ferramentas sem equivalente nosso

**Lugares BNU** — acervo de fotos de campo com hashtag, local, *Perto de mim* e
*Foto parecida* (busca reversa por imagem). 29 fotos hoje. Resolve prova de "que placa
é esta", que a bancada não toca.
**Cacarecos** · **Frota** · **Controle de Provas (timer)** · **Calculadoras** ·
**Leitor de Código de Barras** · **Fontes e Símbolos** · **Base de IA** (lista de IAs
+ um Markdown de treino para ler prova e aplicar gabarito).

## 5 · Sobre o Spotify — não é duplicata

O decoder deles é `spotify-user`: **ID numérico de 11 dígitos** (perfil antigo ligado
ao Facebook), resolvido por um `/api/spotify/:id` próprio, com nota 0,58. O que a
nossa investigação propõe é outro eixo — **faixa, álbum e artista** por ID base62 de
22 caracteres, confirmado no oEmbed. Os dois convivem.

> Ressalva pela nossa régua: `^\d{11}$` é assinatura fraca — 11 dígitos colidem com
> telefone, protocolo e matrícula. Se trouxermos, tem de ser com confirmação antes de
> emitir, como o `youtube.ts` faz.

## 6 · O que fica pendente de decisão

1. **Baixar os PDFs** de resolução e o Gabarito de Códigos (a F3 depende disso).
2. **Perguntar a origem** dos dados de SAMAE e de área azul antes de reusar — se
   houve captcha no caminho, não entram por regra da casa, mesmo já coletados.
3. Decidir se as cifras da §1c que nós recusamos **mudam de veredito** agora que
   existe implementação ao lado. O critério não mudou; o custo, sim.
