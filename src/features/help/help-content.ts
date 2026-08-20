/**
 * Conteúdo da página de Ajuda — catálogo de tudo que o The Decrypter lê e
 * decodifica, com exemplos. Mantido em sincronia com os decoders/ferramentas
 * reais; ao adicionar/remover um decoder, atualize a seção correspondente
 * (veja a skill `update-help`).
 */
export interface HelpEntry {
  name: string;
  desc: string;
  /**
   * Um ou mais exemplos que se DIGITAM, e que o guia roda no motor de verdade.
   *
   * ── POR QUE A SAÍDA NÃO É ESCRITA À MÃO ─────────────────────────────────
   * Era, e mentia. A auditoria de 18/08 rodou os 105 exemplos de decoder e
   * achou quatro que não funcionavam — inclusive um (`Hloleh` → `Hello`)
   * impossível por construção, porque transposição não muda o comprimento.
   * Um guia que descreve a saída em vez de calculá-la envelhece no primeiro
   * commit e ninguém percebe.
   *
   * Agora quem responde é o `runDecoders`. O guia não tem como mentir: se o
   * exemplo parar de funcionar, a própria tela mostra que parou.
   */
  examples?: string[];
  /**
   * O que esperar quando o motor NÃO consegue responder sozinho — verbete de
   * consulta (depende da API) ou de aba (não passa pela bancada). É rótulo de
   * expectativa, e a tela diz que é.
   */
  esperado?: string;
  /** Legado das seções de aba e API, onde `in` descreve um arquivo ou uma URL. */
  example?: { in: string; out: string };
}

export interface HelpSection {
  id: string;
  title: string;
  intro?: string;
  entries: HelpEntry[];
}

export const HELP_INTRO = [
  "O The Decrypter é uma oficina de cifras: você cola UMA entrada (texto, números, um código) e ele tenta TODAS as interpretações ao mesmo tempo — 133 cifras, codificações, tabelas e bases de dados — e mostra os resultados ranqueados por “o que faz sentido”.",
  "Os mais prováveis aparecem em cima; o resto fica em “pouco provável”, recolhido. Cada resultado tem um selo (codificação, cifra, transformação, base de dados), um botão de copiar e, quando a saída bate no dicionário pt/en, o selo “palavra real”. Quando há chave (Vigenère, índices, deslocamentos), use o campo de chave; o 2º campo guarda a fonte a indexar ou a lista.",
  "Acima da entrada ficam os chips do sniffer (“isto tem cara de…”) e a barra de Cadeia, que empurra um resultado de volta para a entrada e registra a trilha. O campo de título lê o nome da prova como pista — ele só levanta chips, nunca mexe no ranking.",
  "Tudo roda no navegador. As consultas externas (CNPJ, CEP, ISBN, NCM, PIX, produto pelo código de barras, what3words, geocodificação) passam pelo backend do projeto, e os mapas vêm do OpenStreetMap. O único caso em que um ARQUIVO SEU sai do navegador é o botão “Identificar música” da aba Arquivo, que envia o trecho de áudio recortado — com clique explícito, e nunca sozinho.",
];

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "codificacoes",
    title: "Codificações",
    intro:
      "Representações reversíveis de texto/bytes — detectadas e revertidas automaticamente. Ao escolher uma na barra lateral, um segundo campo também CODIFICA o texto naquela cifra.",
    entries: [
      {
        name: "Punycode (xn--)",
        desc: "O nome de domínio internacionalizado — `xn--brasil-gva.com.br` é `brasilé.com.br`. Assinatura literal: o prefixo `xn--` não aparece em mais nada, e a rejeição medida é 100,00% nos dois corpora. Decodifica rótulo a rótulo, então um domínio misto sai certo. **Cuidado que a bancada toma e outras não tomam:** o prefixo sozinho (`xn--`, sem nada depois) NÃO vira card — um cartão em branco no topo é pior que cartão nenhum, porque quem lê acha que a bancada resolveu e não mostrou.",
        examples: ["xn--brasil-gva.com.br", "xn--80akhbyknj4f"],
        esperado: "brasilé.com.br · испытание",
      },
      {
        name: "Quoted-Printable",
        desc: "O e-mail cru, como sai de um cabeçalho salvo: `=C3=A7` é `ç`. Junta a quebra suave de linha (`=` no fim). **Decodifica sobre BYTES, e isso importa:** a forma ingênua (`charCodeAt & 0xff`) corrompe todo não-ASCII que já estava certo na entrada — `Blumenau é =C3=B3timo` sairia com o primeiro acento quebrado.",
        examples: ["A resposta esta na pra=C3=A7a"],
        esperado: "A resposta esta na praça",
      },
      {
        name: "MIME encoded-word",
        desc: "O assunto de e-mail codificado: `=?UTF-8?B?…?=` (Base64) ou `=?UTF-8?Q?…?=` (Quoted-Printable, com `_` valendo espaço). Vem no mesmo papel colado que o Quoted-Printable — as duas formas aparecem juntas num cabeçalho, e separá-las seria entregar meia leitura.",
        examples: ["=?UTF-8?B?QSByZXNwb3N0YSBlc3TDoSBuYSBwcmHDp2E=?="],
        esperado: "A resposta está na praça",
      },
      {
        name: "Escapes de código-fonte",
        desc: "`\\uXXXX`, `\\xNN` e `%uXXXX` — o que aparece quando alguém copia uma string de dentro de um JS ou de um log. Entra de carona: a forma é literal e o valor é pequeno, mas custa nada e evita que a entrada pareça lixo.",
        examples: ["\\u0050\\u006f\\u006e\\u0074\\u0065"],
        esperado: "Ponte",
      },
      {
        name: "Base64",
        desc: "Texto em Base64.",
        examples: ["SGVsbG8=", "Qm9tIGRpYSwgVmFsZSBkbyBJdGFqYcOt"],
        esperado: "Hello",
      },
      {
        name: "Base32 / Base32 (hex)",
        desc: "Base32 padrão e variante hex.",
        examples: ["JBSWY3DP"],
        esperado: "Hello",
      },
      {
        name: "Base45 / Base58 / Base85 (Ascii85)",
        desc: "Bases compactas (Base45 de QR, Base58 de cripto, Ascii85).",
        examples: ["StV1DL6CwTryKyV"],
        esperado: "hello world (Base58)",
      },
      {
        name: "Base91 (basE91)",
        desc: "Binário→texto mais denso que o Base64 (~23% de inchaço contra 33%), com 91 dos 94 ASCII imprimíveis. Lê aos pares, e cada par carrega 13 ou 14 bits conforme o próprio valor.",
        examples: ["si;ge,EI6U"],
        esperado: "Blumenau",
      },
      {
        name: "Base36 (número)",
        desc: "Um NÚMERO escrito com 0-9 e A-Z — não é binário→texto como as outras bases. Contas em BigInt: acima de 11 caracteres o número comum arredondaria e devolveria outro valor.",
        examples: ["zik0zj"],
        esperado: "2147483647",
      },
      {
        name: "Hexadecimal",
        desc: "Bytes em hex.",
        examples: ["48 69", "42 6c 75 6d 65 6e 61 75"],
        esperado: "Hi",
      },
      {
        name: "Binário / Octal / Decimal (ASCII)",
        desc: "Códigos numéricos de caracteres.",
        examples: ["72 73"],
        esperado: "HI",
      },
      {
        name: "Código Morse",
        desc: "Pontos e traços.",
        examples: ["... --- ...", "-.. . -.-. --- -.. .. ..-. .. -.-. .-"],
        esperado: "SOS",
      },
      { name: "Braille", desc: "Padrões Braille (⠿) → letras.", examples: ["⠓⠊"], esperado: "hi" },
      {
        name: "Baudot / ITA2",
        desc: "Teleimpressora de 5 bits — grupos de cinco 0/1, com troca entre LETRAS e NÚMEROS. Toda entrada de Baudot é também uma sequência binária, então o card “Binário → número” aparece junto e costuma ficar em cima: se o texto que você espera é palavra, olhe o segundo card.",
        examples: ["10110 11000 01100 10000 00001"],
        esperado: "PONTE",
      },
      {
        name: "URL (percent) / Entidades HTML",
        desc: "Decodifica %XX e &entidade;.",
        examples: ["ol%C3%A1"],
        esperado: "olá",
      },
      {
        name: "Teclado T9 (multitap)",
        desc: "Tecla repetida = posição da letra no celular.",
        examples: ["44 33 555 555 666"],
        esperado: "hello",
      },
      {
        name: "Caracteres invisíveis (4 famílias)",
        desc: "São quatro esconderijos diferentes, e a bancada os separa porque são coisas diferentes. **Tags** (U+E0000–E007F) carregam ASCII 1:1 e costumam vir grudadas num emoji — é o truque moderno. **Seletores de variação** carregam um BYTE cada, e foram o “variation selector smuggling” de 2025. **Bidi** não esconde nada: reordena o que você lê, então ali o achado é “a tela mente”, não “achei texto”. E o **largura-zero clássico**, que vira canal binário. Antes a bancada conhecia 7 pontos de código; agora são 406 — e o que passava batido recebia “não há nada escondido”, o pior erro possível numa prova.",
        // O exemplo abaixo PARECE um cadeado sozinho, e é esse o ponto: as cinco
        // letras estão grudadas nele, em Tags. Copie e cole — é assim que a
        // coisa chega numa prova, e um verbete que só DESCREVE o invisível não
        // ajuda ninguém a reconhecê-lo.
        examples: ["\u{1F512}\u{E0050}\u{E004F}\u{E004E}\u{E0054}\u{E0045}"],
        esperado:
          "texto oculto em Tags: PONTE (o emoji parece sozinho; as letras estão grudadas nele)",
      },
      {
        name: "Espaços escondidos (whitespace)",
        desc: "Espaço duplo, tabulação e espaço no fim da linha viram um perfil linha a linha (e bits, quando fecham) — cole preservando as quebras, porque copiar de PDF/Word apaga o sinal.",
        examples: ["4 linhas com espaços duplos"],
        esperado: "perfil por linha → 2102",
      },
    ],
  },
  {
    id: "cifras",
    title: "Cifras clássicas",
    intro: "Substituição e transposição. Algumas (Vigenère, Playfair…) usam o campo de chave.",
    entries: [
      {
        name: "César / ROT-N e ROT13",
        desc: "Desloca o alfabeto por N posições.",
        examples: ["Khoor", "Eoxphqdx"],
        esperado: "Hello (N=3)",
      },
      {
        name: "César — força bruta",
        desc: "Mostra todos os deslocamentos −26 a +26 numa tabela.",
        examples: ["Khoor"],
        esperado: "tabela de −26 a +26 (Hello em −3)",
      },
      {
        name: "Atbash",
        desc: "Alfabeto invertido (A↔Z).",
        examples: ["Svool", "Yofnvmzf"],
        esperado: "Hello",
      },
      {
        name: "Afim (affine)",
        desc: "Cifra afim (a·x + b).",
        examples: ["Ihfphi"],
        esperado: "texto (a,b)",
      },
      {
        name: "Vigenère SEM chave (criptanálise)",
        desc: "O Vigenère desta bancada sempre exigiu a chave — sem ela devolvia NADA, ou seja, só servia para quem já sabia a resposta. Este descobre a chave sozinho: acha o comprimento pelo índice de coincidência por coluna e pelo teste de Kasiski, e recupera cada letra por qui-quadrado da coluna contra o perfil do português. **A CHAVE sai no rótulo** — numa gincana ela costuma ser a resposta, não o texto. Medido em 576 tentativas: **100% de acerto da chave inteira a partir de 150 letras**, para chaves de 3 a 8, e ZERO chave errada acima do corte. Abaixo de 150 ele não emite — em 100 letras acerta 99,5% e mesmo assim entrega 4 chaves inventadas com nota de resposta, e chave quase certa não serve para nada. Cala em texto claro, em César, em Atbash e em texto invertido — e cala quando você preenche o campo de chave, porque aí quem responde é o Vigenère comum.",
        examples: [
          "p frltdggt htggt iioct ihhn xwrcawmso rffpwkh hp dbgxt rr yigfb jyt tvve esems so rlxpqnh gtbgkea rr upjargej s ihgt dexgxgn vschnk ujoamsh rrzvpif xbxggxq pzv trisf wi hstnmg dnke d dehbxab ischb ws gcgxmgc",
        ],
      },
      {
        name: "Substituição monoalfabética (solver)",
        desc: "A cifra que o leque NUNCA quebraria por força bruta: são 26! alfabetos. Sobe a encosta com reinício semeado (determinístico — o mesmo texto dá sempre a mesma resposta), pontuando por quadrigrama do português. Medido em 40 textos por comprimento: 90% de decifra exata com 200 letras, 95% com 300, 100% com 400. Abaixo de 200 não emite — em 120 letras eram 12 leituras erradas em 40, com nota de resposta. Os erros que sobram são quase-acertos de 95 a 99,6% das letras (sai “bincana” por “gincana”), legíveis e corrigíveis a olho, e por isso o piso é 200 e não 400. **Ele devolve algo pronunciável SEMPRE, por construção** — é o candidato natural a mentir com confiança —, então só cruza o corte de “provável” com palavra real confirmada; sem isso fica na gaveta, e o card explica por quê. A tabela de quadrigramas (56 KB) só baixa quando um texto passa nos portões.",
        examples: [
          "q ktlhglzq rtlzq tzqhq tlzq tlegfrorq tdwqobg rq hgfzt rt ytkkg jxt yoeq htkzg rq tlzqeqg etfzkqs rt wsxdtfqx t cget hkteolq egfzqk jxqfzgl rtukqxl tbolztd qso qfztl rt ltuxok hqkq g hkgbodg hgfzg rg kgztokg",
        ],
      },
      {
        name: "Vigenère / autokey / Beaufort / Gronsfeld",
        desc: "Cifras polialfabéticas com chave.",
        examples: ["Rijvs (chave KEY)"],
        esperado: "Hello",
      },
      {
        name: "Playfair / Quadrado de Políbio / Bifid / Tap code",
        desc: "Cifras de tabuleiro 5×5 (Bifid e Playfair usam o campo de chave).",
        examples: ["FNNVD"],
        esperado: "HELLO (Bifid)",
      },
      {
        name: "Trithemius",
        desc: "César progressivo, sem chave: cada letra desloca pela própria posição.",
        examples: ["HFNOS"],
        esperado: "HELLO",
      },
      {
        name: "Porta (Della Porta)",
        desc: "Polialfabética recíproca (cifra = decifra); usa o campo de chave.",
        examples: ["texto (chave KEY)"],
        esperado: "texto claro",
      },
      {
        name: "Cerca (rail fence) / Transposição colunar",
        desc: "Transposições (ziguezague / colunas).",
        examples: ["Hloel"],
        esperado: "Hello (2 trilhos)",
      },
      {
        name: "Cifra de Bacon",
        desc: "Grupos de A/B (5 bits) → letra.",
        examples: ["AABBB AABAA"],
        esperado: "HE",
      },
      {
        name: "Alfabeto fonético (NATO)",
        desc: "Palavras do alfabeto fonético → letras. **Também lê os dígitos**: ZERO a NINE, com as formas de rádio (NINER, TREE, FOWER, FIFE, AIT), e o PLUS — que não é do alfabeto, é o separador do Plus Code ditado como palavra. Sem os dígitos, `TWO FIVE JULIET ROMEO PLUS PAPA EIGHT` (o Plus Code 25JR+P8 de uma prova de 2024) devolvia nada, porque só 3 das 7 palavras batiam e o portão exige 60%.",
        examples: ["Alfa Bravo Charlie"],
        esperado: "ABC",
      },
      {
        name: "Deslocamento de teclado (QWERTY)",
        desc: "Lê a tecla vizinha no teclado.",
        examples: ["tr"],
        esperado: "vizinhas no QWERTY",
      },
      {
        name: "A1Z26 (número↔letra) e invertido (1=Z)",
        desc: "Letra ↔ número da posição no alfabeto; invertido começa do Z.",
        examples: ["8 5 12 12 15"],
      },
      {
        name: "A1Z26 cíclico (a contagem deu a volta)",
        desc: "Quando a contagem passou de 26 e continuou: 27 volta em A, 53 também. Os três decoders A1Z26 acima recusam qualquer valor acima de 26 — e recusavam CALADOS, sem card nenhum, então uma contagem que deu a volta não produzia nada. Sai nas duas bases (1=A e 0=A), rotuladas. Só cruza o corte de “provável” se formar PALAVRA REAL: sem essa trava ele subia com lixo pronunciável em 7 de 20 listas de números comuns — idades, mega-sena, horários.",
        examples: ["34 31 38 38 41", "27 5 12 1", "26 27 28 53"],
      },
      {
        name: "ROT5 / ROT18 / ROT47",
        desc: "Rotaciona dígitos (ROT5), letras+dígitos (ROT18) ou toda a faixa imprimível do ASCII (ROT47).",
        examples: ["12345"],
        esperado: "67890",
      },
      {
        name: "ROT8000 (Unicode)",
        desc: "O ROT13 do Unicode: gira metade do plano básico (63.404 posições), então texto latino vira ideograma e vice-versa — aplicar de novo devolve o original.",
        examples: ["籋籵籾籶籮籷籪籾"],
        esperado: "Blumenau",
      },
      {
        name: "Cifra vocálica (deslocamento com sinal)",
        desc: "Lista de deslocamentos COM sinal (o sinal é o portão): aplicada a A E I O U dá a palavra das imagens das vogais; aplicada posição a posição, cada letra anda o seu próprio valor.",
        examples: ["+11 -4 +7 -6 -2"],
        esperado: "LAPIS (A+11=L · E-4=A · I+7=P · O-6=I · U-2=S)",
      },
      {
        name: "Roda alfabética (disco cifrante)",
        desc: "A1Z26 parametrizado: varre as 26 origens na linha vermelha, os dois sentidos e a 1ª casa valendo 0 ou 1, e desenha o disco lido.",
        examples: ["16 8 22 / 23 4 24 / 4 24 7 / 26 15 22"],
        esperado: "umabicicleta (origem F · horário · 1ª casa = 1)",
      },
      {
        name: "Valor das letras (gematria, primos, redução)",
        desc: "Letra ↔ número por tabela: gematria clássica (A=1, J=10, S=100), primos (A=2, B=3, C=5…) e redução 1–9; também volta de números para letras.",
        examples: ["scotland"],
        esperado: "primos: 67 5 47 71 37 2 43 7",
      },
    ],
  },
  {
    id: "transformacoes",
    title: "Transformações e tabelas",
    intro: "Conversões e tabelas de referência aplicadas à entrada.",
    entries: [
      {
        name: "Conferir hash",
        desc: "A prova dá um hash, você digita o candidato no campo principal e cola o hash no **2º campo**. A bancada diz **bate ou não bate** — é a única família daqui com risco ZERO de resposta errada: não há nota, não há palpite, há sim ou não. Conhece CRC-32 (8 hex), MD5 (32), SHA-1 (40) e SHA-256 (64), e **escolhe o algoritmo pelo comprimento** — pedir para você escolher seria pedir que soubesse o que está tentando descobrir. Quando não bate, mostra o hash calculado, para você comparar caractere a caractere em vez de só ouvir “não”. Sem hash no 2º campo, não emite: é o que o mantém fora do caminho a cada tecla.",
        example: {
          in: "PONTE DE FERRO  +  2º campo: 5d41402abc4b2a76b9719d911017c592",
          out: "MD5 · BATE — ou o MD5 calculado, se não bater",
        },
      },
      {
        name: "Aritmética: fatoração e sequências",
        desc: "Duas linhas novas no painel de aritmética, sob a **mesma regra de palavra-dica** do resto dele: sem “primo”, “fator”, “Fibonacci”, “triangulares” ou “quadrados perfeitos” no texto, elas não existem. É a dica que prova a intenção — um número solto não tem assinatura nenhuma (`1400` é plaqueta de poste, código de rua, ano e quantia), e fatorar todo número acenderia em toda entrada numérica da bancada. As **sequências** só emitem quando TODOS os números pertencem à mesma: um acerto isolado é coincidência, a lista inteira não é. E devolvem as POSIÇÕES, que é o que vira letra.",
        examples: ["Fatore em primos: 60 84 210", "Os numeros sao triangulares: 3 6 10 15 21"],
        esperado: "60 = 2 × 2 × 3 × 5 …  ·  Todos são triangulares — posições: 2 3 4 5 6",
      },
      {
        name: "Timestamp Unix → data",
        desc: "Dez dígitos (ou treze, em milissegundos) que são uma data. Mostra **Brasília e UTC**, porque uma prova do Vale escreve a hora local e mostrar só UTC faria a bancada dizer 21h quando o enunciado diz 18h. Traz o dia da semana, que é o que costuma ser pedido. **Assinatura fraca, e o card sabe disso:** dez dígitos também são protocolo, matrícula e código truncado. O que segura é a FAIXA — só passa o que cai entre 2001 e 2033, o que rejeita 99,02% no corpus real — e um teto de nota que o mantém fora do topo.",
        examples: ["1723680000"],
        esperado: "14/08/2024 21:00 · quarta (Brasília) · 15/08/2024 00:00 · quinta (UTC)",
      },
      {
        name: "Isopsefia e gematria (grego e hebraico)",
        desc: "A letra como NÚMERO — e é outro número que a posição no alfabeto. ρ é a 17ª letra grega e vale **100**; σ é a 18ª e vale **200**. Os dois sistemas são unidades, dezenas e centenas, com três letras arcaicas gregas (digama 6, koppa 90, sampi 900) ocupando os buracos. O portão já estava pago pelo bloco Unicode: um CEP ou prosa em português nunca têm caractere fora do latim. No hebraico, quando há letra FINAL (sofit) o card mostra **as duas contas** — a padrão trata a final como a letra base, e o *mispar gadol* dá 500 a 900 —, porque escolher uma seria decidir pela prova.",
        examples: ["Ιησους", "שלום"],
        esperado: "888 · 376 (padrão) e 936 (mispar gadol)",
      },
      {
        name: "Soletração (X de Palavra)",
        desc: "“P de Pipa, O de Ouro, N de Navio, T de Tatu, E de Estrela” → PONTE. Lê a forma acrofônica e devolve as iniciais. **Não usa tabela de propósito**: o levantamento não achou norma brasileira em palavras portuguesas — a ANATEL só permite o Código Fonético Internacional (e a resolução está revogada), o DECEA publica o ICAO em inglês, e o manual de comunicações do Exército não trata do assunto. A lista brasileira mais citada não tem fonte primária. O que a bancada faz é conferir a ACROFONIA: a palavra tem de começar pela letra ditada, e isso se autoverifica sem lista nenhuma. Exige três pares adjacentes — medido em 262 mil tokens de prosa portuguesa, cadeias de dois pares seguidos aparecem **zero** vezes; as ocorrências isoladas (“é de expectativa”, “s de silêncio”) são armadilha do idioma e não passam. As tabelas ICAO, corrente BR e ICAO-1947 estão na Cola, como consulta.",
        examples: ["P de Pipa, O de Ouro, N de Navio, T de Tatu, E de Estrela"],
        esperado: "PONTE",
      },
      {
        name: "Binário → número",
        desc: "A MESMA entrada tem duas leituras, e a bancada oferece as duas: `01001000 01001001` lido de 8 em 8 vira o texto “HI”, e lido como um número só vira 18.505. Este verbete é a segunda leitura — quando os bits não formam texto legível, quase sempre é porque são um número (um ano, um CEP, uma quantia).",
        examples: ["100101010", "11000000111001"],
        esperado: "dec 298 · hex 12A · oct 452",
      },
      {
        name: "Conversor de base",
        desc: "Converte um número entre decimal, hex, octal e binário (e o caminho de volta: um binário solto também sai como número).",
        examples: ["255"],
        esperado: "hex FF · bin 11111111",
      },
      {
        name: "Números romanos",
        desc: "Romano ↔ arábico.",
        examples: ["MMXXVI"],
        esperado: "2026",
      },
      {
        name: "Número por extenso (pt-BR)",
        desc: "Número escrito por extenso → dígitos, com ordinais e gênero; o caminho inverso (dígitos → extenso) só roda quando você escolhe esta cifra na barra lateral.",
        examples: ["quatrocentos e vinte e três"],
        esperado: "423",
      },
      {
        name: "Texto invertido",
        desc: "Lê a entrada de trás para frente.",
        examples: ["olleh"],
        esperado: "hello",
      },
      {
        name: "Tabela periódica",
        desc: "Quatro leituras: símbolo→número atômico, número→símbolo, peso atômico e fórmula molecular (os subscritos em ordem, com o ausente valendo 1) — esta última também pelo nome do composto em pt-BR.",
        examples: ["H3PO4 H2O HNO3"],
        esperado: "31421113 (subscritos da fórmula)",
      },
      {
        name: "Alfabetos do mundo",
        desc: "A1Z26 no alfabeto CERTO: escolhido um alfabeto no campo de chave, número vira letra e letra vira número dentro dele — o havaiano tem 13 letras, o espanhol põe o Ñ depois do N, o português antigo para no 23. Sem chave, reconhece a escrita (grego, cirílico, hebraico, árabe, georgiano, rúnico, hangul, kana), diz quantas letras ela tem e translitera.",
        examples: ["5 (alfabeto: havaiano)"],
        esperado: "U — 5ª de 13 (no latino seria E)",
      },
      {
        name: "Notas musicais",
        desc: "Cifra anglo (C D E…) ou solfejo (Dó Ré Mi…) → letras e números.",
        examples: ["Dó Ré Mi Fá"],
        esperado: "CDEF",
      },
      {
        name: "Leet ao contrário (letra → dígito)",
        desc: "O caminho de volta do leet: uma palavra só de LETRAS lida como número, porque as letras se parecem com dígitos (B=8, E=3, O=0, A=4, S=5, I=1, T=7, G=6, Z=2). É como uma prova esconde um CEP dentro de uma palavra — em 2024, as letras em negrito de um texto formavam BBEOEOAO, que é 88303040, o CEP da Rua Almirante Barroso. Não tem assinatura, então o portão é o comprimento (6+) e a exigência de que TODA letra seja convertível: palavra comum tem R, N ou M e cai fora sozinha.",
        examples: ["BBEOEOAO"],
      },
      {
        name: "Leetspeak",
        desc: "Normaliza leet para letras.",
        examples: ["l33t h4x0r"],
        esperado: "leet haxor",
      },
      {
        name: "Texto estilizado (Unicode)",
        desc: "𝐧𝐞𝐠𝐫𝐢𝐭𝐨, 𝔣𝔯𝔞𝔨𝔱𝔲𝔯, ⓒⓘⓡⓒⓤⓛⓞ, ｆｕｌｌｗｉｄｔｈ, ᴠᴇʀꜱᴀʟᴇᴛᴇ, ᵖʳᵒᵛᵃ sobrescrita e ʇǝxʇo de cabeça para baixo não são fonte, são outro bloco Unicode — 24 tabelas devolvidas ao ASCII, para a bancada voltar a casar. Bandeira também: cada uma é o par de indicadores regionais do código ISO 3166 do país.",
        examples: ["🇧🇷 🇦🇷 🇺🇾 🇵🇾"],
        esperado: "BR AR UY PY (indicador regional)",
      },
      {
        name: "Acróstico",
        desc: "Primeiras letras de cada palavra/linha (mensagem escondida).",
        examples: ["Sempre / Observe / Lugares"],
        esperado: "SOL",
      },
      {
        name: "Acróstico posicional",
        desc: "A k-ésima letra (do início ou do fim) de cada linha/palavra, as linhas alternadas e a junção nome↔sobrenome.",
        examples: ["6 títulos, um por linha"],
        esperado: "5ª letra do fim de cada linha → TEatro",
      },
      {
        name: "Letra por posição",
        desc: "Uma fonte por linha e os índices na chave (aceita romanos, negativo para contar do fim e pares fonte→letra): cada fonte entrega uma letra.",
        examples: ["6 imperadores + chave “I V II IV IV III”"],
        esperado: "Louros",
      },
      {
        name: "Contagem como chave",
        desc: "A resposta não está no que o texto diz, e sim em quantas coisas ele tem: palavras por parágrafo/linha, itens por bloco, ocorrências de um caractere (2º campo) — com a leitura A1Z26 ao lado.",
        examples: ["8 parágrafos"],
        esperado: "22 5 14 3 5 4 15 18 → vencedor",
      },
      {
        name: "Reagrupar dígitos",
        desc: "Junta TODOS os dígitos da entrada (ignorando vírgulas e prosa) e reparte em blocos fixos: ASCII de 7/8 bits, ASCII decimal de 2/3 e A1Z26 aos pares.",
        examples: ["22 05 14 03 05 04 15 18"],
        esperado: "VENCEDOR (A1Z26, blocos de 2)",
      },
      {
        name: "Leitura de grade",
        desc: "Cinco caminhos sobre a mesma grade (markdown, espaçada ou contígua): quatro braços a partir dos cantos, espiral horária e anti-horária, serpentina por linhas e por colunas.",
        examples: ["grade 8×8 colada"],
        esperado: "quatro braços → PARACUMPRIRESSAPROVAVOCESDEV…",
      },
      {
        name: "Data como chave",
        desc: "Lista de datas → inicial do signo de cada uma; data sozinha abre o painel (signo, dia da semana, dia do ano, serial do Excel, Unix e fase da lua).",
        examples: ["11/07-29/03-23/11-17/01-13/02-02/09-07/11-05/10"],
        esperado: "CASCAVEL (iniciais dos signos)",
      },
      {
        name: "Aritmética escondida",
        desc: "MDC, MMC, raiz, divisão, resto e Kaprekar sobre os números da entrada, com a leitura A1Z26 de cada linha; em prosa só dispara com palavra-dica (“em comum”, “raiz”, “dividir”…).",
        examples: ["21 15 45 60 63 12 15"],
        esperado: "MDC = 3 → 7 5 15 20 21 4 5 → GEOTUDE",
      },
      {
        name: "Cores (hex/RGB/HSL)",
        desc: "Hex, rgb(), hsl() ou uma lista de triplas → nome aproximado na Lista de cores da Wikipédia em português, com as iniciais e os valores nos outros espaços.",
        examples: ["245-245-220, 244-196-48, 0-0-128, 0-0-255, 255-250-250, 153-102-204"],
        esperado: "Bege · Açafrão · Naval · Azul · Neve · Ametista → BANANA",
      },
      {
        name: "Código de cores de resistor",
        desc: "3 a 6 faixas → valor, tolerância e ppm (e só os dígitos, que é o que costuma encadear); também lê ao contrário e faz o caminho inverso, de ohms para cores.",
        examples: ["marrom preto vermelho ouro"],
        esperado: "1000 Ω ±5%",
      },
      {
        name: "Faber-Castell (código da cor)",
        desc: "Código de 3 dígitos do lápis → nome da cor (as 12 conferidas do gabarito), uma por linha, pronto para indexar.",
        examples: ["015"],
        esperado: "Laranja escuro",
      },
      {
        name: "Identificador de hash",
        desc: "Diz qual algoritmo o hash provavelmente é, pelo tamanho/formato.",
        examples: ["5d41402abc4b2a76b9719d911017c592"],
        esperado: "MD5 (32 hex)",
      },
      {
        name: "XOR (com chave)",
        desc: "XOR de chave repetida (entrada em hex ou texto); usa o campo de chave. Clássico de CTF.",
        examples: ["hex + chave"],
        esperado: "texto claro",
      },
    ],
  },
  {
    id: "localizacao",
    title: "Localização e mapas",
    intro:
      "Reconhece coordenadas em vários formatos e plota no mapa. Muitos sistemas têm prefixo fixo por cidade — então um código PARCIAL (só a cauda) já é localizado, assumindo Blumenau ou Itajaí (como o atalho “Nb” do GeoHex, a zona 22J do MGRS e o “JE” do GEOREF). Quando é localização, o card também mostra o membro da frota mais próximo.",
    entries: [
      {
        name: "Coordenadas (DD, DMS, DDM)",
        desc: "Graus decimais, graus/min/seg, graus e minutos.",
        examples: ["-26.9906, -48.6356"],
        esperado: "ponto no mapa",
      },
      {
        name: "Grades globais: UTM · Geohash · Plus Code · Maidenhead · Quadkey · H3",
        desc: "Código completo de qualquer um desses formatos → ponto no mapa.",
        examples: ["89a835d5acbffff"],
        esperado: "H3 → mapa",
      },
      {
        name: "MGRS / USNG (militar)",
        desc: "Referência de grade militar (zona + quadrado de 100 km + par de coordenadas), de 100 km a 1 m de precisão.",
        examples: ["22JGR3221221631"],
        esperado: "Itajaí (-26,9078 · -48,6618)",
      },
      {
        name: "GEOREF (aeronáutico)",
        desc: "World Geographic Reference System: dois pares de letras para a célula de 1° e os minutos ao lado.",
        examples: ["JEMD2005"],
        esperado: "Itajaí (-26,9083 · -48,6583)",
      },
      {
        name: "GARS (célula de 30′/15′/5′)",
        desc: "Global Area Reference System: três dígitos de longitude, duas letras de latitude e os dígitos que dividem a célula em quadrantes e áreas.",
        examples: ["262FG49"],
        esperado: "célula de 5′ sobre Blumenau (-26,9583 · -49,0417)",
      },
      {
        name: "Carta topográfica (nomenclatura CIM)",
        desc: "Cada sufixo desce uma escala, de 1:1.000.000 até a quadrícula de 7,5′. Ponto, espaço, barra e sublinhado valem como separador além do hífen — código copiado de legenda escaneada ou de OCR raramente traz o hífen certo. **A folha ao milionésimo tem nota BAIXA de propósito:** 4°×6° são ~440 por 600 km, o tamanho de um estado, e `SC-22` é nomenclatura legítima e ao mesmo tempo a sigla rodoviária de Santa Catarina. A leitura fica — longe continua válido —, mas não no topo.",
        examples: ["SG-22-Z-B-IV-4-SE", "SG.22.Z.A.III.1", "SG-22"],
      },
      {
        name: "Carta topográfica (número MI)",
        desc: "O Mapa Índice é como o acervo do IBGE e o material impresso identificam a folha. A bancada RECONHECE e diz a escala, mas **não converte em coordenada**: a correspondência entre MI e nomenclatura é uma tabela de ~3.036 folhas, não uma fórmula — o próprio Mapa Índice Digital guarda as duas como colunas separadas. Inventar a conversão daria ponto errado com cara de certo. Procure a folha pela nomenclatura, que essa a bancada resolve.",
        examples: ["MI 2868-1", "MI-2868-2-NO", "MI2868"],
      },
      {
        name: "Grade estatística IBGE",
        desc: "Identificador das células do Censo (Albers/SIRGAS 2000), de 1 km ou 200 m — sai como ponto no mapa.",
        examples: ["1KME5499000N8337000"],
        esperado: "célula de 1 km em Blumenau (-26,9197 · -49,0704)",
      },
      {
        name: "GeoHex — código, cauda “Nb” ou curinga",
        desc: "Código GeoHex completo, OU só os números: Blumenau e Itajaí começam com “Nb”, então a cauda numérica é completada como “Nb”+número (Vale do Itajaí). Casa desconhecida aceita curinga (x, ?, * ou _).",
        examples: ["11478825612"],
        esperado: "Itajaí no mapa (Nb11478825612)",
      },
      {
        name: "GeoTude (“GeoCoding ###”)",
        desc: "Grade decimal aninhada: um índice de 4–6 dígitos dá a célula de 1° e cada par de dois dígitos refina um decimal — o ponto é o canto noroeste da célula, não o centro.",
        examples: ["68130.89.91.15.12"],
        esperado: "-26.8911, -49.0848 (Blumenau)",
      },
      {
        name: "Mapcode (reconhecido pela forma)",
        desc: "A bancada identifica a forma e avisa por um chip; a coordenada ainda não vai ao mapa, porque mapcode local não decodifica sem território (2JF.5R vale em 467 dos 533 territórios — assumindo BR-SC, cai na Prefeitura de Blumenau).",
        examples: ["2JF.5R"],
        esperado: "chip “tem cara de Mapcode”",
      },
      {
        name: "Atalho local: Plus Code curto",
        desc: "Plus Code sem o “area code” (4 chars): completa com o de Blumenau (585G) ou Itajaí (585H) e escolhe o que cai na cidade.",
        examples: ["38RQ+V7"],
        esperado: "Itajaí (585H38RQ+V7)",
      },
      {
        name: "Atalho local: cauda de Geohash",
        desc: "Cauda de Geohash (com letra): a bancada antepõe TODOS os prefixos que tocam Blumenau e Itajaí e mostra cada leitura que cai na cidade. Ela devolve várias de propósito — uma cauda não identifica ponto: a célula do prefixo (~39 × 19,5 km) é menor que a caixa da cidade (52 × 26 km), então a caixa não desempata. O ponto certo está entre as leituras; qual delas é, quem decide é você, olhando o mapa. Compare com a cauda de Plus Code, que devolve uma só porque a célula dela é oito vezes MAIOR que a caixa.",
        examples: ["g7rpj"],
        esperado: "3 leituras: 6gjn / 6gjp em Blumenau, 6gjq em Itajaí",
      },
      {
        name: "Letra de outra escrita (homóglifo)",
        desc: "Uma letra grega ou cirílica escondida dentro de palavra latina — `а`, `е`, `о`, `р`, `с` se desenham **igual** às nossas, e não aparecem na tela. A bancada devolve o texto limpo e, num segundo card, **as posições** de cada intrusa, prontas para entrar na Letra por posição. **A parte difícil não é achar: é não confundir com texto de verdade em outra escrita.** `Привет мир` é russo legítimo, e ali a leitura certa é a transliteração por SOM (`Privet mir`) — que a bancada continua dando. O que separa os dois casos não é o caractere, é o contexto: o portão olha TOKEN a token e só acende quando a intrusa está cercada de latinas. Por isso `β-caroteno`, `Δt = 5 s`, `1000 Ω`, `partícula α` e `το κείμενο` ficam calados. Rejeição medida: **100,0000%** sobre as 463.438 palavras dos dois vocabulários — o portão ingênuo (“tem caractere fora de a-z”) rejeitaria só 64% do português, porque 92 mil palavras nossas têm acento.",
        examples: ["a рorta рreta"],
        esperado: "a porta preta · posições 3 9",
      },
      {
        name: "Substituição com alfabeto dado (K1/K2/K3)",
        desc: "Quando a prova **entrega a chave** e o trabalho é só aplicar. O solver de substituição recusa abaixo de 200 letras — e com razão, porque quebrar por estatística sem texto devolve lixo com cara de resposta —, então entre 22 e 199 letras a bancada não tinha nada. Aceita a chave de dois jeitos: o **alfabeto inteiro** (26 letras distintas, a chave já é a tabela) ou uma **palavra-chave**, e aí ela tenta as três construções clássicas: **K1** (embaralhado no claro), **K2** (embaralhado no cifrado) e **K3** (nos dois). Não é palpite entre três: quem desempata é o vocabulário, e a que não produz português não vira card. Escreva a chave no campo **Chave** — sem ela, este decoder não existe.",
        examples: ["g imgve estg esidpjbjg pg qdpte je keffd sdhfe d fbd"],
        esperado:
          "com a chave `limoeiro` no campo Chave: “a chave esta escondida na ponte de ferro sobre o rio”",
      },
      {
        name: "Pollux (Morse em dígitos)",
        desc: "Cada dígito 0–9 vale ponto, traço ou separador — o mapeamento é a chave, e são 59.049 possíveis. A bancada **não pede a chave**: ela busca, e ordena as leituras pelo vocabulário. **O piso de 80 dígitos é o item inteiro, e o preço dele está dito:** o espaço numérico daqui é povoado (CEP, plaqueta, IBGE, telefone, CPF, timestamp, lista de A1Z26 colada), e com piso baixo o CEP `88353537` devolvia `CETETE` com cobertura total — resposta errada com nota de resposta certa. Falsos positivos medidos por piso, sobre 43 mil números reais: 8 dígitos → 132 · 30 → 2 · 80 → **zero**. A conta: no leque ela só responde onde é menos provável (uma palavra não chega a 80 dígitos). Para cifra curta, use o modo **uma cifra só**, onde o piso sai porque você já escolheu.",
        examples: [
          "0863862507564863867361837824894361830127067301590893812394260864594394237127512804894193597364290527067504290597514391860867062804834127862391894123814307234864817507267124",
        ],
        esperado: "ENCONTRE A CHAVE ESCONDIDA NA PRACA CENTRAL DE BLUMENAU",
      },
      {
        name: "Morbit (Morse em dígitos, aos pares)",
        desc: "Prima do Pollux: cada dígito 1–9 vale um **par** de símbolos de Morse, numa bijeção — 362.880 chaves. **Ela existe apenas no modo “uma cifra só”**, e as duas razões estão medidas. Custo: 49 a 66 ms por entrada, contra 0,4 a 1,0 ms do leque inteiro em texto numérico. Colisão: o portão natural dela é “dígitos sem zero”, e isso deixa passar 622 de 3.000 CEPs, 664 de 1.000 plaquetas e **554 de 600 listas de A1Z26 coladas** — a cifra número um do acervo. No leque ela seria cara e errada; escolhida a dedo, é exatamente o que se quer. **E um erro de papel morre aqui:** dizem por aí que Morbit tem comprimento par. Não tem — a paridade é do Morse, e o último dígito completa o par com um separador.",
        examples: ["2944713271637718768329248583638179147747485"],
        esperado: "escolhendo “Morbit” em uma cifra só: “A CHAVE ESTA NA PONTE DE FERRO”",
      },
      {
        name: "Mojibake (UTF-8 lido como Latin-1)",
        desc: "`informaÃ§Ã£o` de volta para `informação`. É o que sai quando texto acentuado é colado de um PDF, de uma planilha ou de um sistema antigo que leu os bytes com a tabela errada. A assinatura é literal (`Ã` ou `Â` seguidos de pontuação alta, ou `â€`), e há uma segunda porta: a volta **precisa ganhar português que o original não tinha** — senão não é conserto, é outra corrupção.",
        examples: ["informaÃ§Ã£o importante sobre a praÃ§a central"],
        esperado: "informação importante sobre a praça central",
      },
      {
        name: "Faixa de dicas: consultas online pausadas",
        desc: "O Decodificador só consulta CEP, município, aeroporto, poste, CID e filme quando a entrada é **uma linha de até 64 caracteres** — é um portão de custo, e ele é legítimo. O que não era legítimo é o portão fechar calado: colar uma lista, ou um parágrafo, desligava a metade online inteira sem uma palavra na tela, e o resultado ficava indistinguível de “não encontrei nada”. Agora aparece um chip que diz **qual** dos dois motivos foi e para onde ir: lista tem a **aba Lote**, que consulta as N linhas de uma vez; texto longo tem a aba Texto, para isolar o código de dentro dele. As cifras, o realce de palavra real e os anagramas nunca dependeram disso e seguem rodando.",
        examples: ["89010000\n89020000"],
        esperado: "chip “isto é uma lista” — as cifras seguem, e a aba Lote resolve as N linhas",
      },
      {
        name: "Faixa de dicas: ADFGVX / ADFGX",
        desc: "Um chip que **diz o nome da cifra e não a decifra** — de propósito. O ADFGVX exige DUAS chaves (o quadrado de Polibio e a permutação colunar), e o acervo mostra que cifra clássica que precisa de chave sem entregá-la zera: a Scotland Yard fez 0 de 4 em seis horas. Sem as chaves, decifrar é busca combinatória, que fica fora do leque por regra. **O que o chip vale, medido:** num ADFGVX de verdade a bancada emitia cinco cards acima do corte, todos errados (Afim 0,49, César 0,46…) e nenhum nomeava a cifra. Trocar cinco respostas erradas por uma frase certa custa vinte linhas. O portão acende em 0 de 30.000 strings alfanuméricas sorteadas.",
        example: {
          in: "DFFGDDAFVDAAVFAAAXDAGXDAAVGDAAGDXAFV",
          out: "“tem cara de ADFGVX” — a bancada não decifra; se a prova der as chaves, o Boxentriq resolve",
        },
      },
      {
        name: "Folha cartográfica de Blumenau (1:5.000 e 1:1.000)",
        desc: "A carta topográfica nacional a bancada já lia e vai bem até **1:25.000** (`SG-22-Z-B-VI-1-NE`), porque cada nível é uma divisão regular do anterior e se calcula. Abaixo disso ela calava — e calava certo: o desdobramento municipal foi ESCOLHIDO pela prefeitura, não deduzido, e inventar um nome plausível seria o pior resultado possível. Agora as duas escalas municipais entram pela **articulação de voo de 2022 do geoportal**: 93 folhas em 1:5.000 e 938 em 1:1.000, de um ArcGIS aberto, sem chave. Casamento exato — folha fora da articulação continua sem resposta. A data em que a articulação foi baixada aparece no card, porque se a prefeitura republicar a nossa cópia envelhece em silêncio.",
        examples: ["SG-22-Z-B-IV-4-SE-D-IV"],
        esperado: "1:5.000 · 2319 × 3101 m · articulação de voo 2026-08-20",
      },
      {
        name: "Marcos geodésicos por perto",
        desc: "Todo card de coordenada passa a mostrar as estações geodésicas do IBGE num raio de 15 km, com a distância. Não é card novo nem portão novo — é enriquecimento de um card que já ganhou nota por outro motivo. **Por que vale:** a descrição de uma estação costuma ser enunciado pronto (“chapa cravada na cabeceira da ponte de concreto sobre o Rio Perequê”), e é o tipo de referência física que a organização usa como âncora. Roda local, sobre as 491 linhas da base — sem rede, sem espera, e continua funcionando com o backend fora do ar.",
        example: {
          in: "-26.9194, -49.0661",
          out: "1400A · 0,0 km · Chapa padrão IBGE  ·  8121263 · 0,2 km · Estação não materializada",
        },
      },
      {
        name: "Atalho local: cauda de UTM",
        desc: "O par E/N sem o fuso — do jeito que sai de um GPS ou de uma carta topográfica quando alguém copia só os números. A bancada completa com o 22J do Vale e só aceita o que cai na região. É o atalho de cauda MAIS seletivo que existe aqui: **rejeita 98,94%** dos pares sorteados dentro do próprio fuso 22J, contra 79,8% do Plus Code curto e 18,3% da cauda de geohash. A razão é geométrica — a célula do fuso tem 590 × 885 km e a caixa do Vale tem 89 × 89 km, 66 vezes menor. É o oposto exato da cauda de geohash, cuja célula é MENOR que a caixa e por isso não valida nada.",
        examples: ["692000 7021000"],
        esperado: "UTM · assumindo Blumenau — −26,91962 / −49,06640",
      },
      {
        name: "Atalho local: cauda de MGRS",
        desc: "MGRS sem a zona: completa com a 22J do Vale do Itajaí e só aceita o que cai na região.",
        examples: ["FR9203021024"],
        esperado: "MGRS/USNG · assumindo Blumenau — −26,91940 / −49,06610",
      },
      {
        name: "Atalho local: cauda de GEOREF",
        desc: "GEOREF sem o par de 15° inicial: completa com o “JE” do Vale do Itajaí.",
        examples: ["LD5604"],
        esperado: "GEOREF · assumindo Blumenau — −26,92500 / −49,05833",
      },
      {
        name: "what3words",
        desc: "Endereço de 3 palavras (precisa de chave de API).",
        examples: ["///palavra.palavra.palavra"],
        esperado: "ponto no mapa",
      },
      {
        name: "Vídeo do YouTube",
        desc: "Link ou o ID solto de 11 caracteres → título, canal e formato do vídeo, confirmados no oEmbed. Um ID passa despercebido numa prova: parece token ou sobra de URL. Palavra de 11 letras não dispara, e ID inexistente é dito na cara.",
        examples: ["b62kBXlBlyQ"],
        esperado: "título e canal do vídeo",
      },
      {
        name: "Geo URI",
        desc: "O `geo:` é o que sai de QR de local e do botão “abrir no mapa” do Android. O parâmetro `;u=` é informação de prova: diz a incerteza EM METROS, ou seja, o quanto o aparelho não sabia onde estava.",
        examples: ["geo:-26.9194,-49.0661;u=35", "geo:-26.9083,-48.6583"],
        esperado: "Blumenau · precisão declarada de 35 m",
      },
      {
        name: "ISO 6709",
        desc: "A forma do EXIF e do XMP de uma foto. Três coisas juntas dão a assinatura, e é a combinação que a separa de um par de números qualquer: sinal obrigatório nos dois, longitude com TRÊS dígitos de grau (`-049`, nunca `-49`) e barra no fim.",
        examples: ["-26.9194-049.0661/", "-26.9083-048.6583/"],
        esperado: "Blumenau",
      },
      {
        name: "Link curto do OpenStreetMap",
        desc: "O que sai ao compartilhar um ponto no OSM. É o par lat/lng entrelaçado bit a bit num base64 próprio — e cada hífen no fim NÃO é enchimento: desce um nível de zoom.",
        examples: ["https://osm.org/go/0EEQjE--"],
        esperado:
          "Link do OSM · zoom 9 — 51,51077 / 0,05493 (o nome da cidade não sai; o ponto, sim)",
      },
      {
        name: "Placekey",
        desc: "Identificador de LUGAR em duas metades separadas por `@`. Só a de trás vira ponto — ela é um hexágono H3 escrito num alfabeto sem vogais, para não formar palavra. Sem o `@` a bancada não aceita: três trios alfanuméricos soltos têm a forma de meio mundo (e disparam o leitor de ID do YouTube).",
        examples: ["zzw-22y@5vg-7gt-qzz"],
        esperado:
          "Placekey · 37,79527 / −122,39396 — o ponto, no mapa (a bancada não devolve o nome do lugar)",
      },
      {
        name: "C-squares",
        desc: "A grade hierárquica da CSIRO, o que o OBIS e o GBIF publicam em dado oceanográfico e de biodiversidade. Cada grupo depois dos dois-pontos divide a célula por dez, e o primeiro dígito de todos carrega os SINAIS: 1 = NE, 3 = SE, 5 = SW, 7 = NW.",
        examples: ["5204:414:340", "5204:413:441"],
        esperado: "célula de 0,1° sobre Blumenau",
      },
      {
        name: "Estação geodésica do IBGE",
        desc: "A chapa de bronze cravada em ponte, calçada ou rocha. São 491 no Vale do Itajaí, e a descrição do cadastro costuma ser enunciado pronto — “chapa cravada na cabeceira da ponte sobre o Rio Perequê”. Entra por **duas portas**: o código (`1400M`, `8121288`) e a **inscrição da chapa** (`MR-103`), que é o que está de fato gravado no bronze e não se parece nada com o código — sem ela, esse texto terminava num palpite de César. A cobertura da chapa é fina de propósito: 70 das 491 — 57 vêm do campo do cadastro e 13 da própria descrição, que às vezes diz em prosa o que está gravado (“…estampada: RN 2004-R”). Nenhuma das duas tem forma própria, então só respondem quando existem de verdade na base. O card diz o que a estação é pelo **tema** do cadastro (referência de nível, gravimétrica, vértice de triangulação, GPS, Doppler) — e quando a sigla não tem fonte, mostra a sigla e avisa que é sigla, em vez de inventar um nome parecido.",
        examples: ["1400M", "8121288", "MR-103", "RN2004H"],
        esperado: "estação em Blumenau, no mapa",
      },
      {
        name: "CAR (imóvel rural)",
        desc: "UF, geocódigo do IBGE com dígito verificador e 32 hexadecimais. É a assinatura mais forte que a bancada tem, e o município sai do próprio número, sem consulta. A coordenada NÃO sai: o polígono vive no SICAR, atrás de captcha — e a tela diz isso em vez de fingir.",
        examples: ["SC-4202404-D9ADE9A8B4C24E5FA0F3B1C2D3E4F5A6"],
        esperado: "imóvel rural em Blumenau/SC",
      },
      {
        name: "Item do Wikidata (Q…)",
        desc: "O código `Q` do Wikidata resolvido pelo que ele **é**: `Q2` é a Terra, `Q42` é Douglas Adams, `Q155` é o Brasil. Vem o rótulo, a frase de uma linha que diz o que a coisa é, a classificação — e, **quando o item tem coordenada, o card vira ponto no mapa**, que é o que mais serve aqui. A bancada continua lendo todo `Q…` como cauda de Geohash (medido, 61% deles saem assim) e as cinco leituras continuam na tela: o que muda é a ordem, porque acerto exato num identificador que aponta para **um** item vale mais que palpite assumindo prefixo de cidade. Nem todo código do Wikidata começa com `Q` — `P` é propriedade (`P345` = “identificador IMDb”) e `L` é lexema (uma palavra); a bancada resolve só o `Q`, que é onde moram as coisas. E um detalhe honesto: quando o rótulo não existe em português, o card **diz em que língua ele está** em vez de apresentá-lo como se fosse daqui — o nome de Douglas Adams no Wikidata vive na língua `mul`, e uma consulta que ignorasse isso devolveria zero para um item que existe.",
        examples: ["Q2", "Q155"],
        esperado: "Terra — terceiro planeta a partir do Sol · e o Brasil, com ponto no mapa",
      },
      {
        name: "Filme pelo ID da IMDb",
        desc: "O código que está na URL do IMDb — `tt` e 7 ou 8 dígitos, como em `imdb.com/title/tt1074638`. **O `Q4941` também serve, e é o mesmo filme:** aquele é o código do Wikidata, o que você copia de uma página de lá. Ele continua sendo lido como cauda de Geohash — medido, 61% dos códigos `Q` são —, mas agora, quando o Wikidata confirma que aquilo é um filme, a ficha fica **acima** das cinco leituras de coordenada: elas são palpite assumindo um prefixo de cidade, e um acerto exato numa base real é evidência de outra natureza. Um `Q` que não é filme (`Q42` é Douglas Adams) segue calado, e a leitura de coordenada é a resposta honesta ali. O QID nunca vira valor encadeável — essa regra é sobre a SAÍDA, e resolver um QID de entrada é o contrário de propagar o engano: é encerrá-lo. **A bancada traz os DOIS títulos** quando eles diferem — o em inglês casa com o enunciado da prova, o brasileiro casa com o cartaz — mais ano, duração e direção. Quando o filme se chama igual nos dois lados (Skyfall, Oppenheimer), aparece um só, porque não há segundo. E quando o Wikidata não tem título marcado como brasileiro, o card **diz isso** em vez de mostrar o original como se fosse. Um detalhe que engana: a etiqueta `pt` do Wikidata significa *português*, não *Portugal* — “Regresso ao Futuro” é de lá, mas “007 - Operação Skyfall”, marcado igual, é daqui. Por isso ela aparece como “em português”, e nunca ocupa o lugar do título brasileiro.",
        examples: ["tt0111161", "tt1074638", "Q4941"],
        esperado:
          "Um Sonho de Liberdade / The Shawshank Redemption (1994) · 142 min · dir. Frank Darabont",
      },
      {
        name: "Aeroporto (IATA/ICAO)",
        desc: "Código de aeroporto → nome, cidade, país e mapa (base mundial OpenFlights).",
        examples: ["GRU"],
        esperado: "Guarulhos · São Paulo, Brasil",
      },
    ],
  },
  {
    id: "documentos",
    title: "Documentos e códigos brasileiros",
    intro: "Valida e, quando dá, consulta o significado do número.",
    entries: [
      {
        name: "CPF / CNPJ",
        desc: "Valida (inclui CNPJ alfanumérico) e consulta a empresa de CNPJ válido.",
        examples: ["11.222.333/0001-81"],
        esperado: "CNPJ válido + razão social",
      },
      {
        name: "ISBN",
        desc: "Valida ISBN-10/13 (978/979) e busca o título do livro.",
        examples: ["9788535902778"],
        esperado: "título do livro",
      },
      {
        name: "NCM",
        desc: "Código de mercadoria → descrição oficial.",
        examples: ["22030000"],
        esperado: "Cervejas de malte",
      },
      {
        name: "Código FIPE",
        desc: "Seis dígitos, hífen e um dígito → marca, modelo, ano e preço médio do mês vigente. É a única consulta da bancada que sai direto do seu navegador, e não pelo backend: o WAF da FIPE bloqueia IP de datacenter.",
        examples: ["005345-7"],
        esperado: "VW Gol 2014 Flex · R$ 31.600",
      },
      {
        name: "Votação de candidato (Blumenau)",
        desc: "Número exato de votos → o candidato. É a mecânica inteira da GIA-34: a prova dá a votação, você acha o nome e conta a letra na posição pedida. Cobre só a eleição de 2024 (188 candidatos) — o card diz isso junto do acerto, porque aqui “não achei” não significa “não existe”. Empate de votação aparece inteiro, com todos os candidatos.",
        examples: ["55968"],
        esperado: "Odair Tramontin (Prefeito, 2024)",
      },
      {
        name: "Inscrição imobiliária de Blumenau",
        desc: "O número do carnê de IPTU → o lote no mapa, com endereço, bairro, CEP e área. Aceita as QUATRO grafias da vida real: 412400200002000, 4.1.24.20.2.0, 4-1-24-20-2 e o mesmo número sem os hífens (41241628), que é o que sai de quem copia a tela do geoportal. Sem os hífens o número é ambíguo em 2,3% dos casos, e aí a bancada mostra as leituras reais em vez de escolher uma. **O NÚMERO DE PORTA veio de outra tabela do geoportal:** 57.273 dos 84.539 lotes ganharam número que a base do cadastro não tinha, e o lote de ESQUINA mostra os dois endereços — 1.133 deles respondem por ruas diferentes, que é exatamente o que uma prova usa (“a casa da esquina da X com a Y”). O ponto é o centro do lote, não a porta.",
        examples: ["41241628", "412400160028000", "4.1.24.16.28.0", "4-1-24-16-28"],
        esperado: "7 de Setembro · Centro (4-1-24-16-28)",
      },
      {
        name: "Quadra (Blumenau)",
        desc: "A inscrição imobiliária tem CINCO grupos e aponta um lote; com QUATRO ela aponta a QUADRA, e até agora isso não respondia nada — o decoder de lote não reage a quatro grupos. A camada de eixos não desenha a quadra: ela diz, para cada trecho de rua, que quadra fica de cada lado. Então a quadra se descreve pelo avesso, pelas ruas que a cercam. Cuidado com o nome: a mediana tem 4 ruas em volta e é quarteirão de verdade, mas 7,3% passam de 20 ruas e a maior tem 97 — nas bordas da cidade “quadra” é zona do cadastro, não quarteirão, e o card avisa.",
        examples: ["4-2-14-8", "3-4-10-3", "3.4.10.3"],
      },
      {
        name: "CNAE",
        desc: "Código de atividade econômica → a atividade e a hierarquia inteira (classe, grupo, divisão e seção). Numa cadeia, quem costuma ligar os códigos é a SEÇÃO, não a atividade — do mesmo jeito que o capítulo liga os códigos da CID-10. A pontuação é a assinatura: 62.01-5/01 é inconfundível, enquanto 6201501 nu tem a mesma forma de um telefone, e só sobrevive se o IBGE confirmar.",
        examples: ["62.01-5/01"],
        esperado: "Desenvolvimento de programas · Seção J",
      },
      {
        name: "CID-10",
        desc: "Código de doença → descrição, capítulo e grupo. Aceita A00.0 e A000 (a grafia das bases do SUS), e também acha o código pelo nome da doença. O capítulo costuma ser a pista: numa prova, o que liga os códigos é o agrupamento, não o diagnóstico.",
        examples: ["F41.1"],
        esperado: "Ansiedade generalizada · Capítulo 5",
      },
      {
        name: "Código de barras (EAN-13/8, UPC-A)",
        desc: "Valida o dígito, identifica o país (prefixo GS1) e busca o produto.",
        examples: ["7891000053508"],
        esperado: "EAN-13 · Brasil · produto",
      },
      {
        name: "Boleto / conta de consumo",
        desc: "Código de barras (44), linha digitável bancária (47) ou de arrecadação (48) → banco, valor e o vencimento escondido no fator — mostrado nas DUAS leituras, porque o fator reiniciou em 22/02/2025.",
        examples: ["34191153800000157351234567890123456789012345"],
        esperado: "Itaú · R$ 157,35 · vence 14/08/2026 (ou 23/12/2001)",
      },
      {
        name: "Chave de acesso (NF-e)",
        desc: "As 44 posições da nota fiscal eletrônica fatiadas nos nove campos oficiais, com o CNPJ do emitente pronto para encadear.",
        examples: ["43171207364617000135550000000120141000120146"],
        esperado: "NF-e nº 12.014 · RS · 12/2017 · CNPJ 07.364.617/0001-35",
      },
      {
        name: "Título de eleitor (UF)",
        desc: "12 dígitos com os dois verificadores conferidos: os dígitos 9–10 dizem o estado onde a pessoa vota.",
        examples: ["123456780990"],
        esperado: "Santa Catarina (SC)",
      },
      {
        name: "Placa de veículo",
        desc: "Converte antiga ↔ Mercosul (o 5º caractere é o 2º dígito virado letra) e aponta a UF pela faixa de letras — a Mercosul nativa não codifica estado nenhum.",
        examples: ["ABC-1234"],
        esperado: "ABC1C34 · Paraná (PR)",
      },
      {
        name: "Rastreio postal (Correios / UPU S10)",
        desc: "Confere o dígito verificador do código de 13 caracteres, classifica o tipo de serviço pela norma e resolve o país de postagem pelo sufixo.",
        examples: ["PB123456785BR"],
        esperado: "DV confere · postado no Brasil",
      },
      {
        name: "Quantidade de dígitos",
        desc: "Diz que documentos/códigos têm aquele tamanho.",
        examples: ["12345678901"],
        esperado: "11 díg.: CPF · PIS · título…",
      },
      {
        name: "Município (IBGE)",
        desc: "Código IBGE → município e UF.",
        examples: ["4202404"],
        esperado: "Blumenau — SC",
      },
      {
        name: "DDI (código de país)",
        desc: "Número de país → nome.",
        examples: ["55 56"],
        esperado: "Brasil · Chile",
      },
      {
        name: "DDD (área do Brasil)",
        desc: "Código de área → UF, região e cidades.",
        examples: ["47 48"],
        esperado: "SC norte · SC sul",
      },
      {
        name: "Cidade → DDD",
        desc: "Caminho inverso: a lista de cidades vira a sequência de códigos de área, que costuma montar um telefone (a UF vai visível para você flagrar homônimo).",
        examples: ["Blumenau, Porto Alegre"],
        esperado: "47 · 51 → 4751",
      },
      {
        name: "Domínio .br (Registro.br)",
        desc: "Domínio terminando em .br → status (registrado/disponível) e expiração, via BrasilAPI.",
        examples: ["uol.com.br"],
        esperado: "Registrado · expira em…",
      },
      {
        name: "Participante PIX (ISPB)",
        desc: "ISPB de 8 dígitos → instituição participante do PIX (lista do BrasilAPI).",
        examples: ["60746948"],
        esperado: "BANCO BRADESCO S.A.",
      },
    ],
  },
  {
    id: "mundo",
    title: "Países e moedas",
    intro:
      "Tabelas fechadas do mundo, embutidas e sem rede — a prova dá um código e pede outro. O portão é a própria tabela: sigla que não é código não acende cartão nenhum.",
    entries: [
      {
        name: "País (ISO 3166 · COI · FIFA · ccTLD · placa)",
        desc: "Converte nos dois sentidos entre alpha-2, alpha-3, numérico, domínio, o código dos Jogos, o da FIFA e a placa internacional; aceita lista (“SUI POR NED”), confronto com hífen, o nome, o apelido (“Holanda”) e a capital. Quando o código tem duas leituras, mostra as duas — ROU é Romênia no ISO e Uruguai na placa.",
        examples: ["GER"],
        esperado: "Alemanha · DEU · 276 · .de · placa D (GER é o COI, não o ISO)",
      },
      {
        name: "Moeda (ISO 4217)",
        desc: "Código alfabético (USD), numérico (840) ou símbolo (R$, €, ¥) → nome em pt-BR, símbolo, casas decimais e os países que usam. Aceita vários de uma vez (BRL USD EUR), avisa quando o símbolo tem mais de um dono e ainda reconhece moeda retirada (BGN, HRK, DEM), dizendo por qual foi substituída. Atenção às casas: o iene tem 0, não 2.",
        examples: ["986"],
        esperado: "BRL → real · R$ — 2 casas decimais · Brasil",
      },
    ],
  },
  {
    id: "bases-blumenau",
    title: "Bases de Blumenau / Santa Catarina",
    intro: "Dados locais embutidos, usados nas provas da Equipe Arromba.",
    entries: [
      {
        name: "Código de rua (Blumenau)",
        desc: "Número de cadastro da rua → nome, bairro, lei.",
        examples: ["3722"],
        esperado: "Rua ABACATE…",
      },
      {
        name: "Nome de rua (Blumenau)",
        desc: "Trecho do nome → ruas que combinam (exato e parcial, ignora acentos).",
        examples: ["abacate"],
        esperado: "Rua ABACATE…",
      },
      {
        name: "Nº da Lei (Blumenau)",
        desc: "Número da lei → rua correspondente.",
        examples: ["6416"],
        esperado: "rua da lei 6416",
      },
      {
        name: "Data da Lei (Blumenau)",
        desc: "Data → ruas oficializadas naquele dia.",
        examples: ["09/02/2004"],
        esperado: "ruas dessa data",
      },
      {
        name: "CEP (Santa Catarina)",
        desc: "CEP exato ou curinga (88xxx500) → logradouro e mapa; com só os 6 dígitos finais, testa os dois prefixos de SC (88 e 89). O curinga aceita padrão largo — 8xxxxxxx lista todo CEP que começa com 8 —, e o card mostra os 12 primeiros com o total real ao lado; o botão Baixar CSV traz TODOS num arquivo para planilha. 86 CEPs da base não têm nome de município na origem e saem com essa célula vazia.",
        examples: ["010000"],
        esperado: "88010-000 Florianópolis · 89010-000 Blumenau",
      },
      {
        name: "Poste (Cidade Iluminada)",
        desc: "Número da plaqueta → o poste: rua, número, bairro, luminária e coordenada. Só aparece quando existe um poste com aquela plaqueta — não é palpite pela forma do número, e por isso plaqueta curta pontua menos que longa.",
        examples: ["65299"],
        esperado: "Rua XV de Novembro, 920 · Centro",
      },
      {
        name: "Ponte / passarela (Blumenau)",
        desc: 'Nome ou apelido de ponte, passarela ou viaduto → a lei que a nomeou, a data, o que ela transpõe, comprimento e coordenada. Precisa da palavra escrita ("ponte", "passarela", "viaduto", "pontilhão") — sem ela o nome sozinho viraria ruído. Metade das estruturas só existe na lei, sem geometria: o card mostra a lei e diz que não há mapa, em vez de esconder a resposta.',
        examples: ["ponte de ferro"],
        esperado: "Ponte Aldo Pereira de Andrade · Lei 3721/1990 · transpõe o Rio Itajaí-Açu",
      },
    ],
  },
  {
    id: "ferramentas",
    title: "Ferramentas (abas)",
    intro: "Além do Decodificador, abas com funções dedicadas.",
    entries: [
      {
        name: "Lote",
        desc: "A bancada no plural, e só a metade que o Decodificador desliga quando você cola uma lista. Uma entrada por linha, um botão com o número de consultas escrito dentro dele, e **uma linha de saída por linha de entrada — inclusive as que não resolveram**. É a diferença entre as três coisas que pareciam a mesma: “perguntei nestas bases e nenhuma tinha”, “não perguntei, porque não sei procurar isto” e “não sei dizer se cheguei a perguntar”. A palavra “não existe” não aparece nesta aba. No fim há uma coluna pronta para copiar, com o campo escolhido por você (resposta, logradouro, bairro, cidade, UF, coordenada) entre os que de fato foram preenchidos, e o que não resolveu sai marcado com `?` — porque uma linha em branco no meio de um bloco colado é uma não-resposta viajando disfarçada. **Ela não roda as cifras**: sessenta palpites ranqueados numa coluna que vai para a folha da prova é o pior formato possível para um chute; cada linha tem um botão que manda aquele item para o Decodificador. Limites, todos ditos na tela: 60 entradas distintas por rodada, e um orçamento de requisições, porque o teto do servidor é por IP e a equipe inteira atrás do wi-fi do local divide o mesmo balde. Item repetido custa uma consulta e desenha as duas linhas.",
        // ESTÁTICO, e este é o caso que prova a regra: rodado no executor ao
        // vivo, o exemplo saía como “César — força bruta”, “Leetspeak” e
        // “Quadrado de Políbio” — ou seja, o guia demonstrava justamente o que
        // este verbete diz, em negrito, que a aba NÃO faz.
        example: {
          in: "89010000 / 89012000 / tt0111161 / GRU, uma por linha",
          out: "4 linhas: dois CEPs, um filme, um aeroporto — cada uma com o seu desfecho",
        },
      },
      {
        name: "Arquivo",
        desc: "Solte QUALQUER arquivo e descubra o que ele esconde. Ele identifica o que o arquivo é pelos BYTES (não pela extensão, que qualquer um renomeia), mede quantos bytes existem depois do fim declarado, procura outros arquivos embutidos e os RECORTA para você abrir e baixar, extrai o texto legível de dentro do binário e desenha o mapa de entropia. Cada achado leva ao byte exato no hexdump, para você conferir em vez de acreditar. Um recorte vira arquivo novo e volta ao topo da análise, com trilha de migalhas. Tudo local — com UMA exceção, e ela está sempre a um clique de distância: o botão “Identificar música”, no painel de Áudio, envia o trecho que você recortou para um serviço de reconhecimento. Nada mais sai daqui, e nada sai sozinho.",
        example: {
          in: "um .wav com uma foto colada no fim",
          out: "“Este arquivo contém um JPEG inteiro dentro dele” — 9 KB a partir do byte 176.444",
        },
      },
      {
        name: "Arquivo · Áudio",
        desc: "Espectrograma com três vistas de canal (Esquerdo, Direito e Diferença E−D, que revela mensagem em antifase — a que some quando o som vira mono), com piso de dB e faixa de frequência ajustáveis. Lê Morse por tom, DTMF e notas musicais, sempre CANAL A CANAL e sempre no áudio original a 1,0× — velocidade e modo fita são para o ouvido e nunca alimentam detector. Extrai os bits menos significativos com o corte na tela. E recorta trecho e canal para levar a outra ferramenta. O botão “Identificar música” é o ÚNICO ponto da bancada que manda dado para fora: ele envia o trecho recortado (não o arquivo) a um serviço de reconhecimento, só com clique explícito e com o aviso na tela.",
        example: {
          in: "um WAV com Morse só no canal esquerdo",
          out: "PONTE DE FERRO · 802 Hz · 11 WPM",
        },
      },
      {
        name: "Arquivo · Imagem",
        desc: "Planos de bit (é onde se esconde: o bit menos significativo muda 1/255 da cor e some a olho nu), canais isolados, canal alfa forçado a opaco — pixel transparente ainda carrega cor — e EXIF, com a MINIATURA embutida, que costuma ser do original não editado e revela o que foi apagado da foto grande. Onde os planos de bit deixam você **ver** o bit baixo, o botão **Procurar texto no bit menos significativo** o **lê**: são 20 interpretações (quais canais, varredura por linha ou por coluna, ordem dos bits) e a tela diz quantas foram testadas e qual o corte de tamanho usado — quanto mais se testa, mais acaso se colhe, e você precisa desse número para saber o que “achou” significa. **Ele se desliga sozinho em JPEG e WebP**, e diz por quê: formato com perda descarta justamente o bit baixo, então ali a busca devolveria ruído com a mesma cara de “não achei”. Tem também o botão **Ler QR / código de barras**: ele lê o código direto da FOTO da prova, sem app de celular no meio, e o resultado vai para a bancada com um toque em “usar como entrada”. Serve para QR, EAN e Code 128.",
        example: {
          in: "um PNG com texto no bit 0 do azul",
          out: "a frase aparece nítida no plano isolado",
        },
      },
      {
        name: "Arquivo · Vídeo",
        desc: "Quadro de um segundo específico e tira de miniaturas para achar o instante. Mostra o segundo REAL entregue ao lado do pedido, porque o navegador salta para o quadro decodificável mais próximo. Cada quadro extraído vira um PNG e volta ao topo da análise.",
        example: { in: "1:23,4", out: "o quadro, com aviso se o vídeo entregou 1:22,9" },
      },
      {
        name: "Arquivo · YouTube",
        desc: "Cole o link: título, canal, formato, o player pulando para o segundo, e os quadros que o YouTube publica (dois deles em 1920×1080), analisáveis como imagem. NÃO baixa vídeo nem áudio — é regra dos termos de uso deles, não limitação técnica. E não rode análise de bits nesses quadros: são recomprimidos a partir de vídeo já com perdas.",
        example: { in: "youtu.be/dQw4w9WgXcQ", out: "ficha do vídeo + 7 quadros publicados" },
      },
      {
        name: "Decodificador",
        desc: "A busca única: cola a entrada e vê todas as interpretações ranqueadas. Tem campo de chave, 2º campo (a fonte a indexar, a lista, o texto original), ruas e CEP de Blumenau/SC (com curinga, ex.: 88xxx500) e uma barra lateral pra rodar só uma cifra — que, quando ela sabe, também CODIFICA.",
        // A aba principal era o único verbete do guia inteiro sem uma entrada
        // sequer. O curinga é o exemplo certo porque mostra as duas coisas de
        // uma vez: que a bancada consulta base de verdade, e que ela devolve a
        // CONTAGEM quando há muitos, em vez de eleger um.
        examples: ["88xxx500"],
        esperado: "os CEPs de SC que casam o padrão, com o total verdadeiro ao lado",
      },
      {
        name: "Cadeia (usar como entrada)",
        desc: "Todo resultado encadeável tem “usar como entrada”: o valor volta para o campo de entrada e a barra de Cadeia guarda a trilha (até 8 passos), com desfazer e limpar — as provas são cadeias de 2 a 4 camadas.",
        example: {
          in: "Base64 → contagem → A1Z26",
          out: "trilha clicável de volta a qualquer passo",
        },
      },
      {
        name: "Título da prova",
        desc: "O nome da prova entra como pista e levanta chips de sugestão; nunca altera o ranking, e nada é selecionado sozinho.",
        example: { in: "Químico maluco", out: "chip → tabela periódica (fórmula molecular)" },
      },
      {
        name: "Chips do sniffer",
        desc: "Faixa de “isto tem cara de…” acima dos resultados, fora da corrida: o diagnóstico negativo que nenhum decoder dá (DV que não fecha, ASCII confundido com A1Z26, MDC latente, forma de GeoTude/Mapcode/what3words). Alguns chips rodam a cifra sugerida ou já encadeiam o valor.",
        example: { in: "70 79 82 84 65", out: "“é ASCII, não A1Z26” (valores 65–84)" },
      },
      {
        name: "Selo “palavra real”",
        desc: "Quando a saída de texto bate no dicionário pt/en, o cartão ganha o selo com as palavras reconhecidas — é o autocheck de que a leitura fechou.",
        example: { in: "+11 -4 +7 -6 -2", out: "LAPIS com selo “palavra real”" },
      },
      {
        name: "Texto",
        desc: "Extrai mensagens escondidas: 1ª/última letra de linha e palavra, maiúsculas, após pontuação, espelhado, leitura em coluna/diagonal e repetidas — mais as séries de contagem (palavras por parágrafo/linha, itens por bloco, ocorrências de um caractere), cada uma com a leitura A1Z26 ao lado.",
        example: {
          in: "Talvez a resposta\nEsteja escondida\nAqui, na primeira\nTecla de cada linha\nRealmente\nO tempo dirá",
          out: "primeira letra de cada linha: TEATRO",
        },
      },
      {
        name: "Posições",
        desc: "Quatro modos: passo fixo (7, 14, 21…), lista de posições, N fontes × N índices e N fontes × 1 índice (uma fonte por linha, cada uma entregando uma letra). Posições começam em 1; índice negativo conta do fim.",
        example: { in: "3 fontes + índices 1 5 2", out: "uma letra por fonte" },
      },
      {
        name: "Matriz",
        desc: "Uma grade N×M e regras que decidem o que pintar — por elemento, linha, coluna ou matriz inteira, em camadas ou primeira-que-casa, cada regra dizendo quantas células pegou. Pinta também por lista de células (A1/B1/C1), lê a grade pintada em blocos (dígito na fonte 3×5, Braille 2×3, binário) e exporta desenho, 0/1, coordenadas ou PNG. É a aba que devolve FORMA em vez de texto; a ordem de leitura (espiral, quatro braços) continua sendo do Decodificador.",
        example: {
          in: "A1/B1/C1/A2/C2/A3/B3/C3/A4/C4/A5/B5/C5",
          out: "grade 3×5 pintada = o algarismo 8 (runas do ITC 2019)",
        },
      },
      {
        name: "Diferenças",
        desc: "Compara o texto da prova com a fonte original (sem acento e sem caixa, devolvendo a grafia certa) e entrega quatro tiras copiáveis: palavras trocadas, originais correspondentes, letras que mudaram e contagem de letras de cada trecho.",
        example: {
          in: "prova: “a ponte de ferro sobre o rio” · original: “a ponte de pedra sobre o rio”",
          out: "trocadas: ferro · originais: pedra · letras que mudaram: f-e-r-r-o vs p-e-d-r-a",
        },
      },
      {
        name: "Anagramas",
        desc: "Acha o que o dicionário forma com as mesmas letras: fonte pt, en, pt+en ou bairros e ruas de Blumenau; em uma palavra ou em duas; e com sobra de 1 ou 2 letras quando não fecha exato.",
        example: { in: "amor", out: "roma · ramo · mora" },
      },
      {
        name: "Retrato",
        desc: "Responde a pergunta ANTERIOR a decifrar: que família de cifra é esta? Substituição e transposição preservam o índice de coincidência do idioma — embaralhar o alfabeto ou a ordem das letras não mexe na distribuição, só no perfil. Polialfabética derruba o IC, e ele VOLTA quando o texto é fatiado no comprimento certo da chave: é isso que separa César de Vigenère sem chutar nenhuma das duas, e é isso que diz o tamanho da chave antes de o quebrador rodar. A aba mostra IC, IC por coluna, frequências de letra, bigramas, trigramas e o qui-quadrado contra pt e en. **Abaixo de 150 letras ela se recusa a concluir** e diz por quê: medido, em 60 letras um texto cifrado às vezes casa com o perfil do idioma melhor que um texto real.",
        // O `example` estático, e não `examples`: o guia RODA os exemplos plurais
        // no fan-out de decoders, e esta aba não é decoder — a saída viva seria
        // uma lista de cifras sem relação, mentindo sobre o que a aba faz.
        //
        // A cifra abaixo foi GERADA e conferida (Vigenère de "GINCANA" sobre um
        // enunciado de 264 letras), não escrita à mão: a primeira versão deste
        // verbete trazia uma cifra inventada que a própria aba lia como "texto
        // em claro". É o mesmo defeito que derrubou quatro exemplos na auditoria
        // de 18/08.
        example: {
          in: "GZRUPBSZIQGSGAVZBXARSZIRUCBNJQQCNBMUVHOEATUIBUPVOTMVTOFQ… (Vigenère de 264 letras)",
          out: "Polialfabética, chave de 7 letras — IC 0,0448, quase aleatório; fatiado em 7 colunas cada fatia recupera IC de idioma (encaixe 129%)",
        },
      },
      {
        name: "Anagramas · Buscar por padrão",
        desc: "O que fazer quando os solvers calam. O de substituição não emite abaixo de 200 letras e o de Vigenère precisa de 150 — e a prova curta existe: seis letras num muro, uma palavra num acróstico. Duas sintaxes: no MOLDE a letra é literal, `?` é uma letra qualquer e `*` é um trecho qualquer (`p?nt?` acha ponte, pinta, ponta, penta; `*ção` acha os sufixos). Só DÍGITOS vira molde de repetição — `1221` acha *anna* e *otto*, porque a 1ª letra é igual à 4ª e a 2ª à 3ª, e as duas classes diferem. Essa segunda é a que resolve criptograma: nele não se sabe QUE letra é qual, só onde a mesma se repete. Devolve lista de candidatas, nunca resposta — quem escolhe é quem está jogando.",
        // Estático pela mesma razão do Retrato: `p?nt?` no fan-out de decoders
        // não produz a busca por padrão, produz ruído.
        example: {
          in: "p?nt?   ·   1221",
          out: "ponte · pinta · ponta · penta   |   anna · otto",
        },
      },
      {
        name: "Texto · letras por linha",
        desc: "A aba Texto conta palavras por linha, palavras por parágrafo e itens por bloco — e agora conta LETRAS por linha, que é outra coisa: a contagem de palavras inclui números (“1400” conta como palavra), e para a leitura A1Z26 isso desloca tudo. A âncora é a p04/2024, onde as linhas têm 20, 5, 14, 5 e 20 letras e a leitura dá TENET. A série entra sozinha na lista de contagens e o decoder de chave por contagem a lê de graça.",
        example: {
          in: "cinco linhas com 20, 5, 14, 5 e 20 letras",
          out: "letras por linha → 20-5-14-5-20 → A1Z26 → TENET",
        },
      },
      {
        name: "Fontes",
        desc: "O lado “vejo um símbolo, que letra é essa?”. Separa as duas famílias que a prova confunde: FONTE DE SÍMBOLO do sistema (Wingdings, Wingdings 2, Wingdings 3, Webdings, Symbol e Zapf Dingbats) é desenho que a fonte dá para a letra — só existe se estiver instalada e não se copia (copiar devolve a letra), então a aba MEDE a disponibilidade e diz “não instalada” em vez de mostrar letras latinas caladamente; ESTILO UNICODE é code point, funciona em qualquer máquina e se copia. Traz a grade de referência letra→glifo (é assim que se lê a P22 de 2023, escrita em Wingdings), os 24 estilos copiáveis e o conversor Symbol ⇄ grego.",
        example: {
          in: "SOMA + fonte Symbol",
          out: "ΣΟΜΑ (copiável: grego é caractere de verdade)",
        },
      },
      {
        name: "Cola",
        desc: "Referência do gabarito: cores, quantidade de dígitos, A1Z26, formatos de coordenada, checklist de técnicas, “Bases e onde consultar” (com o selo de aberta/manual/bloqueada/adiada), alfabeto Pigpen, alfabeto manual de Libras e compostos químicos (nome → fórmula).",
        // Exemplo ESTÁTICO, e de propósito: `examples[]` alimenta o executor ao
        // vivo, que roda o fan-out de cifras. Numa aba isso mostraria palpites
        // de César onde deveria mostrar o que a aba faz.
        example: {
          in: "buscar “índice de coincidência”",
          out: "a régua do IC: o que 0,0443 significa e onde olhar",
        },
      },
      {
        name: "Triangulação",
        desc: "Vários pontos digitados em qualquer forma — coordenada (todos os formatos da bancada), CEP, endereço com número, nome de rua ou nome de ponte, inclusive pelo apelido — viram mapa. Com três, dá os quatro centros que não são a mesma coisa: o CENTROIDE (média das posições), o EQUIDISTANTE (circuncentro — à mesma distância dos três, que é o que “triangular” costuma querer dizer), o INCENTRO (equidistante dos lados) e a MENOR SOMA (mediana geométrica: o encontro mais curto para todos, e o único que não é arrastado por um ponto muito distante), mais os lados, ângulos e área do triângulo. Com qualquer quantidade, desenha a rota na ordem digitada, com distância e rumo de cada perna, e reordena pelo trajeto mais curto sem mexer no ponto de partida. Distâncias em linha reta, não pela malha viária. No mapa dá para clicar para marcar um ponto novo e arrastar os pinos para ajustar — a coordenada volta sozinha para o campo. Digitando um nome, ele sugere ruas e pontes da base local, sem consultar nada na rede.",
        example: {
          in: "Ponte dos Arcos · Ponte de Ferro · Ponte do Salto",
          out: "equidistante −26.876451, −49.060724 · rota 5,89 km",
        },
      },
      {
        name: "Postes",
        desc: "Os 45.285 pontos de iluminação pública de Blumenau, com plaqueta, coordenada, rua, bairro e luminária. Busque pelo número da plaqueta, por rua ou por bairro — ou navegue no mapa, que carrega conforme você arrasta. Clicando num poste sai a ficha e o botão de compartilhar, que no celular abre direto o WhatsApp.",
        example: { in: "Itoupava Central", out: "postes do bairro, no mapa e na lista" },
      },
      {
        name: "Biblioteca",
        desc: "As bases que a **API** serve, com o tamanho real de cada uma — a contagem vem do banco, não de um número escrito à mão —, e embaixo as bases públicas que ainda se consultam à mão, com o link oficial. Cada uma abre para navegar, com uma exceção: o vocabulário, que é só contagem. **Não é tudo que a bancada conhece:** ficam de fora as bases que vivem embarcadas no próprio app (as 491 estações geodésicas, as 1.031 folhas da articulação de Blumenau, as votações de 2024 e os eixos com código de logradouro), porque elas não passam pela API. Essas se consultam digitando no Decodificador.",
        // Estático pela mesma razão da Cola — ver o comentário lá.
        example: {
          in: "abrir a base “poste”",
          out: "45.285 linhas, contagem vinda do banco, navegáveis e no mapa",
        },
      },
      {
        name: "Geolocalização",
        desc: "O mapa do assunto: os 26 formatos de coordenada que a bancada entende — inclusive os cadastros com número gravado (lote, imóvel rural, estação geodésica), que não são coordenada disfarçada e por isso quem responde é o Decodificador, com o que cada um é, como se reconhece, um exemplo clicável e o atalho local — porque Blumenau e Itajaí têm prefixo fixo, e um código PELA METADE já localiza. Tem uma caixa que responde “que formato é este?”, nomeia o sistema e plota. Também lista as bases que viram ponto (postes, CEP, ruas, pontes, aeroportos) e onde conferir por fora.",
        example: { in: "22JGR3221221631", out: "MGRS · 1 m · Itajaí no mapa" },
      },
      {
        name: "Frota",
        desc: "Mapa ao vivo dos celulares da equipe (Traccar): posição, velocidade, bateria, “visto há quanto tempo” e o telefone para ligar num toque. **Ela é a ORIGEM do dado, não o lugar onde a proximidade aparece:** “quem está mais perto” é calculado e mostrado dentro dos cartões de localização, de rua e de ponte. Sem o Traccar configurado, a aba diz isso em vez de ficar vazia.",
        // Estático: é fluxo de tela, não entrada de decoder.
        example: {
          in: "abrir a aba com o Traccar ligado",
          out: "cada celular com velocidade, bateria e “visto há 3 min”, e o telefone para ligar num toque",
        },
      },
      {
        name: "Atalho por URL",
        desc: "Cada aba e cada painel têm endereço próprio, em português: `/geolocalizacao`, `/biblioteca`, `/cola`, `/usuarios`, `/ajuda`. E cada CIFRA tem o dela: `/cifra/base64`, `/cifra/atbash`, `/cifra/vigenere-crack` abrem a bancada já rodando só aquela — é o atalho que se manda para a equipe (“usa esta aqui”). O VOLTAR do navegador passou a funcionar dentro da bancada em vez de sair dela, e recarregar mantém onde você estava. Endereço desconhecido cai no Decodificador, sem tela de erro; cifra que não existe idem, e o endereço se corrige sozinho. Quem não é administrador que abrir `/usuarios` vai para a bancada. O que NÃO viaja no link é a entrada: o conteúdo da prova não vai para a barra de endereço.",
        example: { in: "…/cifra/base64", out: "a bancada rodando só o Base64" },
      },
      {
        name: "Entrar e aprovar acesso",
        desc: "O login é um campo só: apelido ou e-mail, o que você tiver. Quem se cadastrou antes do apelido continua entrando pelo e-mail de sempre, sem fazer nada; quem se cadastra agora escolhe um apelido (3 a 24 caracteres, sem acento e sem @) e o e-mail é opcional. Quem se cadastra entra como “aguardando aprovação” e só usa depois que um administrador liberar — não há confirmação por e-mail, a porta é a aprovação. Não existe recuperação automática de senha: quem esquece fala com o administrador, que redefine pelo painel de usuários — o mesmo lugar onde se aprova, bloqueia, define apelido e remove contas.",
        // Estático: é fluxo de tela, não entrada de decoder.
        example: {
          in: "criar conta com apelido “peter” e senha de 8+ caracteres",
          out: "cadastro fica PENDENTE até um admin aprovar — e a tela diz isso, em vez de um 401 genérico",
        },
      },
    ],
  },
  {
    id: "apis",
    title: "APIs utilizadas",
    intro:
      "Consultas externas que o app faz. Quase tudo passa pelo backend do projeto (the-decrypter-api), que cacheia, limita a taxa e guarda as chaves — o navegador só fala direto com o OpenStreetMap e com a FIPE. A FIPE é exceção declarada: o WAF dela bloqueia IP de datacenter, então a chamada do nosso backend morreria — do navegador de quem joga, ela é igual à que o próprio site faz. Mantida em sincronia com o que é realmente chamado.",
    entries: [
      {
        name: "Backend (the-decrypter-api)",
        desc: "Porta de entrada das consultas externas (/cnpj, /isbn, /ncm, /cnae, /registrobr, /pix, /produto, /what3words, /geocode, /fleet) e a consulta multiplexada /lookup, que numa resposta só devolve CEP, município, poste, aeroporto, CID-10 e lote e, agora, das bases grandes: CEP, municípios, aeroportos e postes vêm dele em vez de serem baixados pelo navegador. Uma rota foge do padrão porque devolve arquivo e não JSON: /cep/export, o CSV completo do curinga. Toda chamada leva o token da sessão.",
        example: { in: "/api/lookup?q=…", out: "uma resposta só, com o que a entrada podia ser" },
      },
      {
        name: "BrasilAPI (via backend)",
        desc: "CNPJ, CEP, ISBN, NCM, participantes do PIX (ISPB) e domínios .br (Registro.br).",
        example: { in: "brasilapi.com.br", out: "grátis · sem chave" },
      },
      {
        name: "Reconhecimento de música (via backend)",
        desc: "A ÚNICA chamada que envia um arquivo seu, e só com clique: o trecho de áudio recortado no painel de Áudio sobe para um serviço de reconhecimento e volta com título, artista e o instante dentro da faixa. Sem clique, nada sai. Se o servidor não tiver a chave configurada, a resposta diz isso em vez de fingir que não reconheceu.",
        example: { in: "trecho de 12 s, canal direito", out: "título · artista · timecode" },
      },
      {
        name: "Open Food Facts (via backend)",
        desc: "Nome do produto pelo código de barras (EAN/UPC).",
        example: { in: "world.openfoodfacts.org", out: "grátis · alimentos" },
      },
      {
        name: "what3words (via backend)",
        desc: "Endereço de 3 palavras → coordenada; a chave fica no servidor.",
        example: { in: "api.what3words.com", out: "precisa de chave" },
      },
      {
        name: "Nominatim / OSM (via backend)",
        desc: "Geocodificação de endereço e CEP quando a base local não resolve.",
        example: { in: "/geocode?q=…", out: "coordenada" },
      },
      {
        name: "OpenStreetMap (direto do navegador)",
        desc: "Tiles e mapa embutido dos cartões de localização e da aba Frota.",
        example: { in: "tile.openstreetmap.org", out: "grátis" },
      },
      {
        name: "Traccar (via backend)",
        desc: "Posições dos celulares da equipe que alimentam a aba Frota.",
        example: { in: "/fleet", out: "só com o Traccar configurado no backend" },
      },
      {
        name: "Bases embutidas (sem rede)",
        desc: "Ruas de Blumenau, as 94 pontes/passarelas/viadutos nomeados de Blumenau (lei de denominação + geometria do OSM), CEPs de SC, municípios do IBGE, aeroportos do OpenFlights, as tabelas de país (ISO 3166/COI/FIFA), moeda (ISO 4217), alfabetos do mundo e estilos Unicode e as listas de palavras pt/en vêm empacotados; boleto, chave de NF-e, título de eleitor, placa, rastreio S10 e todas as grades de coordenada (MGRS, GEOREF, GARS, carta e grade do IBGE, e as que entraram em 18/08: Geo URI, ISO 6709, link curto do OSM, Placekey e C-squares) são conta local, sem rede; as 491 estações geodésicas do IBGE no Vale e as 188 votações de Blumenau em 2024 também vêm empacotadas; o Mapcode carrega a lib por import dinâmico, também sem consulta externa.",
        example: { in: "/data/*.json", out: "offline" },
      },
    ],
  },
];
