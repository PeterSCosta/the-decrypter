<!-- Gerado por análise multiagente (14 agentes) em 17/08/2026, com sondas
     executadas em Chromium 148/macOS e leitura do código real. Números marcados
     "medido" são medição; o resto está rotulado. A seção 8 é a crítica de
     completude, que contradiz partes do plano DE PROPÓSITO — leia antes de
     executar qualquer fase. -->

# Plano — aba **Áudio** no The Decrypter

> Estado: proposta de execução. Todos os números marcados **medido** vêm de sondas executadas em Chromium 148 (macOS, 10 núcleos, 16 GB) e em Node com o mesmo V8, mais leitura do código real do repo. Nada foi testado em Safari, Firefox ou celular — o que se afirma sobre eles é documentação e está rotulado como tal.

---

## 1. O que a bancada ganha

Hoje a bancada não abre um arquivo de som: não há um `<input type="file">`, um `AudioContext` ou um `FileReader` em todo o `src/`, e o decoder `morse` (`codecs.ts:183`) só aceita `.` `-` `/` `|` **já transcritos por um humano** — o que a própria documentação registra em `docs/QUEBRAR-PROVAS.md:643` ("não há nada de áudio na bancada") e em `:155` ("no Morse o filtro histórico é o **canal** — luz, som, vídeo — não o decode"). Com a aba Áudio, um arquivo de prova passa a ser olhado (espectrograma), ouvido (invertido, devagar, canal a canal) e lido automaticamente (DTMF, Morse por tom), com o resultado caindo no Decodificador pela mesma Cadeia que o QR da Matriz já usa. O ganho estratégico não é o espectrograma bonito: é que o áudio deixa de ser um beco sem saída e vira **mais uma camada** de cadeia — `áudio → DTMF → A1Z26 → CEP`.

**O que a ferramenta antiga (equipearromba, WordPress) fazia e ficamos devendo:** enviar arquivo · gravar pelo microfone · ouvir ao contrário · espectrograma tempo × frequência · detecção de DTMF · detecção de Morse · leitura de tons e faixas de frequência. Este plano cobre os sete, em fases, **mais** o pedido explícito do dono (separar esquerdo/direito no estéreo) — que a ferramenta antiga não tinha e que é justamente o que revela mensagem em antifase.

---

## 2. A decisão de desenho

### 2.1 Aba própria, não decoder no motor

**Decidido: aba `audio`, `src/features/audio/`, sem tocar em `engine/types.ts`.**

| Fato do repo | Por que mata a ideia de "um decoder de áudio" |
|---|---|
| `Decoder.decode` é **síncrono e puro** por contrato (CLAUDE.md); `runDecoders` roda tudo em laço síncrono (`run.ts:24-36`) | `decodeAudioData` é assíncrono e o Web Audio inteiro é assíncrono |
| O fan-out roda **a cada tecla digitada** | STFT de 60 s estéreo = **932 ms** (medido, Chromium, N=2048/hop=512, 11.244 quadros) |
| `DecodeCandidate` carrega texto | `AudioBuffer` é Float32 planar: **22,0 MB por 60 s estéreo** (medido), ~1,27 GB por hora |
| Saída só de dígitos leva `gate * 0.1` (`score.ts:375`) e afunda abaixo do corte de 0,35 do `partition` | um card de áudio precisaria de `forcedScore`, e `forcedScore` fixo alto promove lixo — o repo já pagou essa conta |

Vale a **opção A** do mapeamento: `types.ts` não muda **nada**. O custo é três edições no `App.tsx` (a união `TabId`, uma entrada em `TABS`, uma linha de render) — não há router. Ícone `AudioLines` (Lucide, `h-4 w-4`), label **"Áudio"**, posicionada entre `fonts` e `reference` (é ferramenta que digere um arquivo, como Matriz e Fontes; as abas de base de dados e mapa ficam no fim). O painel entra por `lazy()` dentro do `<Suspense>` já existente, junto com os quatro de mapa — pelo mesmo critério declarado no comentário do App: o Decodificador é a aba padrão e não pode pagar o chunk de áudio.

### 2.2 Como o resultado de áudio volta para o Decodificador

Cadeia idêntica à do QR da Matriz — o precedente estrutural exato (artefato não-textual → texto → bancada):

```
[card de detecção]  botão "Decodificador" (Wand2)
      → onDecodificador(texto, "Áudio · DTMF")
      → App.tsx  mandarParaDecodificador  → setSemente(texto) + setTab("decoder")
      → <DecoderWorkbench entradaInicial={semente} viaInicial={via} />
      → useDecoder(entradaInicial, viaInicial)  → useState(entradaInicial)
```

Dentro do Decodificador a Cadeia normal assume: `chainValueOf` (`trail.ts:32`) → botão "usar como entrada" (`result-card.tsx:143`) → `chainTo` → `pushStep` + migalhas na `TrailBar`.

**Lacuna a fechar junto (pequena e cara de não fazer):** o handoff entre abas **não semeia a trilha** — `trail` nasce `[]` em `useDecoder`, então a migalha "Áudio" se perde e a cadeia aparece só a partir do DTMF. Correção: `useDecoder(entradaInicial, viaInicial?)` semeando o `useState<TrailStep[]>`, e `mandarParaDecodificador(texto, via)` em `App.tsx:106`. É literalmente o que diferencia a bancada de um decodificador de áudio avulso.

**Três formatos de saída, sempre — não um.** Medido rodando o registro real:

| formato | exemplo | o que acorda |
|---|---|---|
| colado | `5551234` | 9 candidatos, melhor 0,45 (`digit-count`, `base-converter`) |
| separado por espaço | `5 5 5 1 2 3 4` | **15** candidatos: `periodic-table` 0,55 · `cipher-disk` 0,38 · `a1z26` 0,34 · `math-helper` 0,34 |
| agrupado por repetição | `44 33 555 555 666` | **`t9-multitap` = "hello" 0,60** (só dispara neste formato) |

Chips no molde do `SaidaTexto` da Matriz (`matrix-output.tsx:66-127`), `font-mono`, `CopyButton` em cada um. Mandar só o formato colado apaga em silêncio a1z26, tabela periódica, aritmética e T9.

### 2.3 Regra arquitetural inegociável

> **Todo detector roda sobre o `AudioBuffer` ORIGINAL a 1,0×. A variante de reprodução (invertida, acelerada, em modo fita) é outro objeto e NUNCA chega ao detector.**

Medido: em "modo fita" a 0,5× o par DTMF 697/1209 Hz vira 348,6/603,5 Hz — o detector não acha tecla nenhuma, sem erro, com os tons claramente audíveis. Isto merece um teste de regressão próprio.

---

## 3. Fases

Ordem por (valor ÷ custo). As fases 1 e 2 são a aba; da 3 em diante tudo é carona e cada uma decide-se em separado.

### Fase 1 — **Ver e separar** (espectrograma + canais L/D/L−D)

**Entrega.** Enviar arquivo → espectrograma navegável (N, faixa dinâmica, banda de frequência, rampa de cor, branqueamento por mediana) em três vistas de canal (Esquerdo · Direito · Diferença), leitura de dB/Hz/tempo sob o cursor, exportação PNG, cartão de identidade do arquivo (formato real vs extensão, taxa de amostragem real, canais, corte de codec, sobra depois do fim declarado), veredictos de canal ("estéreo falso", "os canais diferem só no piso de ruído", "oposição de fase").

**Arquivos que nascem** (`src/features/audio/`):

| arquivo | o que é |
|---|---|
| `container.ts` + `.test.ts` | ~80 linhas puras sobre `Uint8Array`: magic vs extensão, taxa real (WAV: uint32 LE no offset 24; MP3: frame header), chunks RIFF, sobra no fim, frames ID3 de texto com lista de descarte do resíduo de ffmpeg |
| `decode.ts` + `.test.ts` | arquivo → `AudioBuffer`, com a cópia dos bytes **antes** do detach e escolha da taxa do `OfflineAudioContext` |
| `canais.ts` + `.test.ts` | L, D, mid `(L+D)/2`, side `(L−D)/2`, métricas (`r`, side/mid em dB, `maxDiff`), varredura de lag ±20 ms |
| `stft.ts` + `.test.ts` | radix-2 caseira (~80 linhas), Hann, normalização coerente, dB, quantização Uint8 |
| `stft.worker.ts` | Worker Vite nativo, com progresso e cancelamento |
| `render.ts` + `.test.ts` | matriz Uint8 → `Uint8ClampedArray` RGBA, rampas, eixo linear/log, guarda de área, PNG — molde literal de `matrix/render.ts` |
| `use-audio.ts` | todo o estado |
| `components/audio-panel.tsx` | o painel |

Fora da feature: `App.tsx` (3 edições + `lazy`), `help-content.ts` (via skill `update-help`), `roadmap-content.ts`, e as três linhas de docs que passam a mentir (`QUEBRAR-PROVAS.md:643`, `TODO-CIFRAS.md:51`, `PLANO-CIFRAS.md:447`).

**Decisões fechadas.** Sem dependência nova: a radix-2 caseira mediu **195 ms para 60 s mono, N=2048/hop=1024** (Node) — coerente com os 932 ms de 60 s estéreo com 75% de sobreposição (2× canais × 2× sobreposição). `fft.js` (2.778 B gz, 3,1–3,5× mais rápido) fica como troca localizada e opcional, atrás de `import()` dinâmico, **só se** a medição real no navegador com três canais estourar o orçamento. Eixo de frequência **linear por padrão** (log deforma desenho e destrói o caso de uso principal). Faixa dinâmica padrão **30 dB** (medido: 20 e 30 dB dão letras limpas; 45 dB começa a pintar chuvisco; 60 dB vira lama). Custo total da STFT é praticamente **independente de N** com sobreposição fixa em fração de N (medido: 199/195/203/219 ms para N = 1024/2048/4096/8192) — o botão que mais resolve prova sai de graça.

**Critério de pronto.** Um WAV estéreo sintético com desenho no espectro abre, desenha e exporta PNG idêntico ao que a tela mostra · um arquivo de canais idênticos bit a bit é rotulado "estéreo falso" (medido: `maxDiff = 0` exato, side/mid = −338 dB) · um arquivo com `R = −L` é rotulado "oposição de fase" (medido: `r = −1,000` exato) **e** só depois da varredura de lag confirmar o pico em lag 0 · a guarda de área impede passar de 16.000.000 px e **diz na tela** que a resolução temporal foi reduzida · Worker cancela e reporta progresso · verificado a ~375 px e em desktop, tema claro e escuro · portão `format/typecheck/lint/test/build` limpo.

---

### Fase 2 — **Ouvir** (ao contrário, devagar, canal a canal, baixar WAV)

**Entrega.** Transporte próprio (play/pause/seek) com: seletor de fonte (Esquerdo · Direito · Mono · Diferença) × (normal · invertido); velocidade com presets 0,25 · 0,35 · 0,5 · 0,75 · 1 · 1,5 · 2 · 4 e `<input type="range">`; dois botões de tom — **"manter o tom"** e **"modo fita"**; download em WAV (PCM16 para ouvir, float32 para reanalisar fora); espectrograma invertido por **flip de canvas**, não por recálculo.

**Arquivos:** `wav.ts` + `.test.ts` (RIFF de 44 bytes; medido: 20,2 ms para 60 s mono, 5,49 MB) · `reverse.ts` + `.test.ts` (medido: 4,0 ms para 60 s estéreo) · `use-audio-transport.ts`.

**Por que os dois botões de tom são duas transformações, não um capricho.** Se o organizador **acelerou** a voz num app de celular (reamostragem, efeito esquilo), a inversa exata é `rate 0.5` em **modo fita** — medido: 440 Hz a 0,5× em modo fita dá **222,7 Hz**; com "manter o tom" dá **439,5 Hz** (WSOLA nativa do Chrome funcionando). Escolher o modo errado devolve fala lenta ainda em tom de esquilo, e a equipe conclui que não há mensagem. Não dá para adivinhar qual foi usado — dá-se os dois.

**Critério de pronto.** `playbackRate` travado em 0,25–4 na UI (medido: fora de [0,0625 … 16] **lança** `NotSupportedError`; `0` é aceito em silêncio e vira pausa; o Gecko silencia fora de 0,25–4 por documentação MDN) · elemento criado com `new Audio()` **no hook**, nunca em JSX · alternar normal↔invertida preserva o ponto de escuta usando `duration − currentTime` · cache LRU de 2 variantes com `revokeObjectURL` (11,5 MB por variante por minuto de estéreo) · o espectrograma invertido é rotulado **"ver espelhado"**, jamais "analisar" (provado: o espectrograma do invertido é o espelho exato, erro relativo máximo **2,281e−7**).

---

### Fase 3 — **DTMF**

**Entrega.** Detecção das 16 teclas por Goertzel nas 8 frequências, rodando em L, D e — quando `max|L−D| > 1e-4` — também em L−D e L+D; tabela de tempos (duração de cada tom e de cada pausa, que é onde o hífen do telefone aparece); confiança calibrada na `ConfidenceBar` que já existe; os três formatos de saída; diagnóstico quando não achar nada.

**Arquivos:** `goertzel.ts` + `.test.ts` · `dtmf.ts` (~250 linhas) + `dtmf.test.ts` (~180).

**Núcleo já de-riscado** (protótipo de 40 linhas rodado em Node): não reamostrar para 8 kHz e esquecer o `N=205` do folclore — com `w = 2π·f/fs` o Goertzel é um ressoador exatamente em `f` e o erro contra a DFT ingênua com `k` não-inteiro foi **4,4e-13**. Janela de 25 ms, hop de 10 ms, retangular. **Portão de 5 testes**, todos obrigatórios: silêncio (<−80 dBFS) · **pureza ≥ 0,55** · dominância ≥ 10 dB em cada grupo · twist ≤ 8 dB · **segundo harmônico < 0,10**.

A calibração da pureza é o número central, e ela encosta na ITU-T Q.24 (aceitar até 1,5% de desvio, rejeitar acima de 3,5%):

| desvio | 0% | 1,0% | **1,5%** | 2,5% | **3,5%** | 5% |
|---|---|---|---|---|---|---|
| pureza medida | 0,993 | 0,767 | **0,563** | 0,272 | **0,146** | 0,016 |

**Critério de pronto.** Os 16 símbolos saem certos a 100/60 ms · o alvo `5551234` sai íntegro até **40 ms de tom / 40 ms de pausa** (medido) · com pausa de 25 ms sai `551234` **e a UI reporta a menor pausa observada e avisa** · ruído branco, tom único, voz sintética, batida e alarme são rejeitados · um dígito solto tem confiança ≤ 0,30 e é exibido como diagnóstico ("houve um par isolado em 12,4 s"), nunca como leitura.

---

### Fase 4 — **Morse por tom** *(fazer-depois)*

**Entrega.** Portadora detectada por contraste (ou fixada à mão clicando no espectrograma), envoltória por Goertzel em blocos de 5 ms, limiar por Otsu em dB, deglitch <15 ms, unidade dit/dah por k-means em log-duração, **espaços em dois passos** (Farnsworth), texto + trilha de pontos/traços + WPM lido + confiança.

**Arquivos:** `morse-audio.ts` (~200 linhas) + `.test.ts` (~120). Quando a Fase 1 já calculou o espectrograma, a etapa de achar a portadora **lê a mesma matriz de magnitudes e custa zero**.

**Dois achados que economizam um dia de depuração.** (a) `k = Math.round(0.5 + N*f/sr)` arredonda duas vezes e desloca um bin inteiro: com portadora em 3000 Hz deu **falha total e silenciosa** (CER 100%) enquanto 700 Hz funcionava — o correto é `k = Math.round(N*freq/sr)`. (b) A confiança tem de medir o resíduo contra o modelo **global** de velocidade constante, nunca contra o adaptativo: medido, o resíduo global acompanha o erro (0,018 → 0,174 conforme a deriva vai de 0% a 150%) enquanto o local fica plano (0,019 → 0,038) e a leitura desaba. **Um modelo adaptativo nunca pode ser o juiz de si mesmo.**

**Critério de pronto.** Portão `conf ≥ 0,50`; abaixo disso entra em "pouco provável" (o `partition` já corta em 0,35) · os 8 não-Morse medidos ficam ≤ 0,022 (ruído 0,000 · tom contínuo 0,000 · música 0,000 · DTMF 0,000 · alarme 0,000 · batida 0,000 · fala sintética 0,022) contra `SOS` exato a 0,38 · Farnsworth 18/8 lê com CER 0% · a UI mostra **sempre** o WPM e a trilha ao lado do texto · tudo-ponto/tudo-traço (`OTTO`, `HI 55`) lê pela regra do espaço intra-caractere e, quando não houver como provar a escala, **oferece as duas leituras**.

---

### Fase 5 — **Faixas de frequência + ultrassom** *(fazer-depois)*

**Entrega.** Tabela de energia por faixa (infra 0–20 · grave 20–300 · fala 300–3400 · brilho 3,4k–15k · alta 15k–20k · ultra 20k–Nyquist), por canal; estimador do **ponto de corte do codec**; dois testes de detecção (contraste no tempo, contraste em frequência); botão **"ouvir deslocado"** (heterodino, preserva o tempo) e "fita lenta"; duas leituras baratas de infrassom (offset DC e energia abaixo de 20 Hz) sem promessa de mensagem.

**Arquivos:** `faixas.ts` + `.test.ts` · `heterodino.ts` + `.test.ts` (~40 linhas de biquad + mistura; medido: tom de 19 kHz reaparece em **3996 Hz**, resíduo do audível a −128 dB, 17 ms para 8 s mono).

**Critério de pronto.** A persistência é escrita em **número de janelas (2·N/hop)**, nunca em número fixo de quadros — medido em ruído nulo: exigir 4 quadros deu 298/304/304 bins falsos; exigir 8 deu **0/0/0** · o piso por bin é o **percentil 20** no tempo, não a mediana (com Morse de ciclo 62% a mediana **é** o tom e o teste morre) · bins vizinhos são agrupados num achado só (um tom com rampa de 5 ms acendeu 10 bins) · toda afirmação sobre a faixa alta exibe **em que taxa se decodificou** · o alarme "mosquito" de 17,4 kHz é nomeado como suspeito conhecido, não como mensagem.

---

### Fase 6 — **Gravar pelo microfone** *(fazer-depois)*

**Entrega.** Botão de gravar com espectrograma ao vivo (AnalyserNode, `smoothingTimeConstant = 0`), captura de amostras cruas por `AudioWorklet`, montagem do WAV pelo `wav.ts` da Fase 2, e o resultado entrando no mesmo pipeline de análise.

**Critério de pronto.** Permissão pedida **só no clique**, nunca no mount (`navigator.permissions.query({name:'microphone'})` mostra o estado sem disparar o prompt) · `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2 } })` · a interface **diz** que gravação é conveniência, não instrumento de medição · a aba trata `navigator.mediaDevices === undefined` (em http comum o objeto some inteiro; contam como seguros https, `localhost` e `127.0.0.1` — medido) · **não** usar `MediaRecorder` para material analisável: medido neste Chrome, `audio/wav` = false, e Opus/AAC cortam em ~20 kHz e alteram o espectro.

---

### Fase 7 — **Trilha de tons + binário por dois tons** *(fazer-depois)*

**Entrega.** Lista de eventos `{início, duração, frequência refinada, dBFS, canal}` com guarda de harmônico (H2 ≤ −12 dB) e estabilidade de frequência (<1,5%); classificação da trilha; leitura binária com **expansão pelo relógio de símbolo** (`k = round(d/T)`), nas duas polaridades, com aparo explícito para múltiplo de 8; tabela de rótulos (DTMF, Bell 202, Bell 103, RTTY, ZVEI-1, CCIR-1) que **só nomeia**, nunca decodifica protocolo.

**Arquivo:** `tone-track.ts` + `.test.ts`. **Regra de coordenação:** ninguém reimplementa STFT — `stft.ts` é a fonte única, e se esta fase entrar, DTMF e Morse passam a consumir a trilha em vez de varrer por conta própria. Sem essa regra o mesmo código sai em triplicata e divergente.

**Critério de pronto.** Rótulo só com as duas frequências dentro de ±3% **e** baud compatível; caso contrário, texto seco ("dois tons: 1187 Hz e 2203 Hz, ~1200 símbolos/s") · leitura binária recusada se menos de 90% dos eventos tiverem `|d/T − round(d/T)| ≤ 0,3` · binário × Morse ambíguo mostra **as duas leituras**, nunca escolhe.

---

## 4. Tabela de técnicas

| Técnica | Viabilidade | Esforço | Valor | Recomendação | Fase |
|---|---|---|---|---|---|
| Espectrograma (STFT em Worker, 3 vistas de canal, contraste/branqueamento) | viável | 3–4 dias | alto (condicionado à aba existir) | **fazer-agora** | 1 |
| Separação de canais L/D/mid/side + veredictos + WAV | trivial | 4–6 h como carona | alto | **fazer-agora** | 1 |
| Ao contrário + velocidade com/sem tom + transporte | trivial | ~1 dia | médio | **fazer-agora** | 2 |
| DTMF por Goertzel com portão de 5 testes | viável | 1–1,5 dia | médio | **fazer-agora** | 3 |
| Morse por tom (envoltória + Otsu + k-means) | viável | ~1 dia | médio | fazer-depois | 4 |
| Faixas / ultrassom / heterodino | viável | 0,5–1 dia | médio | fazer-depois | 5 |
| Microfone (gravar, ao vivo) | viável | ~1 dia | médio | fazer-depois | 6 |
| Trilha de tons + binário por 2 tons | viável | 2 dias | médio | fazer-depois | 7 |
| Cartão de identidade do arquivo (magic, taxa real, chunks, ID3, sobra) | trivial | ~3 h | baixo isolado, **dependência dura** da Fase 1 | fazer-agora (dentro da F1) | 1 |
| SSTV completo (Robot 36, Martin, Scottie) | viável | 4–5 dias | baixo | **não-fazer** | — |
| Esteganografia LSB em WAV | trivial | ~2 dias | baixo | **não-fazer** | — |
| Bell 202/AX.25, RTTY completo, PSK31, Selcall como protocolo | viável | ≥2 dias | baixo | **não-fazer** | — |

**Honestidade sobre a âncora no acervo:** varrendo `QUEBRAR-PROVAS.md` (41 provas GIA + ITC 2017/18/19/22/23), há **uma** prova de áudio registrada (GIA-09, que planta "ligada/ligação" na fala; o áudio nem veio no acervo) e **um** Morse por vídeo (ITC 2018 P18 Et.3). **Zero** provas atestadas de DTMF, de desenho no espectro, de backmasking ou de SSTV. Além disso, 97 arquivos de áudio do acervo em `~/Downloads` (593 MB, nove anos) são **78 mp3, 18 aac, 1 m4a — zero WAV**. Nada aqui deve ser escrito na Ajuda ou no commit como "resolve a prova X": é capacidade nova para um canal que o acervo mostra existir, e é seguro contra um truque barato para quem monta a prova.

---

## 5. Armadilhas → tratamento

### Corrupção silenciosa de dado

| Armadilha | Tratamento |
|---|---|
| `decodeAudioData` **destrói** o `ArrayBuffer` de entrada (medido: 176.444 → 0 bytes) | `const bytes = await file.arrayBuffer(); const paraDecodificar = bytes.slice(0);` — a cópia vem **antes**, nunca "em paralelo". Convenção documentada no topo de `decode.ts` |
| Transferir `getChannelData(n).buffer` para o Worker é **aceito** e mata o `AudioBuffer` (`length` vira 0; um `.slice()` seguinte lança "detached") | `const copia = ch.slice(); w.postMessage(copia, [copia.buffer])`. Custo medido do `.slice()`: **0,3 ms** — a segurança é de graça |
| Reamostragem apaga ultrassom: tom de 30 kHz de um arquivo de 96 kHz cai de RMS 0,3535 para **0,0007** (~54 dB) num contexto de 48 kHz, e o espectrograma fica com cara de correto | `OfflineAudioContext` com `alvo = clamp(taxaDoArquivo, 48000, 96000)`; só ocorre upsampling. Nenhuma afirmação sobre a faixa alta sem exibir a taxa usada |
| A taxa **original** do arquivo não é exposta por API nenhuma (`AudioBuffer.sampleRate` já é a do contexto) | `container.ts` parseia o cabeçalho. Medido: 78/78 MP3 reais lidos em **32 ms, 0 falhas** — 62 são 44,1 kHz, 15 são 48 kHz, 1 é 22,05 kHz; num Mac com contexto de 48 kHz, **63 de 78 seriam reamostrados em silêncio** |
| `playbackRate = -1` no `AudioBufferSourceNode` é aceito e renderiza **silêncio** | Inverter o `Float32Array` na mão (`ch.slice().reverse()`, por canal). No elemento `<audio>` a mesma atribuição lança — mas o caminho é o mesmo |

### Falso positivo (o pecado capital desta bancada)

| Armadilha | Tratamento |
|---|---|
| "Energia lateral alta ⇒ mensagem escondida" está **invertido**: música estéreo comum dá side/mid **−10,3 dB**; segredo real em antifase a −34 dBFS dá **−35,3 dB** | O painel **reporta a medição** e entrega o canal derivado ao olho humano. Nunca escreve "há mensagem escondida" |
| Detector de rajada no canal lateral **não funciona** (testado: Morse a −40 dBFS em 60 s de música → **zero** blocos acesos; com largura estéreo 0,12 e 0,30 o salto de RMS lateral é 0,0 dB) | Não implementar. O entregável é o canal derivado alimentando a STFT. Quem acrescentar o medidor depois constrói um gerador de falso negativo silencioso |
| Haas: `D = L` atrasado 1 ms dá **r = −0,93 no lag 0** com tom puro — lê-se como inversão de polaridade e não é | Nunca emitir "oposição de fase" sem confirmar o pico em **lag 0**; com material quase-tonal o pico se repete (melhor lag saiu em −600 amostras com r=+1) → reportar **ambíguo** |
| DTMF: duas senoides puras em F5 (698,46 Hz) e F#6 (1479,98 Hz) passam nos 5 testes e saem como "3" (desvio de 0,21%, dentro do que a Q.24 obriga a aceitar) | Sem conserto no detector. Mitigação de UI: dígito solto tem confiança ≤ 0,30 e vira diagnóstico. Com timbre de instrumento (6 harmônicos) o teste do 2º harmônico rejeita (razões 0,325 e 0,235) |
| Morse: fala sintética produzia `T T T T T T T T T I TTETTA I T T` com 0% de códigos inválidos na versão sem escore | Portão `conf ≥ 0,50`, produto de 6 termos (um critério reprovado zera). Medido: fala 0,022 contra `SOS` exato a 0,38 |
| Pareidolia no espectrograma: com o piso baixo o bastante, ruído vira textura que parece estrutura | Faixa dinâmica padrão de 30 dB · leitura de dB/Hz/tempo sob o cursor para toda alegação ser conferível · **a aba nunca emite candidato para o fan-out nem escreve "mensagem encontrada"** |
| Pareidolia acústica no áudio reverso (é o efeito que sustenta a lenda inteira do backmasking) | Nenhum candidato automático sai da reprodução. O texto só entra na bancada se a **pessoa** digitar o que ouviu |
| Assinatura de contêiner grudado: 119 hits de PK04/PDF/JPEG nos 593 MB reais, **0 validam** | Exigir versão ≤ 63, método em {0,8}, nome imprimível e **EOCD presente**. Com validação: 0 achados |
| Ruído de metadado: 68/97 arquivos têm ID3 e o conteúdo é resíduo de transcodificador (TSSE "Lavf59.2", TXXX "major_brand M4A") | Lista de descarte do resíduo conhecido, senão o cartão parece sempre cheio e ensina a equipe a ignorar o painel |

### Falso **negativo** silencioso (menos visível, igualmente caro)

| Armadilha | Tratamento |
|---|---|
| O canal Diferença sai 20–40 dB abaixo de L/D: sem ganho o espectrograma é preto e a equipe conclui "não tem nada" | Normalizar por pico para −1 dBFS antes de desenhar e de exportar, **com o fator na tela** em `font-mono` ("×32,4 · +30,2 dB"). Normalizar calado é mentir sobre a amplitude |
| Piso fixo esconde o alvo: desenho 30 dB abaixo de uma música na mesma banda ficou **invisível** com faixa 30 dB e **legível** com branqueamento por mediana na mesma faixa | Botão "realçar o que varia no tempo" (~17 ms sobre os 195 ms), desligado por padrão e rotulado · varredura de contraste em 3 faixas · **nunca** escrever "nada encontrado", e sim "nada visível neste contraste" |
| Codec com perda pode ter apagado o dado antes: MP3 128 corta em ~16 kHz, e áudio pelo caminho de voz do WhatsApp vira Opus a 16 kHz de taxa (Nyquist de 8 kHz) | Quando o arquivo não for WAV/FLAC, dizer na cara: "peça o original" |
| Dígito repetido cola: `5551234` com pausa de 25 ms sai `551234`, com 10 ms sai `51234` — e a saída parece plausível | Reportar a **menor pausa observada** e avisar quando se aproxima do limiar; nunca entregar a string calada |
| Áudio acelerado/desacelerado desloca as 8 frequências e o detector devolve zero sem explicar | Mínimo: dizer na Ajuda. Barato: varrer fatores 0,8×–1,25× e reportar "há par coerente se o áudio estiver 12% mais rápido" |
| Farnsworth quebra a razão 1:3:7 (espaços alongam sem as marcas alongarem): dava CER 68,8% **com confiança 0,93** | Espaços em dois passos, com k-means próprio. Depois: CER 0% |
| `decodeBinary` exige múltiplo de 8 e retorna `null` **calado**; `digit-regroup` recusa entrada 100% de bits | O painel oferece o aparo explícito como chip; senão a tira de 203 bits some sem explicação |
| `runDecoders` deduplica por `output` exato | Duas leituras de áudio com o mesmo texto colapsam num card só — esperado, mas a aba precisa mostrar as duas leituras do lado dela |

### Bundle, UI travada, permissão e lint

| Armadilha | Tratamento |
|---|---|
| A aba pesada entrar no chunk de entrada de quem só abre o Decodificador | `AudioPanel` por `lazy()` dentro do `<Suspense>` existente. Lógica sem dependência nova. Se `fft.js` entrar um dia, entra por `import()` **isolado numa função**, com comentário-aviso no topo (molde `qr.ts`/`mapcode.ts`) |
| `fft.js`: `realTransform` deixa **lixo acima de k=N/2** — com um tom no bin 5 de N=64, picos falsos nos bins 37, 41, 43, 45, 47, 53, 57, 59, 61 e 63 | Se for adotado: laço limitado a `k ≤ N/2` (o correto para espectrograma) ou `completeSpectrum(out)`. E `createComplexArray()` devolve `Array` comum, não TypedArray |
| STFT de 60 s estéreo = 932 ms na thread principal, com orçamento de quadro de 16 ms; ~15 ms por segundo de áudio estéreo | Worker obrigatório acima de ~3 s de áudio, com **progresso e cancelamento**. Num celular médio é 3–5× mais lento |
| A Web Audio **não existe em Worker** (medido: `AudioContext` e `OfflineAudioContext` undefined) — decodificar trava a thread principal e não há como evitar | Aceito e declarado. Sem decodificação em streaming e sem recorte antes de decodificar: **teto prático de 10–15 min** em desktop, bem menos em celular. A UI avisa antes de tentar |
| Limite de canvas que falha **em silêncio**: iOS Safari corta em 16.777.216 px de área; 3 min a N=2048/hop=512 = 17,3 Mpx (medido no Chrome: 65535×1000 funciona, 100000×1000 falha) | Guarda de área explícita: dobrar o hop até caber e **dizer na tela**. Desenho não é gargalo (preencher 5622×1024 = 28 ms, `putImageData` = 2 ms) — não vale OffscreenCanvas |
| Memória: 22,0 MB por 60 s estéreo; ~1,27 GB por hora. Cada variante de reprodução soma 11,5 MB/min | Espectrograma em **Uint8**, nunca Float32 (5,8 MB/canal para 60 s, 4× menos). Cache LRU de 2 variantes com `revokeObjectURL` |
| Microfone: em http comum `navigator.mediaDevices` fica **undefined** (não é exceção, é o objeto sumindo) | Checar antes; https é requisito de deploy (nginx/Dokploy), `localhost` resolve em dev. No iOS a permissão é pedida a cada visita — a UI não pode assumir permissão persistente |
| Os filtros de voz do navegador destroem o alvo: `noiseSuppression` trata tom puro como ruído estacionário, `autoGainControl` arruína a detecção de Morse por limiar | Constraints em `false` **e** dizer na interface que gravação é conveniência. O Safari historicamente aceita as constraints sem aplicar — não há como garantir captura crua |
| `lint/a11y/useMediaCaption` dispara em `<audio>` **mesmo sem `controls`** (verificado: 2 erros em 2 elementos) | Criar o elemento com `new Audio()` no hook — não passa nem perto do lint. Se tiver de ir a JSX, `<track kind="captions" />` limpa. **Nunca desligar a regra no `biome.json`** |
| `<canvas onClick>` dispara `lint/a11y/useKeyWithClickEvents` (o clique-para-fixar-portadora cai aqui) | `biome-ignore` **com justificativa de uma linha em pt-BR**, no estilo da casa (o `combobox.tsx` tem seis) |
| Não existem primitivas de mídia: nenhum slider, select, tooltip ou Radix em `src/components/ui/` | `<input type="range">` cru estilizado com `accent-[var(--brand)]` (precedente dos checkboxes do triangulate-panel). Cor de dado dentro de canvas em objeto nomeado (`const RAMPAS = {...}`), precedente do `CORES` |
| Mobile 375 px é regra dura | Espectrograma, transporte, seletor de 5 saídas e as faixas L/D empilham; o espectrograma rola dentro do próprio container, sem empurrar nada para fora |

---

## 6. O que **não** vamos fazer

| Item | Razão |
|---|---|
| **SSTV completo** (Robot 36, Martin M1/M2, Scottie 1/2/DX) | 4–5 dias — o mesmo orçamento do núcleo inteiro da aba — e a saída é uma **imagem**, que é o ponto cego declarado da bancada (`QUEBRAR-PROVAS.md` §7.2): não encadeia, não vira `chainValue`, não acorda decoder nenhum. Um app grátis de celular faz em 60 s. Zero provas no acervo. *Fica no Roadmap como ideia a variante de 5%: só o farejador de VIS (~150 linhas, meio dia), que diz "SSTV Martin M1, 114 s, use um app" e converte 20 minutos perdidos em 30 segundos.* |
| **Esteganografia LSB em WAV** | Estruturalmente impossível em **97 de 97** arquivos do acervo (0 WAV, 0 FLAC). E o detector é um motor de mentira: com a wordlist real do repo, áudio limpo produz **118** falsos positivos com corrida ≥8, 23 com ≥10, 6 com ≥12, 0 só com ≥16 — limiar tão apertado que só pega o embedding mais ingênuo possível. Steghide e DeepSound cifram por padrão. Ainda: reamostrar 44100→48000→44100 deixa o LSB correto em **51,1%** (cara ou coroa) |
| **Varredura completa de metadados / contêiner** | 68/97 arquivos têm ID3 e o conteúdo é 100% resíduo de ffmpeg; texto humano em metadado: **2 frames em 1 arquivo**; pista plantada de propósito: **0 de 97**. Fica só o cartão de identidade da Fase 1, que é dependência da taxa de amostragem |
| **Bell 202/AX.25/APRS, RTTY completo, PSK31, Selcall como protocolo** (NRZI, bit stuffing, flag 0x7E, CRC-16-CCITT) | ~250 linhas de engenharia de rádio com zero prova conhecida. Nenhuma comissão de gincana gera um quadro AX.25. Fica só a **tabela de rótulos** (~40 linhas) |
| **WSOLA / phase vocoder caseiro** | Minha OLA caseira levou **203 ms** para 60 s a 0,5× na thread principal e soaria pior que a do Chrome, que custa **0 ms** porque roda no pipeline de mídia. É pagar para piorar |
| **Pitch-shift independente da duração** | Não há caso de gincana, e não existe na Web Audio: `detune = -1200` dá o **mesmo** 498 Hz que `playbackRate = 0.5` — é a mesma reamostragem em outra unidade |
| **Detector automático de "mensagem escondida no canal lateral"** | Testado e falhou: zero blocos acesos com Morse a −40 dBFS sob música. O que sobrevive é a seletividade em frequência (o bin de 1200 Hz saltou 23 dB) — ou seja, o espectrograma, não um medidor |
| **AnalyserNode dentro de `OfflineAudioContext` via `suspend()`** | Funciona no Chrome (medi), mas o `suspend()` só para em múltiplos de 128 amostras (você não controla o hop), a leitura em t=0 volta −Infinity, seriam milhares de promises para um arquivo de minutos, e o Firefox nunca implementou. **Não reinvestigar** |
| **WebCodecs `AudioDecoder` / demux próprio de MP4/Ogg/WebM** | Existe em Worker, mas exige demuxar por conta própria — projeto inteiro, e no Safari só a partir da versão 26 |
| **FFT em WASM (kissfft-js, pffft.wasm)** | .wasm + glue do Emscripten, carregamento assíncrono, atrito com o pipeline de assets, e ganho invisível sobre um espectrograma que já roda abaixo de 1 s |
| **Mandar áudio para o backend** | `apiFetch` existe só para consultas externas com chave/rate-limit. A análise é 100% local, e isso vai escrito na Ajuda |
| **Análise espectral de infrassom** | A N=4096/48 kHz a faixa 0–20 Hz cabe em **1 bin**; resolver 1 Hz exigiria N=65536 (janela de 1365 ms), e a 10 Hz um ponto de Morse de 60 ms não completa um ciclo. Ficam duas leituras baratas no domínio do tempo, sem promessa de mensagem |
| **Micro-otimizar a conversão para dB** | A FFT é **82%** do custo e o log10 apenas 13%; `Math.log2 × constante` deu 1,06× e o truque de expoente por bits deu **0,97×** (ficou mais lento) |
| **"Analisar ao contrário"** como se fosse análise | Provado: o espectrograma de magnitude do invertido é o espelho **exato** (erro 2,281e−7). Rotular "ver espelhado" |

---

## 7. Testes

**Restrição de base, verificada rodando o vitest deste projeto:** no jsdom, `AudioContext`, `OfflineAudioContext`, `webkitAudioContext`, `AudioBuffer`, `MediaRecorder`, `navigator.mediaDevices` e `URL.createObjectURL` são **todos `undefined`**, e `canvas.getContext("2d")` **lança** "Not implemented". `Blob`, `FileReader` e `DataView` existem. Portanto: **toda a lógica é pura sobre `Float32Array`/`Uint8Array`, em módulos sem DOM, com teste colocado ao lado** — exatamente como `matrix/render.ts` gera RGBA sem canvas e devolve `null` em vez de lançar. Nenhum arquivo binário entra no repo: as fixtures são **geradas em código** (`Math.sin`, ruído gaussiano com semente fixa), que é como se prova SNR de limiar sem carregar um .wav.

| Módulo | Fixture sintética | Asserção |
|---|---|---|
| `dtmf.ts` | seno 697 Hz + seno 1209 Hz, 100 ms, a 48 kHz | detector devolve **`"1"`**, com pureza ≈ 0,99 e dominância ≈ 20 dB |
| `dtmf.ts` | os 16 símbolos a 100/60 ms | as 16 teclas saem certas, incluindo A/B/C/D e `*`/`#` |
| `dtmf.ts` (regressão de timing) | `5551234` a 40/40 e a 40/25 | 40/40 → `"5551234"`; 40/25 → `"551234"` **e** a menor pausa reportada dispara o aviso |
| `dtmf.ts` (falso positivo) | ruído branco · tom único · voz sintética (F0=137) · acorde F5+F#6 com 6 harmônicos | todos rejeitados; pureza medida 0,0004 (ruído) e 0,016 (voz); o acorde cai no teste do 2º harmônico (0,325 e 0,235) |
| `dtmf.ts` (falso positivo irredutível) | duas senoides **puras** F5+F#6 | sai `"3"` — o teste **fixa esse comportamento conhecido** e afirma que a confiança fica ≤ 0,30 |
| `goertzel.ts` | tom em `f` com `k` não-inteiro (697 Hz, k=17,425) | erro relativo contra DFT ingênua < 1e-10 (medido: 4,4e-13). E `k = Math.round(N*f/sr)`, com caso a 3000 Hz que falhava com o arredondamento duplo |
| `morse-audio.ts` | `SOS` sintetizado a 700 Hz, 20 WPM | texto = `"SOS"`, razão dah/dit em 2,78–3,00, conf ≈ 0,38 |
| `morse-audio.ts` (Farnsworth) | 18/8 WPM | CER 0% e palavras separadas corretamente (a versão sem os dois passos dava CER 68,8% com conf 0,93) |
| `morse-audio.ts` (falso positivo) | os 8 não-Morse: ruído, tom contínuo, arpejo, DTMF, alarme 2 Hz, batida 120 bpm, fala sintética ×2 | todos ≤ 0,022 |
| `morse-audio.ts` (deriva) | mesma mensagem com deriva de 0/30/60/100/150% | o **resíduo global** cresce monotonicamente (0,018 → 0,174); o teste falha se alguém trocar o juiz pelo modelo local |
| `morse-audio.ts` (antifase) | Morse somado em antifase nos dois canais | conf 0,00 no mixdown mono e **1,00 em L−D** — amarra a separação de canais ao detector |
| `canais.ts` | estéreo de canais idênticos bit a bit | `maxDiff === 0` exato, `r = 1,000`, side/mid = −338 dB → veredicto "estéreo falso" |
| `canais.ts` | `R = −L` | `r = −1,000` exato → "oposição de fase", **só após** a varredura de lag confirmar o pico em lag 0 |
| `canais.ts` (Haas) | `D = L` atrasado 1 ms, tom puro | `r = −0,93` no lag 0 → o veredicto de antifase **não** é emitido; resultado "ambíguo" |
| `canais.ts` (limiar) | mono + ruído de codec a −85 dBFS · segredo real a −54 dBFS | side/mid = −84,0 dB (artefato) vs −55,3 dB (real); o corte de −60 dB separa |
| `stft.ts` | seno de amplitude 1,0 na frequência central de um bin | pico em **0 dBFS** no bin certo (normalização coerente `2/Σw`), e nenhum bin acima de `N/2` é lido |
| `stft.ts` | ruído nulo, faixa alta | com persistência de 4 quadros aparecem ~300 bins falsos; com **8** (2·N/hop), zero — o teste trava a regra em número de janelas |
| `wav.ts` | buffer conhecido | os 44 bytes do cabeçalho RIFF batem campo a campo; round-trip int16 é exato em 65536/65536 valores; clipping em ±1,0 não estoura |
| `container.ts` | WAV montado em memória com chunk `LIST/ICMT`, apêndice depois do fim declarado e um `GRUD` fantasma | taxa real lida do offset 24; o parser **para no tamanho declarado** e não inventa chunk de 760 MB; a sobra é recuperada como texto |
| `render.ts` | matriz Uint8 conhecida | `toRgba` devolve o RGBA esperado sem canvas e **`null` em vez de lançar** quando não há canvas; a guarda de área recusa acima de 16.000.000 px |
| `reverse.ts` | rampa 0→1 | invertida por canal, sem mutar o original (prova que o `.slice()` está lá) |

**Teste de componente.** Um único `components/audio-panel.test.tsx`, no molde declarado do repo (`matrix/components/matrix-panel.test.tsx` — hoje o único `.test.tsx` entre 87 arquivos de teste): o painel montado de verdade, com o motor real, recebendo um `AudioBuffer` **stub injetado** (o jsdom não tem `AudioBuffer`), asserindo os dois casos que justificam a aba existir — o card de DTMF aparece com os três formatos, e o botão "Decodificador" chama o handoff com o texto e o `via`.

**Não é testável automaticamente aqui, e fica registrado como tal:** nada foi verificado em Safari, Firefox ou celular; a robustez do Morse foi medida só contra áudio **sintético** (com ruído, jitter, deriva, QSB, key-click e degradação tipo codec) — nenhum arquivo real de morse, nenhuma gravação de celular apontado para caixa de som; os tempos são de desktop e um celular médio é 3–5× mais lento (os 932 ms viram 3–5 s lá). A verificação de UI a **~375 px e em desktop, tema claro e escuro**, é manual e obrigatória em toda fase.

**Portão antes de fechar qualquer fase** (Node via nvm — exportar o PATH antes):
`pnpm format && pnpm typecheck && pnpm lint && pnpm test && pnpm build`

**Cada fase também fecha a documentação, ou não fechou:** entrada nova em `help-content.ts` (seção `ferramentas`, com `example` verídico **medido**, via skill `update-help`) · `HELP_INTRO` corrigido (hoje diz "você cola UMA entrada") · a seção `apis` dizendo que o áudio **não sai do navegador** · as fases ainda não entregues entram no `roadmap-content.ts` como `todo` e **saem de lá ao serem entregues** (hoje não há nenhum item de áudio no Roadmap — não há o que remover na Fase 1, há o que **acrescentar**) · e as três linhas que passam a mentir são corrigidas na Fase 1: `docs/QUEBRAR-PROVAS.md:643` e `:155`, `docs/TODO-CIFRAS.md:51`, `docs/PLANO-CIFRAS.md:447`.

---

## 8. Crítica de completude — leia antes de executar

Um agente adversarial revisou o plano acima procurando o que ficou de fora, o que
não foi verificado e o que está superdimensionado. As três respostas contradizem
o plano em pontos concretos, e **a crítica vence** onde houver conflito.

**1. Técnica de fora: pitch → notas musicais.** O repo já tem o decoder `music-notes` (`src/features/decoder/engine/decoders/music-notes.ts`), e `docs/QUEBRAR-PROVAS.md:643` diz literalmente que o gargalo dele é *reconhecer a música* — notas só entram já transcritas. A aba Áudio mede frequência refinada na Fase 7 e **nunca fecha esse laço**: falta o mapeamento f → nome de nota (com A4 configurável e enarmonia) alimentando `music-notes` → A1Z26. É a cadeia áudio→decoder existente de maior valor e o plano a ignora.

Também de fora: **Morse percussivo/sem portadora** (batida, assobio, sirene) — o detector é por tom e o plano *treina para rejeitar* "batida 120 bpm"; vira falso negativo por desenho. E **áudio dentro de vídeo**: a única prova de Morse atestada no acervo (ITC 2018 P18 Et.3) é vídeo, mas a entrada da aba é descrita como arquivo de áudio, sem dizer que aceita `.mp4/.mov`.

**2. Afirmação não verificada: a taxa real do arquivo.** O `container.ts` especificado parseia **WAV e frame header de MP3**, e a medição ("78/78 em 32 ms, 0 falhas") é só de MP3. O próprio acervo do plano é 78 mp3 + **18 aac + 1 m4a** — 19 arquivos (20%) sem parser: ADTS tem índice de taxa próprio e M4A exige ler `mvhd`/`esds` dentro de átomos MP4. Como toda a guarda "nenhuma afirmação sobre a faixa alta sem exibir a taxa" depende desse número, em 1 de 5 arquivos o cartão ou mente ou fica vazio. Secundária: `OfflineAudioContext` a 96 kHz é assumido portátil — Safari historicamente restringe/rejeita taxas arbitrárias, e isso não foi testado.

**3. Superdimensionado: o cartão de identidade + Fase 7.** O plano mede que metadado planta pista em **0 de 97** arquivos e que os 119 hits de contêiner grudado validam **0** — e mesmo assim mantém ID3, chunks RIFF, sobra e varredura de assinatura (~3 h + superfície de ruído). Deve encolher para só a leitura da taxa/canais. A Fase 7 (2 dias, valor "médio", zero prova conhecida, e a tabela Bell/RTTY/ZVEI que nunca decodifica) é o item a cortar antes de qualquer outro — os três veredictos de canal com varredura de lag ±20 ms também: o entregável útil é o canal E−D desenhado.

---

## 9. Vereditos por técnica (a matéria-prima do plano)

| técnica | viabilidade | valor | esforço | recomendação |
|---|---|---|---|---|
| Separação de canais estéreo (L/R, mid/side, diferença) | trivial | alto | Meio dia (4–6 h) COMO CARONA da aba Áudio — sozinha esta téc | **fazer-agora** |
| DTMF (teclado de telefone) | viavel | medio | 1 a 1,5 dia — MAS só se a aba Áudio já existir. `dtmf.ts` (~ | **fazer-agora** |
| Código Morse por tom (áudio → ponto/traço → texto), com portadora detectada por contraste, envoltória por Goertzel, limiar por Otsu e unidade dit/dah por k-means em log-duração | viavel | medio | 1 dia para a técnica em si (o protótipo validado tem 149 lin | **fazer-depois** |
| Espectrograma (tempo × frequência) como instrumento de leitura: STFT própria sobre Float32Array, em Worker, com janela/faixa/escala/contraste ajustáveis, três vistas de canal (E, D, E−D), branqueamento por mediana e exportação em PNG | viavel | alto | 3 a 4 dias. Repartido: `stft.ts` (FFT + Hann + dB + quantiza | **fazer-agora** |
| SSTV | viavel | baixo | **4–5 dias** para quem já sabe DSP, e essa estimativa não te | **nao-fazer** |
| Áudio ao contrário (backmasking) + velocidade com e sem mudança de tom | trivial | medio | ~1 dia, e SÓ em cima da aba Áudio (decodificação + AudioBuff | **fazer-agora** |
| Ultrassom e infrassom: diagnóstico honesto da faixa (energia por banda + ponto de corte do codec) e deslocamento heterodino da faixa alta para a audível | viavel | medio | Sozinha não existe: a aba Áudio (decodificação + STFT + espe | **fazer-depois** |
| Esteganografia em bits do WAV (LSB) e leitura de metadados/bytes crus (ID3, chunks RIFF) | trivial | baixo | **LSB completo (grade + UI + testes + Ajuda): ~2 dias.** E é | **nao-fazer** |
| Sequências de tons e modulação digital por tons (binário por 2 tons, 2-FSK genérico, Bell 202/RTTY/Selcall só como rótulo) | viavel | medio | 2 dias para a parte que vale (trilha de tons + binário por 2 | **fazer-depois** |

### Separação de canais estéreo (L/R, mid/side, diferença) — derivação pura sobre Float32Array, com reprodução por canal, exportação WAV e três veredictos calibrados

**Resolve:** Quatro provas concretas, todas do feitio do acervo (ITC/GIA), e uma delas hoje é INVISÍVEL na bancada:

1. **Mensagem em antifase (o caso que só isto resolve).** O truque clássico: L = música + segredo, R = música − segredo. No mix mono o segredo cancela por completo; tocar o arquivo normalmente não revela nada, e o espectrograma do mix também não. Só (L−R)/2 revela. MEDIDO no cenário sintético: com o segredo a −34 dBFS a razão side/mid é −35,3 dB — presente e limpo no canal de diferença, ausente no centro.

2. **R = −L inteiro (o arquivo "vazio").** A equipe abre, o mix mono é SILÊNCIO ABSOLUTO, conclui "arquivo corrompido" e larga a prova. MEDIDO: r = −1,000 exato. Detectar e dizer "os canais estão em oposição de fase — o mix cancela, ouça a Diferença" é literalmente a diferença entre resolver e desistir.

3. **Uma mensagem por canal.** Música no esquerdo, Morse (ou DTMF, ou fala) no direito. Tocar/ver separado tira o mascaramento; o Morse fraco sob música alta some no mix e aparece sozinho no canal. Isto também é o que faz o resto da aba Áudio funcionar: o detector de DTMF e o de Morse rodam sobre UM canal escolhido, não sobre o mix — alimentar o detector com o mix é jogar fora metade da relação sinal/ruído.

4. **Matar a prova falsa em 2 segundos.** Arquivo estéreo com os dois canais bit a bit iguais (saída típica de conversor). MEDIDO: maxDiff = 0 exato, side/mid = −338 dB. Dizer "estéreo falso, não há informação separada aqui" é uma afirmação PROVÁVEL, não um palpite, e economiza os vinte minutos que a equipe gastaria caçando o que não existe — o mesmo serviço que o `diagnosticar` do qr.ts presta hoje.

Fecha ainda a exportação: cada canal derivado vira um WAV baixável, para levar ao Audacity/Sonic Visualiser quando a bancada não bastar.

**Algoritmo:** Tudo abaixo é PURO sobre Float32Array, em `src/features/audio/canais.ts` com `canais.test.ts` colocado. Números MEDIDOS por mim em Node/V8 (mesmo motor do Chromium), 60 s estéreo @48 kHz = 2,88 M amostras por canal.

**Passo 0 — pré-condição.** `buf.numberOfChannels`: 1 → "mono, não há o que separar", nenhum controle desenhado. 2 → todo o resto. >2 (5.1) → listar "canal 1..N" individualmente e NÃO assumir 0=L/1=R; mid/side só para exatamente 2.

**Passo 1 — derivar (um laço, O(n)).**
`L = buf.getChannelData(0).slice()`, `R = buf.getChannelData(1).slice()` — o `.slice()` é OBRIGATÓRIO: transferir o buffer original para o Worker mata o AudioBuffer em silêncio.
`mid[i] = (L[i] + R[i]) * 0.5`
`side[i] = (L[i] - R[i]) * 0.5`
O fator **0.5 não é estético**: com L,R ∈ [−1,1] ele torna o clipping IMPOSSÍVEL e mantém a identidade exata L = mid+side / R = mid−side (reversível). `(L−R)` cru chega a 2,0 e satura na exportação 16-bit.
Seletor de 5 saídas: Esquerdo · Direito · Centro (L+R)/2 · Diferença (L−R)/2 · Diferença normalizada.
MEDIDO: **3,8 ms** para os 60 s.

**Passo 2 — métricas globais, um laço só. MEDIDO: 4,1 ms.**
Acumular `sll=ΣL²`, `srr=ΣR²`, `slr=ΣL·R`, `sm=Σmid²`, `ss=Σside²`, `maxDiff=max|L−R|`. Derivar:
- correlação `r = slr / sqrt(sll·srr)` → −1..+1 (medidor de correlação clássico de estúdio)
- `razaoSideMidDb = 10·log10(ss/sm)`
- `maxDiff` exato

**Passo 3 — os TRÊS veredictos que é honesto emitir, e SÓ eles.** Todos são afirmações negativas ou estruturais, prováveis:
(a) `maxDiff === 0` exatamente → "estéreo falso: canais idênticos bit a bit". MEDIDO: r=1,000, side/mid=−338 dB.
(b) `razaoSideMidDb < −60` com maxDiff > 0 → "os canais diferem só no piso de ruído (provável artefato de MP3/AAC)". Limiar CALIBRADO por medição: mono + ruído de codec a −85 dBFS deu −84,0 dB; segredo real a −54 dBFS deu −55,3 dB. −60 dB separa os dois com folga. Abaixo disso a energia não distingue — e a UI tem de dizer isso.
(c) `r < −0,9` **E** o pico da correlação cruzada no lag 0 → "oposição de fase: o mix mono cancela". MEDIDO: R=−L dá r=−1,000 exato.

**Passo 4 — a varredura de lag, obrigatória antes de emitir (c).** Correlação cruzada por força bruta em ±20 ms (±960 amostras @48 kHz) sobre um recorte de 1 s do trecho mais alto. MEDIDO: **120 ms** (vai no Worker ou roda sob demanda por botão).
MEDIDO em ruído de banda larga: atraso de 1 ms → melhor lag 48 (=1,00 ms) com r=+1,000; atraso de 10 ms → lag 480 (=10,00 ms) com r=+1,000. Perfeito.
**ARMADILHA MEDIDA:** com TOM PURO, um atraso de 1 ms dá **r = −0,93 no lag 0** — lê-se como inversão de polaridade e NÃO é; e o melhor lag sai em −600 amostras com r=+1, porque senoide é periódica e o lag é ambíguo. Regra: se o pico se repetir em vários lags (material quase-tonal), reportar "ambíguo", nunca escolher. Quando o lag ≠ 0 vence limpo, o achado é outro e é bom: "os canais são o mesmo sinal com 10,00 ms de atraso" — o próprio atraso pode ser o dado da prova.

**Passo 5 — ganho de exibição. É isto que decide se a técnica funciona na prática.** O canal Diferença costuma vir 20–40 dB abaixo de L/R; sem ganho o espectrograma sai preto e a equipe conclui "não tem nada" (falso negativo silencioso, o pior modo de falha aqui). Normalizar por pico para −1 dBFS antes de desenhar E antes de exportar, com o fator na tela em font-mono ("×32,4 · +30,2 dB"). Normalizar calado é mentir sobre a amplitude.

**Passo 6 — tocar um canal só.** `ctx.createBuffer(1, length, sampleRate)` + `copyToChannel(derivado, 0)`. O MESMO Float32Array derivado alimenta reprodução, espectrograma e exportação — doutrina do `render.ts` ("o PNG que a pessoa baixa é byte a byte o que o decodificador viu"). NÃO usar ChannelSplitterNode: cria um segundo caminho que pode divergir do que a tela mostra.

**Passo 7 — exportar WAV** (nenhum navegador grava WAV pelo MediaRecorder). Cabeçalho RIFF canônico de 44 bytes: `"RIFF"` · uint32 `36+dataSize` · `"WAVE"` · `"fmt "` · uint32 16 · uint16 1 (PCM) · uint16 canais · uint32 sampleRate · uint32 `sampleRate·canais·2` · uint16 `canais·2` · uint16 16 · `"data"` · uint32 dataSize; amostras int16 LE com clamp: `x<0 ? x*0x8000 : x*0x7fff`. MEDIDO: **20,2 ms** para 60 s mono (5,49 MB). A função devolve `Uint8Array` (pura e testável) e a casca do download fica separada — MEDIDO no jsdom deste projeto: `DataView` e `Blob` existem, `URL.createObjectURL` e `AudioBuffer` são `undefined`. É exatamente a divisão `toRgba`/`baixarPng` que já existe.

**O que NÃO implementar: detector automático de "mensagem escondida no canal lateral".** Tentei e ele não funciona — detalhe no primeiro risco.

**Riscos:** FALSO POSITIVO CAPITAL, e eu o MEDI: música estéreo comum tem canal lateral MAIS FORTE que uma mensagem escondida de verdade. Medição — estéreo musical normal: side/mid = −10,3 dB; segredo real em antifase a −34 dBFS: side/mid = −35,3 dB. A regra intuitiva 'energia lateral alta ⇒ mensagem escondida' está exatamente INVERTIDA. Consequência dura: NUNCA emitir veredicto de 'há mensagem escondida' a partir dessas métricas. O painel reporta a MEDIÇÃO ('os canais diferem; energia lateral −18,2 dB em relação ao centro; correlação 0,62') e entrega o canal derivado para o olho humano ver no espectrograma. Nesta bancada, cujo princípio é que 'o score parou de mentir', um alarme desses seria o pecado capital.; O DETECTOR POR ENERGIA NÃO FUNCIONA — testei e ele falhou. Plantei uma rajada de 3 s de Morse em antifase a −40 dBFS dentro de 60 s de música estéreo e rodei um detector de janela (50 ms, hop 25 ms, limiar mediana+12 dB): ZERO blocos acesos. Motivo, isolado variando a largura estéreo da música: com largura 0 o salto de RMS lateral é 257 dB (grita), com 0,05 cai para 0,2 dB, e com 0,12 e 0,30 é 0,0 dB — a largura estéreo natural afoga o segredo. O que SOBREVIVE é a seletividade em frequência: no mesmo cenário o bin de 1200 Hz saltou 23 dB (largura 0,12) e 14,2 dB (largura 0,30). Conclusão de projeto: o entregável desta técnica é o CANAL DERIVADO ALIMENTANDO A STFT, não um detector. Quem tentar acrescentar o medidor de rajada depois vai construir um gerador de falso negativo silencioso.; ARMADILHA DE HAAS, MEDIDA: 'R = L atrasado 1 ms' produz r = −0,93 no lag 0 com tom puro — indistinguível de inversão de polaridade se você só olhar o lag 0, e o veredicto (c) sairia errado. Só a varredura de lag desfaz, e em material quase-tonal ela também é ambígua (melhor lag saiu em −600 amostras com r=+1 porque senoide é periódica). Mitigação obrigatória: nunca emitir 'oposição de fase' sem confirmar o pico em lag 0, e reportar 'ambíguo' quando o pico se repete.; PISO DE RUÍDO DE CODEC: MP3/AAC em joint stereo FABRICAM conteúdo lateral que não estava no original, e Opus/AAC destroem relações finas de fase. MEDIDO: mono + ruído de codec dá side/mid = −84 dB; segredo real a −54 dBFS dá −55,3 dB. O limiar de −60 dB separa esses dois, mas um segredo abaixo de ~−70 dB é INDISTINGUÍVEL de artefato de codec por energia. A UI tem de dizer 'abaixo deste nível não dá para separar mensagem de ruído de compressão' em vez de fingir certeza — e avisar quando a origem é formato com perda.; FALSO NEGATIVO POR ESCALA: o canal Diferença sai 20–40 dB abaixo de L/R. Sem normalização automática, o espectrograma dele é uma faixa preta e a equipe conclui 'não tem nada aqui' — que é o modo de falha mais provável desta técnica e o mais caro, porque parece que funcionou. O ganho tem de ser automático E declarado na tela (fator em font-mono); normalizar em silêncio troca um erro por outro, mentindo sobre a amplitude.; DETACH SILENCIOSO (herdado do mapeamento, e fatal aqui porque esta técnica é justamente quem toca nos canais): transferir `getChannelData(n).buffer` para o Worker é ACEITO e MATA o AudioBuffer (length vira 0, sem erro). Como o painel deriva L, R, mid e side do mesmo AudioBuffer, um único transfer descuidado zera todas as saídas seguintes. Defesa por convenção de código: `.slice()` antes de qualquer postMessage — custo medido de 0,3 ms, ou seja, zero.; ARQUIVOS COM MAIS DE 2 CANAIS (5.1): `numberOfChannels` pode ser 6 e o par 0/1 nem sempre é L/R. Assumir L/R cegamente produz um canal 'Diferença' sem sentido físico que ainda assim desenha algo plausível — outro falso positivo. Tratar: >2 canais expõe canal 1..N individualmente, e mid/side só aparece quando são exatamente 2.; RISCO DE ESCOPO: a varredura de lag (passo 4) é a única parte cara (120 ms/s de áudio) e a mais fácil de errar. Se o prazo apertar, corte-a e emita apenas os veredictos (a) e (b), que são provas puras e custam 4,1 ms — e então NÃO emita (c), porque sem a varredura ele mente no caso de Haas. Cortar (c) inteiro é preferível a emiti-lo sem confirmação de lag.

### DTMF (teclado de telefone) — detecção por Goertzel nas 8 frequências, com portão de 5 testes por quadro e agrupamento temporal em dígitos, rodando sobre L, R e L−R separadamente

**Resolve:** Sejamos honestos primeiro: **procurei e NÃO existe uma única prova de DTMF atestada no acervo**. O `docs/QUEBRAR-PROVAS.md` cobre 41 provas da GIA + ITC 2017/18/19/22/23 e não há nada. O que existe é adjacente, e é isto:

- **Áudio JÁ é canal de prova.** `QUEBRAR-PROVAS.md:155` registra que o filtro histórico do Morse é o **canal** (luz, som, vídeo), não o decode — A13, última em 2022. E `:746` traz Berith nomeado em morse num vídeo pré-Challenge (ITC 2018 P18 Et.3, 2/4).
- **Telefone JÁ é terminal de cadeia**, com seção própria (§4.4) e dois decoders calibrados (`ddd`, `ddd-cidade`): GIA-09 → 3339-4080, GIA-19 → 3142-1113, GIA-40 → 47-3221-5144.
- **GIA-09 é o caso mais próximo e NÃO é DTMF** — quero ser exato porque é tentador mentir aqui: o áudio dela planta a palavra *"ligada/ligação"* (`:251`), e o número vem da cadeia dos Oscar. O áudio era portador de DICA, não de tons. E `:828` diz que esse áudio nem veio no acervo.

**O argumento real, e ele não depende de atestação:** DTMF é a única carga de áudio que um humano **não consegue** decodificar de ouvido. Morse, um ouvido treinado tira. Música, o Shazam tira (e o §7.1 já diz que reconhecer a música é o gargalo, não a bancada). Voz, transcreve-se. Mas ninguém escuta um par de tons e diz "isso é o 7 e não o 4" — são 16 células numa grade de 2×4 frequências separadas por 10,5%. Se uma organização plantar DTMF (custa a ela 30 segundos no Audacity), a equipe sem ferramenta tira **zero**, e nem entende por quê.

Ou seja: isto não é uma aposta em frequência histórica, é **seguro contra um truque barato para quem monta a prova e intransponível para quem não tem a ferramenta**. A ferramenta antiga do equipearromba tinha — alguém do time já concluiu isso uma vez.

Concretamente destrava: áudio → `5551234` → e daí a bancada assume, que é o ponto todo. Medido por outro agente rodando o registry real: em formato agrupado `44 33 555 555 666` o `t9-multitap` entrega "hello" a 0,60; em formato espaçado acorda `a1z26`, `periodic-table` e `math-helper`; 8 dígitos caem em `documento`/telefone e alimentam `ddd-cidade`.

**Algoritmo:** Prototipei e MEDI tudo isto em Node/V8 (sondas em `/private/tmp/claude-501/-Users-peter-Repos-the-decrypter/4c0f2f88-ae14-4c90-a8ce-66a65c9d7c22/scratchpad/dtmf/probe{,2,3}.mjs`, re-executáveis). Os números abaixo não são folclore de application note — são de execução.

**0) Grade e taxa.** Baixo `[697, 770, 852, 941]`, alto `[1209, 1336, 1477, 1633]`, grade 4×4 → `1 2 3 A / 4 5 6 B / 7 8 9 C / * 0 # D`. **Não reamostre para 8 kHz e esqueça o N=205.** Aquele folclore existe para fazer `k = f·N/fs` cair perto de inteiro; medi que é desnecessário: com `w = 2π·f/fs` (e não `2π·k/N`) o Goertzel é um ressoador exatamente em `f`, e o erro relativo contra a DFT ingênua com k não-inteiro (k=17,425 para 697 Hz) foi **4,4e-13**. Roda na taxa nativa, sem filtro, sem decimação, sem risco de aliasing.

**1) Janela.** `N = round(0,025·fs)` = 1200 @ 48 kHz. `hop = round(0,010·fs)` = 480. Retangular (nada de Hann — a seletividade do sinc é o portão de tolerância, ver 3b).

**2) Por quadro, 8 Goertzels + energia:**
```
w=2πf/fs; c=2cos w; s1=s2=0
para n<N: s = x[off+n] + c·s1 − s2; s2=s1; s1=s
P(f) = s1² + s2² − c·s1·s2          // = |X(f)|²
E    = Σ x[n]²
```

**3) Portão de 5 testes (todos têm de passar):**

- **3a. Silêncio:** `sqrt(E/N) < 1e-4` (≈ −80 dBFS) → descarta o quadro.
- **3b. Pureza** — `pureza = 2·(P_L + P_H)/(N·E)`, que vale **exatamente 1,0** para um par DTMF perfeito (medido 0,9974) e é **invariante ao twist** (medido 1,0025 com −20 dB). **Limiar 0,55.** Calibração medida, janela de 25 ms, contra desvio de frequência:

  | desvio | 0% | 1,0% | **1,5%** | 2,5% | **3,5%** | 5% |
  |---|---|---|---|---|---|---|
  | pureza | 0,993 | 0,767 | **0,563** | 0,272 | **0,146** | 0,016 |

  O limiar 0,55 encosta exatamente no que a ITU-T Q.24 obriga: **aceitar** até 1,5% de distorção (0,563 ✓) e **rejeitar** acima de 3,5% (0,146 ✗). Este único número substitui todo o "limiar em dB" que se costuma chutar. Ruído branco dá 0,0004; voz sintética dá 0,016.
- **3c. Dominância no grupo:** `10·log10(pico/2º pico) ≥ 10 dB` em cada grupo. Medido: par puro dá 20,3 e 20,5 dB; voz (F0=137) dá 3,5 e 0,3 dB.
- **3d. Twist:** `|10·log10(P_H/P_L)| ≤ 8 dB`. (Bellcore é −8/+4 dBm; simetrizo em 8 porque a fonte aqui não é telefonia — tom gerado no Audacity tem twist 0.)
- **3e. Segundo harmônico — ESTE é o que salva de música, e NÃO é opcional:** `P(2·f_L)/P(f_L) < 0,10` e `P(2·f_H)/P(f_H) < 0,10`. Só calcule nos quadros que passaram de 3b–3d (o custo fica de graça). Medido num acorde F5+F#6 com 6 harmônicos: razões **0,325 e 0,235** → rejeitado. Sem este teste ele passaria, porque a pureza dele é 0,657 (acima do limiar).

**4) Agrupamento temporal.** Dígito só é emitido com o **mesmo** par por ≥ **4 quadros consecutivos** (= 40 ms, o mínimo da Q.24, que também manda rejeitar < 23 ms); fecha após ≥ **3 quadros** falhando (30 ms). Medido no pipeline completo com alvo `5551234`:

  | tom/pausa | 200/100 | 100/50 | 70/50 | 50/50 | **40/40** | 40/25 | 30/30 |
  |---|---|---|---|---|---|---|---|
  | saída | ✓ | ✓ | ✓ | ✓ | **✓** | `551234` | vazio |

  Os 16 símbolos (incl. A/B/C/D e `*`/`#`) saem certos com 100/60. Ruído branco somado: sobreviveu até ~6–8 dB de SNR sem perder um dígito.

**5) Canais (o pedido explícito do usuário sai de graça aqui).** Rode o pipeline em **L**, em **R**, e — só quando `max|L−R| > 1e-4` (o teste de "estéreo falso") — também em **L−R** e **L+R**. O truque clássico de esconder é somar em antifase; aí os dígitos só existem em L−R. Custo: ver abaixo.

**6) Confiança (o que alimenta a `ConfidenceBar`, primitiva que já existe):**
```
c_dígito = clamp01((pureza−0,55)/0,40) · clamp01(dom/20) · clamp01(1−|twist|/8) · clamp01(dur/80ms)
c_seq    = média(c_dígito) · regularidade · fator_contagem
   regularidade  = 1 − cv(durações dos tons), limitado a [0,1]
   fator_contagem = 1 díg 0,30 · 2–3 0,50 · 4–7 0,85 · 8–11 1,00 · 12+ 0,85
```
Um dígito solto nunca passa de 0,30 e **não deve ser mostrado como leitura** — vira "houve um par isolado em 12,4 s", que é diagnóstico, não resposta.

**7) Saída.** Três formatos, porque medi (outro agente, no registry real) que o formato decide o que acorda na bancada: **colado** `5551234` (9 candidatos), **espaçado** `5 5 5 1 2 3 4` (15 candidatos: a1z26, tabela periódica, aritmética) e **agrupado por repetição** `44 33 555 555 666` (único que dispara `t9-multitap`). Chips no molde do `SaidaTexto` da Matriz, `font-mono`, `CopyButton`, e "usar no Decodificador" via o `onDecodificador`/`entradaInicial` que já existe. Publique também a **tabela de tempos** (duração de cada tom e de cada pausa): uma pausa de 300 ms no meio de pausas de 60 ms é o hífen do telefone — `3339-4080` aparece sozinho.

**8) Quando não achar nada, diga por quê** (precedente `qr.ts`, que troca o `null` mudo do jsQR por diagnóstico): "o arquivo inteiro está abaixo de −60 dBFS", "houve 34 quadros com par candidato mas nenhum durou 40 ms", "o pico do grupo grave ficou 2 dB acima do segundo — isso é voz, não tom".

**Riscos:** FALSO POSITIVO IRREDUTÍVEL, MEDIDO — duas senoides PURAS em F5 (698,46 Hz) e F#6 (1479,98 Hz) passam nos 5 testes e saem como dígito "3". Desvio de apenas 0,21% e 0,20% das frequências DTMF, dentro do que a Q.24 OBRIGA a aceitar. Não tem conserto no detector: um par de senoides puras naquelas frequências É um DTMF por qualquer definição. Mitigação real é de UI — um dígito solto tem confiança ≤ 0,30 e não pode ser exibido como leitura. Notícia boa: com timbre de instrumento (6 harmônicos) o mesmo par é rejeitado pelo teste do 2º harmônico, e voz, ruído branco e tom único também foram rejeitados no pipeline completo.; ZERO PROVAS ATESTADAS. Varri QUEBRAR-PROVAS.md, TODO-CIFRAS.md e PLANO-CIFRAS.md: não há uma única prova de DTMF em 41 GIA + 5 edições ITC. A doutrina do próprio repo mata itens assim (#17 e #19 do PLANO-CIFRAS). A defesa é que aquele critério é de CUSTO — "dataset sem prova não entra" — e DTMF não é dataset: são 250 linhas, 0 KB de dependência, 0 rede. E, ao contrário do #19 (gov-recognizer), DTMF TEM assinatura: dois tons puros de uma grade de 16, e as sondas mostram que a assinatura discrimina.; DÍGITO REPETIDO COLA quando a pausa entre tons cai abaixo de ~30 ms. Medido: `5551234` com pausa de 25 ms sai `551234`; com 10 ms sai `51234`. É a falha mais perigosa porque a saída parece plausível — um telefone com um dígito a menos. A UI TEM de reportar a menor pausa observada e avisar quando ela chega perto do limiar; nunca entregar a string calada.; ÁUDIO ACELERADO/DESACELERADO mata a detecção em silêncio — é truque clássico de gincana e desloca as 8 frequências de uma vez. O detector devolve zero dígitos sem explicar. Mínimo aceitável: dizer isso na Ajuda. Ideal barato: varrer fatores de 0,8× a 1,25× nas frequências-alvo e reportar "há par coerente se o áudio estiver 12% mais rápido".; GRAVAÇÃO PELO MICROFONE É PIOR QUE ARQUIVO, e o usuário não vai supor isso. O MediaRecorder grava Opus (Chrome) ou AAC (Safari) — com perda, com modelagem psicoacústica — e as constraints de voz do navegador (noiseSuppression trata tom puro como ruído estacionário, autoGainControl mexe na amplitude entre quadros) atacam exatamente o que se quer medir. Passar `echoCancellation/noiseSuppression/autoGainControl: false` e ainda assim dizer na interface que gravação é conveniência, não instrumento.; CARONA, NÃO MOTIVO. Isto não justifica construir a aba Áudio. Se a aba não for adiante, DTMF não vale nada sozinho — e a recomendação vira nao-fazer sem hesitação.; TENTAÇÃO DE ENFIAR NO MOTOR DE DECODERS. `Decoder.decode` é síncrono e puro e roda a cada tecla digitada; áudio é assíncrono e binário. A lógica tem de ser função pura sobre `Float32Array` em `features/audio/dtmf.ts`, sem AudioContext dentro (no jsdom do projeto `AudioContext` é undefined — a sonda inteira rodou em Node puro, que é exatamente a prova de que os testes colados funcionam).

### Código Morse por tom (áudio → ponto/traço → texto), com portadora detectada por contraste, envoltória por Goertzel, limiar por Otsu e unidade dit/dah por k-means em log-duração — mais um escore de confiança calibrado contra erro real.

**Resolve:** Fecha o buraco que a própria documentação do acervo já declara. `docs/QUEBRAR-PROVAS.md:155` diz que no Morse "o filtro histórico é o **canal** (luz, som, vídeo), não o decode" — ou seja, o decoder `morse` de `codecs.ts:183` (que só aceita `.` `-` `/` `|` já transcritos) nunca foi diretamente aplicável à entrada de uma prova: sempre houve um humano transcrevendo antes. Isto elimina esse humano no canal SOM.

Caso concreto no acervo: **ITC 2018 P18 Et.3** — Berith é nomeado em morse num vídeo pré-Challenge e precisa ser DESCARTADO da lista de 5 demônios; a resolução registra **2/4** e diz que a prova exigia ter guardado o vídeo (`QUEBRAR-PROVAS.md:746`). É exatamente "áudio chega, mensagem escondida dentro". Também **GIA-09**, prova de áudio que planta "ligada/ligação" (`:251`), cujo áudio não veio no acervo (`:828`).

E destrava um truque que hoje é invisível na bancada e que MEDI: **Morse somado em antifase nos dois canais**. No mixdown mono a confiança deu **0,00** (a mensagem simplesmente não existe); no canal **L−R** deu **1,00** com leitura exata. Quem abrir esse arquivo em qualquer player mono não ouve nada. Isso amarra a técnica ao pedido explícito do usuário de separar L/R — e mostra que L−R precisa ser um canal de primeira classe, não só L e R.

Saída típica: `"SOCORRO NA PONTE"`, `"CEP 88301 400"` — texto, que é o que a bancada já sabe processar (handoff `onDecodificador` → `entradaInicial`, molde do QR da Matriz).

**Algoritmo:** Protótipo escrito e EXECUTADO em Node 26 (V8 do Chromium): `/private/tmp/claude-501/-Users-peter-Repos-the-decrypter/4c0f2f88-ae14-4c90-a8ce-66a65c9d7c22/scratchpad/morse/` (`lib.mjs` sintetizador, `lib2.mjs` detector — 149 linhas úteis, `run2..run5.mjs` bancadas). Todos os números abaixo são medidos, não estimados.

**0. Entrada.** `Float32Array` por canal a 48 kHz, vindo do `AudioBuffer`. Analisa L, R, L+R e **L−R** separadamente (4 passadas; custo desprezível, ver §5). Nada de rede, nada de canvas — puro, testável em jsdom.

**1. Achar a portadora.** STFT N=1024, hop 10 ms, **teto de 20 s de áudio** (não precisa mais para achar um tom). Para cada bin: contraste em dB entre a média do quartil ALTO e a do quartil BAIXO da série temporal de energia. Rejeita bins cuja fração de quadros acima da média geométrica caia fora de **0,08–0,75** (Morse tem ciclo de trabalho ~30–50%; zumbido constante dá ~1,0 e é descartado). Escolhe o de maior contraste. Medido: acerta 300 Hz, 700 Hz, 1500 Hz e 3000 Hz. **Se a aba Áudio já calcular o espectrograma, esta etapa lê a mesma matriz de magnitudes e custa ZERO** — é o encaixe certo.

**2. Envoltória por Goertzel** na frequência achada, bloco de **5 ms** (240 amostras a 48 kHz → largura de banda ~200 Hz, que é a certa para Morse: a banda ideal é ~1/T e o dit a 20 WPM dura 60 ms). Goertzel e não FFT porque é UMA frequência: 3 multiplicações-acumulações por amostra, O(n), sem tabela de twiddle e sem alocação. **fft.js NÃO é necessário para esta técnica** (só para o espectrograma da aba).
> **BUG QUE ENCONTREI E QUE VOCÊ VAI REPRODUZIR:** a fórmula clássica é `k = (int)(0.5 + N*f/sr)` com TRUNCAMENTO. Escrever `Math.round(0.5 + N*f/sr)` arredonda duas vezes e desloca um bin inteiro (200 Hz). Com portadora em 3000 Hz isso me deu **falha total e silenciosa** (CER 100%, saída vazia) enquanto 700 Hz funcionava. O correto é `k = Math.round(N*freq/sr)`.

**3. Limiar por Otsu** sobre a envoltória **em dB** (`20·log10`), histograma de 128 caixas, maximizando variância entre classes. Adaptativo por construção: dispensa limiar fixo e absorve nível de gravação, ganho e desvanecimento.

**4. Run-length + deglitch.** Segmenta em (ligado, ms) / (desligado, ms). Funde qualquer segmento **< 15 ms** no anterior (elimina pico de ruído e buraco de key-click).

**5. Unidade dit/dah por k-means de 2 grupos em LOG-duração** sobre as marcas. `razão = dah/dit` deve dar ~3,0 (medido: 2,78–3,00 em todos os casos bons). Se `razão < 1,8` a mensagem é toda-ponto ou toda-traço (`HI 55`, `OTTO`): desambigua pelo **espaço intra-caractere**, que vale 1 unidade por definição — se `marca_média / menor_espaço > 2`, as marcas são traços. Medido: `OTTO` e `HI 55` leem corretamente por esta regra.

**6. Espaços em DOIS passos — e este é o passo que quase todo mundo erra.** Não derive os espaços da unidade das marcas: no **Farnsworth** (áudio didático, muito comum) os espaços alongam sem que as marcas alonguem, e a razão 1:3:7 quebra. Faça: (a) espaço `< 2×unidade_da_marca` é intra-caractere, não emite nada; (b) os restantes vão a um k-means de 2 grupos próprio (entre-letras × entre-palavras, que preservam 3:7 entre si), com limiar na **média geométrica** dos dois centros. Antes desta correção o Farnsworth 18/8 dava `"S O C O R R O N A P O N T E"` (CER 68,8%) **com confiança 0,93** — letras certas, palavras destruídas. Depois: CER **0%**.

**7. Decodificação com unidade local, CONFIANÇA COM UNIDADE GLOBAL.** Decodifique com a unidade reestimada numa janela centrada de 16 marcas (tolera velocidade variável). Mas **meça o resíduo de encaixe na grade contra o modelo GLOBAL de velocidade constante.** Medido, e é o achado mais importante para esta bancada:

| deriva | CER | resíduo GLOBAL | resíduo LOCAL |
|---|---|---|---|
| 0% | 0% | 0,018 | 0,019 |
| +30% | 13% | 0,062 | 0,026 |
| +60% | 19% | 0,099 | 0,022 |
| +100% | 31% | 0,135 | 0,032 |
| +150% | 38% | 0,174 | 0,038 |

O resíduo global acompanha o erro monotonicamente; o local fica **plano** enquanto a leitura desaba. Medir a confiança pelo modelo adaptativo elevou a confiança da deriva +100% de 0,66 para **0,98 sem melhorar nada** — o modelo flexível encaixa qualquer coisa. **Um modelo adaptativo nunca pode ser o juiz de si mesmo.**

**8. Confiança 0..1 = produto de 6 termos** (todos 0..1): razão perto de 3 (`exp(−ln(r/3)²/0,08)`) · bimodalidade das marcas (separação/dispersão, saturando em 6) · encaixe na grade global (`exp(−(resíduo/0,22)²)`) · fração de códigos válidos · penalidade de excesso de letras de 1 símbolo (acima de 60% — fala vira `TTTTT`) · massa (`min(1, nChars/8)`). Produto e não soma: um único critério reprovado zera, que é o comportamento que se quer num portão.

**9. Portão: `conf ≥ 0,50`** vai para "provável"; 0,35–0,50 entra em "pouco provável" (o `partition` do repo já corta em 0,35, então encaixa sem inventar régua nova). O `forcedScore` do candidato deve SER a confiança, não um valor fixo.

**Riscos:** FALSO POSITIVO — medido, e o portão segura. Rodei 8 áudios que NÃO são Morse: ruído branco 0,000 · tom contínuo 0,000 · música (arpejo) 0,000 · DTMF regular 0,000 · bipe de alarme 2 Hz 0,000 · batida 120 bpm 0,000 · fala sintética 0,022 · fala irregular 0,020. Contra isso, o pior verdadeiro-positivo com leitura EXATA é 'SOS' a 0,38. Margem de ~17x, e o corte natural é o 0,35 que o repo já usa. Ressalva: na v1 (sem o escore) a fala sintética produzia 'T T T T T T T T T I TTETTA I T T' com 0% de códigos inválidos — ou seja, sem o portão a técnica MENTE de cara. O escore não é enfeite, é o produto.; DERIVA DE VELOCIDADE é o único modo de falha que ainda mente com confiança alta. Na varredura de 300 casos aleatórios, 5,9% dos aceitos por conf≥0,50 têm CER>20%, e QUASE TODOS são deriva 40–64%: a falha é sempre a CAUDA truncada ('SOCORRO NA PONTE' → 'SOCORRO NA P' a conf 0,90). Não é lixo, é leitura parcial — e o acervo diz explicitamente 'faltando 1–2 letras, infira o alvo; não jogue a cadeia fora' (QUEBRAR-PROVAS §7 item 6). Mitigação obrigatória: mostrar SEMPRE o WPM lido e a trilha de pontos/traços ao lado do texto, para o humano ver que a velocidade andou.; MÃO HUMANA TORTA quebra a técnica e o escore avisa junto. Jitter de 20% nas durações: CER 31%, conf 0,38. Jitter 30%: CER 44%, conf 0,25. Ou seja, degrada para 'pouco provável' em vez de mentir — mas significa que morse batido à mão por um organizador amador pode simplesmente não sair. Piso útil medido: jitter ≤12% (CER 6%, conf 0,80).; MORSE SOB FALA é o caso que NÃO funciona. Morse a 1200 Hz somado a fala no mesmo nível: a detecção de portadora vai para 141 Hz (a fundamental da voz, que tem mais contraste) e a confiança cai a 0,06 — recusa correta, mas recusa. Já Morse sob MÚSICA no mesmo nível lê perfeito (conf 1,00). Mitigação: deixar o usuário FIXAR a frequência da portadora à mão clicando no espectrograma, em vez de só confiar no automático.; MENSAGEM CURTA não se autovalida. 'SOS' sozinho lê certo mas fica em conf 0,38 (penalidade de massa); uma letra só ('E') devolve nada — o mínimo são 3 marcas. É honesto, mas quem mandar um áudio de 2 s vai achar que a ferramenta quebrou. Precisa de mensagem de erro explícita ('áudio curto demais para provar que é Morse'), não silêncio.; TODO O MEU TESTE É SINTÉTICO. Sintetizei o áudio (com ruído calibrado por SNR, jitter, deriva, QSB, zumbido de 60 Hz, key-click, Farnsworth) e testei degradação tipo codec (passa-baixa de 4 kHz e 1 kHz, quantização em 8 e 4 bits — todos CER 0%). NÃO testei um único arquivo real de morse, nem gravação de celular apontado para uma caixa de som, nem morse de radioamador com QRM. A robustez a codec e a SNR −3 dB é forte o bastante para eu apostar, mas o primeiro arquivo real pode revelar um modo de falha que não modelei.; AMBIGUIDADE INSOLÚVEL de tudo-ponto/tudo-traço. 'OTTO' e 'HI 55' leem corretamente pela regra do espaço intra-caractere, mas ficam em conf 0,17 porque a razão dah/dit é 1,0 e não há como PROVAR a escala. Se o espaço intra-caractere também estiver ausente (uma palavra de uma letra só), as duas leituras são igualmente válidas e a ferramenta tem de oferecer AS DUAS, não escolher.; RISCO DE ESCOPO, não técnico: esta é a peça barata de uma aba cara. Se ela for usada para justificar a aba Áudio inteira, o custo real (decodificação que trava a thread principal, espectrograma que exige Worker, limite de canvas que falha em silêncio no iOS, formatos que o Safari recusa) chega depois e sem ter sido orçado.

### Espectrograma (tempo × frequência) como instrumento de leitura: STFT própria sobre Float32Array, em Worker, com janela/faixa/escala/contraste ajustáveis, três vistas de canal (E, D, E−D), branqueamento por mediana e exportação em PNG

**Resolve:** Sejamos honestos primeiro, porque isto muda a recomendação: **não há UMA prova no acervo resolvida por desenho no espectro**. Varri `docs/QUEBRAR-PROVAS.md`, `TODO-CIFRAS.md` e `PLANO-CIFRAS.md`: as únicas provas com áudio são a GIA-09 (o enunciado planta "ligada/ligação" na fala → telefone; e o áudio nem veio no acervo, §9) e a ITC 2018 P18 Et.3 (morse num vídeo pré-Challenge). O próprio §7.1 diz que o gargalo de áudio é "reconhecer a música", que é outro problema. Pela régua que o projeto aplica a si mesmo em PLANO-CIFRAS #17 ("dataset sem prova não entra"), a técnica "achar o texto desenhado no espectro" isolada seria **descartada**.

O que justifica fazer mesmo assim é outra coisa, e é forte: o espectrograma é a **superfície de verificação de toda a aba Áudio**. DTMF, Morse por envelope, tons e "ouvir ao contrário" são detectores automáticos que emitem uma afirmação; sem o espectrograma eles são **infalsificáveis** — a pessoa não tem como ver se o "5551234" veio de tons reais ou de ruído. Numa bancada cujo princípio declarado é que "o score parou de mentir", entregar detector sem instrumento é exatamente o pecado. O espectrograma é a única peça da aba que **não pode dar falso positivo, porque não afirma nada** — ele mostra, a pessoa lê.

Concretamente ele destrava: (a) responder "tem alguma coisa neste arquivo?" antes de gastar 20 minutos de gincana; (b) apontar onde no tempo e em que faixa mandar o detector de DTMF/Morse; (c) ver o que a separação E/D que o usuário pediu revela — e especialmente **E−D**, que é onde mora o truque clássico de somar o sinal secreto em antifase (inaudível no mix, limpo na diferença); (d) o caso do ultrassom (mensagem acima de 16 kHz), que é invisível de ouvido e óbvio no espectrograma; (e) o PNG exportado, que é o que se manda no grupo às 23h para quatro pessoas olharem juntas.

Ou seja: alto valor **condicionado** a a aba Áudio existir, e nesse caso é a **fatia 1**, antes de qualquer detector. Como o dono pediu a aba explicitamente, a condição está satisfeita. Como resposta autônoma a "achar desenho escondido", o valor histórico medido é baixo.

**Algoritmo:** Tudo abaixo foi MEDIDO por mim, em Node com o V8 do projeto, com sondas em `/private/tmp/claude-501/-Users-peter-Repos-the-decrypter/4c0f2f88-ae14-4c90-a8ce-66a65c9d7c22/scratchpad/spec/` (`bench.mjs`, `draw.mjs`, `auto.mjs`, `faixa.mjs`, `branquear.mjs`) — sintetizei texto desenhado no espectro, li de volta pela STFT e imprimi em ASCII para conferir a legibilidade a olho.

**1. Decodificar sem destruir o dado.** `const bytes = await file.arrayBuffer(); const copia = bytes.slice(0);` e só então `decodeAudioData(copia)` — o `decodeAudioData` *detacha* o buffer de entrada (medido por outro agente: 176.444 → 0 bytes). Antes disso, se for WAV, ler a taxa real no uint32 little-endian do offset 24 do cabeçalho. Decodificar num `OfflineAudioContext(1, 1, taxaAlvo)` com `taxaAlvo = max(48000, taxa do arquivo, teto 96000)`, para que só ocorra *upsampling*: no contexto padrão de 48 kHz um tom de 30 kHz de um arquivo de 96 kHz cai ~54 dB e some. `OfflineAudioContext` é isento da política de autoplay — analisa sem gesto do usuário.

**2. Canais.** `getChannelData(0/1)` já vem desentrelaçado em Float32 (−1..+1). Derivar quatro vistas: **E**, **D**, **E−D** (`(l-r)`) e **mono** (`(l+r)/2`). Antes, varrer `max|L−D|`: se for 0 (ou < 1e-4, tolerância para codec com perda), rotular "os dois canais são idênticos" e desenhar um painel só, em vez de três iguais. Ao mandar amostras para o Worker, **copiar** (`ch.slice()`) — transferir `getChannelData().buffer` é aceito e mata o AudioBuffer em silêncio.

**3. STFT.** Radix-2 caseira (~80 linhas: tabela de twiddles + tabela de bit-reversal pré-calculadas no construtor), pura sobre `Float32Array`, sem DOM, testável em Vitest. Janela **Hann** (`0.5 − 0.5·cos(2πi/(N−1))`), fixa — sem janela o vazamento cria listras horizontais falsas que numa prova viram "padrão". Normalização coerente `2/Σw[i]` para que um seno de amplitude 1 dê 0 dBFS (assim o eixo em dB é absoluto e comparável entre arquivos). Saída em dB: `20·log10(|X[k]|·norm + 1e-12)`, laço de `k` **limitado a N/2+1** (a metade de cima é espelho).

**Parâmetros, com os números:** `N` é controle explícito — 512 / 1024 / **2048 (padrão)** / 4096 / 8192. A 48 kHz isso dá 93,8 / 46,9 / **23,4** / 11,7 / 5,9 Hz por bin e 10,7 / 21,3 / **42,7** / 85,3 / 170,7 ms por quadro. `hop = N/2` (50% de sobreposição) fixo. **Achado medido que importa:** com a sobreposição fixa em fração de N, o custo total da STFT é praticamente **independente de N** — 60 s mono deram 199 / 195 / 203 / 219 ms para N = 1024 / 2048 / 4096 / 8192. O botão que mais resolve prova é de graça; exponha-o sem medo.

**4. Custo e Worker.** 60 s mono, N=2048, hop=512 → 5.622 quadros × 1.025 bins = **195 ms** medidos (Node). No navegador conte 1,5–3×, e são 3 canais (E, D, E−D) → ordem de 1 a 2 s. Acima de ~3 s de áudio o Worker deixa de ser opcional. Vite tem Worker nativo: `new Worker(new URL("./stft.worker.ts", import.meta.url), { type: "module" })`. O Worker devolve **Uint8Array transferível**, não Float32: quantizar `dB → 0..255` corta a memória em 4× (medido: **5,8 MB por canal** para 60 s em Uint8) e é exatamente a precisão que um pixel comporta. Worker reporta progresso e aceita cancelamento (o mesmo Worker serve para recalcular quando a pessoa troca N).

**5. Contraste — a parte que decide se a mensagem aparece.** Não use piso fixo. `teto = percentil 99,9` dos dB do quadro inteiro; `piso = teto − FAIXA`, com **FAIXA = 30 dB por padrão**, ajustável de 15 a 90 dB. Medido varrendo a faixa sobre o mesmo áudio: 20 dB e 30 dB dão letras limpas; 45 dB começa a pintar chuvisco; 60 dB vira lama ilegível. Confirmei também que os percentis altos são estáveis: com ruído de fundo a −30, −50 e −70 dB, o p99,9 ficou em −10,9 dB nos três casos (o teto ancora no sinal, não no ruído), enquanto p50/p90 seguiam o ruído — por isso ancorar no **pico**, nunca na mediana.

**6. Branqueamento por mediana — o truque que salva o caso realista.** Para cada bin `k`, calcular a mediana de `dB[f][k]` ao longo de todos os quadros e subtraí-la. Isso apaga o que é constante no tempo (música, zumbido, ar-condicionado — as linhas horizontais) e deixa o que é transitório, que é o desenho. **Medição decisiva:** desenho a 30 dB abaixo de uma música harmônica na mesma banda ficou **completamente invisível** na vista crua com FAIXA 30 dB (o pico é a música), e ficou **legível** com a mediana subtraída na mesma FAIXA 30 dB. Custo: ~17 ms sobre os 195 ms da STFT de 60 s. É um botão, desligado por padrão e rotulado como o que é ("realçar o que varia no tempo") — nunca ligado em silêncio, porque ele muda a figura.

**7. Eixos e desenho.** Frequência **LINEAR por padrão**, log como alternância — mensagem desenhada é desenhada em eixo linear e vista em log fica deformada e ilegível; pôr log como padrão destrói justamente o caso de uso. Recorte de faixa (`fBase`..`fTopo`) por dois campos numéricos, que também é o zoom vertical. Zoom/pan no tempo saem de graça: pinte UM canvas fora da árvore no tamanho nativo (`largura = nº de quadros`, `altura = nº de bins`) e use `drawImage` para a vista. Medido por outro agente: preencher um ImageData de 5.622×1024 custa 28 ms e o `putImageData` 2 ms — desenho não é gargalo, não vale OffscreenCanvas nem ladrilhamento por desempenho.

**8. Guarda de área (obrigatória, falha em silêncio).** `quadros × bins` a N=2048/hop=512: 60 s = 5,8 Mpx; **3 min = 17,3 Mpx, que já estoura o teto de 16.777.216 px do iOS Safari** — e o canvas simplesmente para de desenhar, sem lançar. Regra: se `quadros × bins > 16_000_000`, dobrar o hop (decimar no tempo) até caber, e **dizer na tela** que a resolução temporal foi reduzida.

**9. Rampas de cor.** Cinza + inversão (é o que se usa para ler texto desenhado) e uma rampa perceptualmente uniforme (viridis ou magma). Nunca arco-íris/jet, que inventa borda onde não há. Hex literal num objeto nomeado (`const RAMPAS = {...}`) com comentário, seguindo o precedente do `CORES` do triangulate-panel e do `render.ts` da Matriz — bitmap de dado não usa token semântico.

**10. Exportar.** `toRgba` puro (Uint8ClampedArray sobre ArrayBuffer nomeado) → `toPng` → `baixarPng`, copiando literalmente o molde de `src/features/matrix/render.ts`, inclusive o "devolve `null` em vez de lançar quando não há canvas" (jsdom).

**11. Sem dependência nova.** A radix-2 caseira medida em 195 ms/60 s já está folgada dentro do orçamento de um Worker. O `fft.js` seria 3× mais rápido por 2.778 B gzip, mas 3× de 195 ms é invisível e ele traz uma armadilha real (`realTransform` deixa lixo acima de k=N/2, que num espectrograma vira ruído estruturado que parece mensagem). **Zero dependências novas** — e isso também elimina a necessidade de `import()` dinâmico para a lógica; só o painel entra por `lazy()`.

**Escopo desta fatia — o que fica de fora de propósito:** microfone, transporte de reprodução com cursor, SSTV, galeria de colormaps, arquivos acima de ~3 min. Entram depois, se entrarem.

**Riscos:** FALSO POSITIVO DO OLHO — o risco número 1 desta bancada, e aqui ele é humano, não do score. Pareidolia: com o piso baixo o bastante, ruído vira textura que parece estrutura. Meus próprios renders a −100 dB são a prova: estão cheios de padrão plausível e não há nada ali. Mitigação: FAIXA padrão de 30 dB (que suprime o chuvisco, medido), leitura de dB/Hz/tempo sob o cursor para que toda alegação seja conferível, e a aba NUNCA emite um candidato para o fan-out nem escreve 'mensagem encontrada' — ela desenha e cala.; O PADRÃO INGÊNUO ESCONDE EXATAMENTE O ALVO (medido). Piso = pico − 30 dB é ótimo com fundo quieto e cego quando a mensagem está 30 dB abaixo de uma música na mesma banda: o pico é a música, o desenho cai no piso e a tela fica vazia. A pessoa conclui 'não tem nada' e joga a prova fora. Mitigações obrigatórias: o botão de branqueamento por mediana (que resolveu esse caso exato na medição), um 'varrer contraste' que renderiza 3 faixas de uma vez, e jamais escrever 'nada encontrado' — a tela vazia é 'nada visível NESTE contraste'.; CODEC COM PERDA PODE TER APAGADO O DADO ANTES DE VOCÊ ABRIR. MP3/AAC/Opus aplicam modelo psicoacústico: conteúdo silencioso 30+ dB abaixo de um vizinho forte na mesma banda crítica é precisamente o que o codificador descarta, e Opus/AAC cortam acima de ~16–20 kHz. Um desenho que existia no WAV pode simplesmente não estar no MP3 que o organizador mandou — e o espectrograma vai estar certo ao mostrar nada. A UI tem de dizer isto quando o arquivo não for WAV/FLAC: 'peça o original'.; REAMOSTRAGEM MATA ULTRASSOM EM SILÊNCIO. `decodeAudioData` reamostra para a taxa do contexto sempre, e o `AudioBuffer.sampleRate` já é a taxa do contexto — a taxa original do arquivo NÃO é exposta por API nenhuma. Um tom de 30 kHz num arquivo de 96 kHz cai ~54 dB num contexto de 48 kHz e a faixa acima de 24 kHz aparece vazia com toda a cara de estar correta. Só se defende parseando o cabeçalho do WAV à mão e escolhendo a taxa do OfflineAudioContext ANTES de decodificar.; TETO DE CANVAS QUE FALHA SEM ERRO. 3 min a N=2048/hop=512 dá 17,3 Mpx e estoura os 16.777.216 px do iOS Safari; o canvas para de desenhar e não lança nada. Sem a guarda explícita de área, a aba fica quebrada só no celular de quem estiver na rua — que é exatamente quem está na gincana. E o teto real de análise é a memória do AudioBuffer (Float32 planar, ~21 MB por minuto de estéreo a 44,1 kHz), não o tamanho do arquivo: um MP3 de 5 MB e 1 hora vira ~1,27 GB decodificado, e não existe decodificação em streaming nem recorte antes de decodificar.; DETACH SILENCIOSO EM DOIS PONTOS. (a) `decodeAudioData` zera o ArrayBuffer de entrada — se você ler os bytes crus depois, recebe comprimento 0 sem erro; (b) transferir `getChannelData().buffer` para o Worker é ACEITO e mata o AudioBuffer. As duas passam pelo TypeScript, pelo Biome e por qualquer teste que não olhe o dado depois. Só convenção de código defende: `slice(0)` antes de decodificar, `slice()` antes de transferir.; ARMADILHA DE PADRÃO DE PROJETO: pôr o eixo de frequência em log por padrão. Parece a escolha sofisticada e destrói o caso de uso principal — desenho é feito em eixo linear e em log sai deformado e ilegível. Linear é o padrão; log é alternância.; RISCO DE ESCOPO, e é o mais provável de todos: a aba Áudio vira um projeto de três semanas (microfone, transporte, SSTV, galeria de colormaps, detectores). O espectrograma é a fatia 1 e é autossuficiente; tudo o mais é fatia separada, com decisão separada. Se o corte não for defendido, o item não fecha.; RISCO DE MÉRITO, declarado sem maquiagem: zero provas do acervo (41 GIA + ITC 2017–2025) foram resolvidas por mensagem desenhada no espectro. Se a aba Áudio NÃO for construída, esta técnica sozinha não se paga e a recomendação vira 'não fazer'. O que a sustenta é ser o instrumento de verificação dos detectores que virão — se eles não vierem, ela fica órfã.

### SSTV — decodificar imagem transmitida por som (Robot 36, Martin M1/M2, Scottie 1/2/DX)

**Resolve:** **Nenhuma prova real do acervo — e eu procurei.** Nos 73+ casos documentados (ITC 2017–2025 + GIA), as ÚNICAS provas de áudio são: GIA-09 (pista falada "ligada/ligação"; o áudio nem veio no acervo) e GIA-30 *Sinfonia Silenciosa* (5ª letra do fim dos TÍTULOS das músicas — não toca no áudio). O próprio `docs/QUEBRAR-PROVAS.md:643` resume o gargalo real: "reconhecer a música é o gargalo". Zero provas com dado codificado em tom — nem DTMF, nem Morse sonoro, quanto mais SSTV.

O único fio radioamador do acervo é GIA-14 (a placa `GH94RC` era um Maidenhead Locator), e ele é honestamente o melhor argumento CONTRA a minha recomendação: os organizadores flertam com o mundo do radioamadorismo. Mas reconhecer um formato de string que você digita é uma coisa; implementar demodulador FM com rastreio de sync por linha é outra.

**O matador não é a raridade, é o formato da saída.** SSTV entrega uma IMAGEM — exatamente o ponto cego declarado da bancada (`QUEBRAR-PROVAS.md` §7.2: "Qualquer entrada por imagem — sem OCR, sem EXIF, sem paleta, sem LSB"). Não encadeia no Decodificador, não vira `chainValue`, não acorda a1z26/CEP/telefone. Some a doutrina que justifica a aba Áudio existir ("o resultado quase nunca é a resposta final — mande para o Decodificador"). O humano olha a figura com os olhos e digita o que viu.

E é aí que o custo/benefício quebra de vez: **um app grátis de celular faz isso em 60 segundos** (Robot36 no Android), encostando o telefone na caixa de som. Para DTMF/Morse a bancada ganha do app porque encadeia; para SSTV empata, porque o endpoint é a visão humana nos dois casos. Numa gincana sempre há celular.

**Algoritmo:** Especificação conferida contra 3 fontes independentes (spec.py do colaclanth/sstv, tabela do SSTV Handbook OK2MNM, README do xdsopl/robot36) e validada por aritmética — os totais fecham.

**Grade comum:** preto=1500 Hz, branco=2300 Hz → `nivel = clamp(round((f−1500)/3.1372549), 0, 255)` (800/255=3.1372549). Sync=1200 Hz. Todos 320 colunas.

| Modo | VIS | Linhas | T_linha | T_px | Total |
|---|---|---|---|---|---|
| Robot 36 | 8 | 240 | 150 ms | 275 µs (Y) / 137,5 µs (croma) | 36,0 s |
| Robot 72 | 12 | 240 | 300 ms | 431 µs | 72 s |
| Martin M1 | 44 | 256 | 446,446 ms | 457,6 µs | 114,3 s |
| Martin M2 | 40 | 256 | 226,798 ms | 228,8 µs | 58,1 s |
| Scottie 1 | 60 | 256 | 428,22 ms | 432 µs | 109,6 s |
| Scottie 2 | 56 | 256 | 277,692 ms | 275,2 µs | 71,1 s |
| Scottie DX | 76 | 256 | 1050,3 ms | 1080 µs | 268,9 s |

**Etapa 0 — decodificar.** `OfflineAudioContext` a **48000 Hz** (aqui NÃO se usa os 96 kHz da regra do ultrassom: SSTV termina em 2300 Hz; 96 k só dobraria o custo). Mix mono; se o VIS falhar, tentar L, R e L−R (barato, o VIS olha só ~2 s).

**Etapa 1 — cabeçalho VIS (o portão anti-falso-positivo).** Goertzel em 1100/1200/1300/1900 Hz — aqui Goertzel é a ferramenta certa porque as janelas são longas e a decisão é dura. N=30 ms=1440 amostras → resolução 33,3 Hz, e os tons distam 100–200 Hz (margem >3 bins). Passo de busca 5 ms.
Sequência: leader 1900 Hz por 300 ms (aceitar 250–350) → break 1200 Hz por 10 ms (janela curta N=480) → leader 1900 Hz 300 ms → start 1200 Hz 30 ms → **8 bits × 30 ms** (7 de dado **LSB primeiro**, 1100 Hz=1 / 1300 Hz=0, limiar em 1200 Hz, tolerância ±50 Hz) → paridade **par** → stop 1200 Hz 30 ms. Duração total 880 ms.
**Rejeitar se a paridade falhar ou o VIS não estiver na tabela.**

**Etapa 2 — demodulação FM (a parte cara).** **NÃO use FFT por pixel.** Fiz a conta: pixel do Martin M1 = 457,6 µs = 22 amostras a 48 kHz → FFT de 22 pontos dá bins de 2182 Hz, e a faixa 1500–2300 inteira ocupa **0,37 de um bin**. Para resolver 1 nível de brilho (3,1 Hz) você precisaria de N≈16000 = 333 ms = 728 pixels. O princípio da incerteza proíbe. (É por isso que decodificadores baseados em FFT — o colaclanth faz `rfft`+interpolação baricêntrica — saem granulados: estão interpolando 2 bins.) O caminho certo é estimador paramétrico:
1. Mistura em quadratura a fc=1900 Hz: `I=x·cos(2π·1900·n/fs)`, `Q=−x·sin(...)`.
2. Passa-baixa FIR 63 taps Hamming, corte 900 Hz (passa 1100→−800 e 2300→+400).
3. Decimar por 2 → 24 kHz (Nyquist 12 kHz ≫ 900 Hz). Não decime por 4: o croma do Robot 36 (137,5 µs) ficaria com 1,65 amostra/pixel.
4. `f[n] = 1900 + (fs/2π)·atan2(I[n]Q[n−1]−Q[n]I[n−1], I[n]I[n−1]+Q[n]Q[n−1])`.

**Etapa 3 — rastreio de sync por linha (inegociável).** Para a linha k, procurar em ±0,25·T_linha em torno de `k·T_linha+t0` a maior corrida com `f<1350 Hz` cuja duração case com o sync do modo (Martin 4,862 ms; Scottie/Robot 9 ms) dentro de ±30%; o centroide da corrida é a origem t_k. Linha sem sync → interpolar pelo ajuste. Ajustar `t_k = a·k + b` por mínimos quadrados; `a` é o período medido.
**Por que isto não é opcional:** cruzando as duas tabelas publicadas do Martin M1 achei divergência de **0,572 ms/linha** (uma esquece o separador após o vermelho: 445,874 vs 446,446 ms — só a segunda fecha com os 134,395 lpm do handbook). 0,572 ms = 1,25 px/linha = a imagem cisalha 320 px até a linha 256. Ressincronizar a cada linha torna o decoder imune a essa divergência E ao slant de gravação analógica.

**Etapa 4 — amostragem.** Por pixel, **mediana** de `f` na janela (mediana, não média: imune a um clique isolado) → fórmula do nível.

**Etapa 5 — montagem por modo (onde o tempo some):**
- **Martin:** sync 4,862@1200 → porch 0,572@1500 → **G** → sep 0,572 → **B** → sep 0,572 → **R** → sep 0,572. Ordem G,B,R.
- **Scottie:** sep 1,5@1500 → **G** → sep 1,5 → **B** → **SYNC 9@1200** → porch 1,5@1500 → **R**. O sync fica no MEIO da linha: o sync que você acha pertence ao vermelho da linha corrente e ao G/B da SEGUINTE. Armadilha clássica de off-by-one.
- **Robot 36:** sync 9@1200 → porch 3@1500 → **Y** 88 ms → separador 4,5 ms cuja **FREQUÊNCIA diz o canal: 1500 Hz ⇒ R−Y, 2300 Hz ⇒ B−Y** → porch 1,5@1900 → croma meia-varredura 44 ms (160 amostras esticadas para 320). Croma é média de 2 linhas (subamostragem 2:1 vertical), reusada no par. Depois YCrCb→RGB (matriz BT.601). **Leia a frequência do separador — não deduza pela paridade da linha**; arquivo cortado na primeira linha inverte todas as cores.

**Etapa 6 — render.** `Uint8ClampedArray` RGBA puro no molde de `matrix/render.ts` (sem canvas → testável em jsdom), PNG pelo `baixarPng` existente.

**Custo:** 114 s @48 kHz = 5,47 M amostras; FIR 63 taps ×2 + atan2 ≈ **2–4 s** em JS. 22 MB de Float32, imagem 328 KB.

**Riscos:** FALSO POSITIVO: risco genuinamente BAIXO — é a força atípica do SSTV. O portão é leader 300ms@1900 + break + leader + start + 8 bits + paridade PAR + VIS na tabela conhecida. Áudio aleatório essencialmente nunca passa. Não fere o princípio do 'score parou de mentir'. Reportar confiança composta: paridade OK + VIS conhecido + fração de linhas com sync achado (ex.: 243/256 = 0,95).; FALSO POSITIVO REAL, e é aqui que mora: arquivo SEM cabeçalho VIS (muito comum — recortam o áudio já na imagem). Aí só resta adivinhar o modo pelo período de linha medido, e QUALQUER áudio periódico vira 'SSTV'. Mitigação obrigatória: só oferecer adivinhação por período sob pedido explícito do usuário, exigindo casamento <0,5% com um modo conhecido E ≥80% das linhas exibindo pulso de sync. Nunca no fan-out automático.; COLISÃO DE VIS DOCUMENTADA: Scottie DX e AVT 188 compartilham o VIS 76 (nota de rodapé do SSTV Handbook: 'accidentally share the same VIS code'). Desempatar pela duração total (269 s vs 196 s) ou rotular como ambíguo — nunca chutar em silêncio.; COMPRESSÃO COM PERDA destrói a varredura FM. MP3 ≥128 kbps sobrevive com ruído; Opus de WhatsApp (~24 kbps) pode ser irrecuperável. Tem de dizer isso na cara em vez de renderizar papa colorida e deixar a equipe achar que a imagem 'é assim mesmo'.; INVERSÃO DE COR no Robot 36 se o canal de croma for deduzido pela paridade da linha em vez de lido na frequência do separador (1500=R−Y / 2300=B−Y). Arquivo cortado antes da primeira linha inverte tudo — e o resultado parece plausível, que é o pior tipo de erro.; OFF-BY-ONE DE LINHA no Scottie: o sync cai entre o azul e o vermelho, então pertence ao R da linha corrente e ao G/B da seguinte. Errar isso desloca as cores em uma linha e produz uma imagem quase certa — difícil de notar, fácil de shipar.; SLANT por deriva de clock se o áudio foi gravado acusticamente (celular apontado para a caixa de som — cenário plausível numa gincana). Resolvido pelo ajuste por mínimos quadrados das posições de sync, mas só se os syncs forem localizáveis; em áudio ruidoso, degrada.; AS TABELAS DE TIMING PUBLICADAS DIVERGEM entre si na casa do sub-milissegundo (achei 0,572 ms/linha de diferença no Martin M1 entre duas fontes). Quem confiar numa tabela sem ressincronizar por linha entrega imagem cisalhada e vai culpar o áudio.; UI/TRAVA: 2–4 s de cálculo obriga Worker com progresso e cancelamento; sem isso a aba congela. E o painel não pode exibir a imagem 320×256 ao lado de um espectrograma de 5622 px no mobile de 375 px.; RISCO DE ESCOPO, o mais caro de todos: SSTV é a ponta de uma cauda (PD120, Wraase, AVT, MSCAN, Pasokon…). Entregar 7 modos convida 'e o PD120?'. O acervo não justifica nem os 7.

### Áudio ao contrário (backmasking) + velocidade com e sem mudança de tom — reprodução, não análise

**Resolve:** Antes do que promete: fui atrás da âncora no acervo e ela é MAGRA. Em 73 cadeias de `RESOLUCOES.md` + 41 provas da GIA há UMA prova de áudio registrada — GIA-09 ("planta 'ligada/ligação' no áudio" → telefone 3339-4080, `docs/QUEBRAR-PROVAS.md:251`) — e `:828` declara que "o áudio não veio no acervo, só o QR — a prova não é reconstituível sem ele". De backmasking especificamente: ZERO ocorrência registrada. Quem prometer "isto destrava a prova X" está inventando. O que existe de verdade é o canal: `:155` diz que no Morse "o filtro histórico é o CANAL (luz, som, vídeo), não o decode" — ou seja, o Morse do acervo chegou por som e foi transcrito à mão.

O que a técnica destrava concretamente, então, é isto:

1. **O ouvido é o único decodificador para fala.** Voz backmascarada ou acelerada não tem detector — nenhuma bancada resolve, só a pessoa ouvindo. Botão de inverter + botão de velocidade É a ferramenta inteira.

2. **A distinção tom/velocidade é o achado operacional, e ela decide se a prova abre ou não.** Se o organizador ACELEROU a voz num app de celular (reamostragem, efeito "esquilo"), a inversa exata é reamostrar de volta: `rate = 0.5` com **modo fita** (tom desce junto) devolve fala natural em velocidade natural de uma vez. Se a pessoa usar o modo "manter o tom" no mesmo arquivo, sai fala lenta AINDA em tom de esquilo — ininteligível, e ela conclui que não tem mensagem. Se o organizador usou um editor moderno (time-stretch, tom preservado por padrão), é o contrário. **São dois botões porque são duas transformações inversas diferentes, e não dá para adivinhar qual foi usada — tem de dar os dois e deixar tentar.** Medido, a razão é exata: 440 Hz a 4× em modo fita → 1760,7 Hz; a 16× → 7040 Hz.

3. **Velocidade é a verificação humana dos detectores — e isso vale mais que o backmasking.** Morse a 25 WPM tem ponto de 48 ms (1200/WPM) e é ilegível de ouvido; a 0,35× o ponto vira 137 ms e a pessoa CONFERE letra a letra o que o detector afirmou. Numa bancada cujo princípio é "o score parou de mentir", poder ouvir devagar o que a máquina diz ter achado é o antídoto do falso positivo.

4. **Fecha a lacuna do título.** A regra `espelho` já existe em `title-hints.ts:447` (`/espelh|invertid|ao contrario|de tras para frente|reverso/`) e hoje sugere só `reverse`, `atbash`, `a1z26-reverse` — três decoders de TEXTO. Um título "Ouça ao contrário" com um .mp3 na mão levanta os chips errados.

**E o que ela NÃO destrava, provado, não achado:** o espectrograma do áudio invertido é o espelho EXATO do original. Rodei a conta (`scratchpad/rev/mirror.mjs`, DFT ingênua, N=256, hop=64, sinal com chirp + par DTMF + transiente): erro relativo máximo entre a coluna j do original e a coluna F−1−j do invertido = **2,281e−7** (médio 3,829e−9). Inverter não revela NADA para máquina nenhuma. O mesmo vale para Morse: inverter o áudio inverte exatamente a sequência de intervalos, então "decodificar o invertido" ≡ decodificar e aplicar o decoder `reverse` que já existe (`codecs.ts:297`). Todo o valor está no domínio audível. Vender "análise ao contrário" seria inflar escopo.

**Algoritmo:** Nada de DSP: as duas transformações difíceis já existem prontas no navegador. Zero dependência nova, zero byte de lib. Tudo abaixo foi MEDIDO em Chromium 148.0.7778.280 (macOS) com sondas em `/private/tmp/claude-501/-Users-peter-Repos-the-decrypter/4c0f2f88-ae14-4c90-a8ce-66a65c9d7c22/scratchpad/rev/` (probe.html, probe2.html, mirror.mjs — re-executáveis).

**PASSO 0 — motor de reprodução: `new Audio()`, criado no hook, NUNCA em JSX.**
Verifiquei com o `biome check` do repo: `lint/a11y/useMediaCaption` dispara em `<audio>` mesmo SEM `controls` (2 erros em 2 elementos). Duas saídas testadas: `<track kind="captions" />` limpa (0 erros), e criar `const el = new Audio(url)` dentro do `use-audio-transport.ts` não passa nem perto do lint. **Use a segunda** — não há motivo para o elemento estar na árvore, o transporte é nosso. `preservesPitch: boolean` está em `node_modules/typescript/lib/lib.dom.d.ts:15471`, então não precisa de cast.

**PASSO 1 — as fontes (uma só decodificação, N variantes).**
Do `AudioBuffer` já decodificado pela aba (canal L e R como `Float32Array`), monte sob demanda:
- Esquerdo · Direito · Mono `(L+R)/2` · Diferença `L−R` (a que revela antifase)
- cada uma × normal / invertida
São 8 variantes. **Não pré-gere as 8** (8 × 11,5 MB = 92 MB por minuto de estéreo): gere na hora, cache LRU de 2, `URL.revokeObjectURL` no resto.

**PASSO 2 — inverter: `ch.slice().reverse()`, por canal separadamente.**
Medido: 60 s estéreo = **4,0 ms**. O `.slice()` é obrigatório — `getChannelData()` devolve referência viva ao buffer interno, e `reverse()` é in-place. Inverter canal a canal preserva a separação L/R que o usuário pediu, então "esquerdo ao contrário" é variante independente.

**PASSO 3 — WAV Blob: é isto que destrava o time-stretch nativo.**
O `AudioBufferSourceNode` só sabe reamostrar. Quem tem WSOLA embutida é o elemento de mídia — e ele só come URL. Então: `Float32Array[] → WAV → Blob → createObjectURL → el.src`. Cabeçalho canônico de 44 bytes (`RIFF`/`WAVE`/`fmt `/`data`, fmt code 1 = PCM16, 3 = IEEE float).
Medido, 60 s estéreo @48 kHz: **PCM16 44,4 ms / 11,5 MB · float32 43,0 ms / 23,0 MB · createObjectURL 1,9 ms**. Round-trip confirmado: o próprio `decodeAudioData` lê os dois de volta (2 canais, 2.880.000 amostras, sr 48000).
Use **PCM16 para tocar** (piso de ruído −96 dBFS, muito abaixo de qualquer mensagem escondida) e ofereça **float32 no botão de baixar**, para quem for reanalisar fora.
Custo total por variante (inverter + encodar + URL) ≈ **50 ms por minuto de estéreo**. Linear: 10 min ≈ 500 ms → aí o `encodeWav` vai para o Worker. Transferir esse ArrayBuffer é SEGURO (é nosso), ao contrário de transferir `getChannelData().buffer`, que mata o AudioBuffer.

**PASSO 4 — velocidade: `el.playbackRate`. Faixa medida, com clamp obrigatório.**
`[0,0625 … 16]` inclusive. Fora disso **lança `NotSupportedError`** — medido: 0,0624 lança, 0,0625 aceita, 16 aceita, 16,1 lança, −1 lança. `0` é ACEITO em silêncio (= pausa) e confunde. Um slider sem clamp quebra a aba na primeira arrastada até o fim.
Nível medido constante em toda a faixa neste Chrome: **−19,7 dB de 0,0625 a 16, sem silenciar** (o Chrome trocou por WSOLA no 63/64 e parou de mudar). Mas o Gecko silencia fora de **0,25–4,0** (MDN). **Trave a UI em 0,25–4** (presets 0,25 · 0,35 · 0,5 · 0,75 · 1 · 1,5 · 2 · 4 + `<input type="range">` — medido: `range` e `select` passam limpo no Biome) e deixe 0,0625–16 atrás de um "modo avançado".

**PASSO 5 — tom: `el.preservesPitch`. Dois botões, rótulos em português de gente.**
Medido: existe, **padrão `true`**, sem prefixo (`mozPreservesPitch` e `webkitPreservesPitch` = false neste Chrome — não escreva fallback prefixado).
Medição real do pico espectral, tom de 440 Hz roteado por `MediaElementAudioSourceNode → AnalyserNode` (fftSize 16384, smoothing 0):
- `rate 1.0` → 439,5 Hz
- `rate 0.5`, **manter o tom** → **439,5 Hz** (WSOLA nativa funcionando)
- `rate 0.5`, **modo fita** → **222,7 Hz**
- `rate 4`, modo fita → 1760,7 Hz · `rate 16`, modo fita → 7040 Hz
Rótulos: **"manter o tom"** (`preservesPitch = true`) e **"modo fita"** (`false`). Jamais a palavra `preservesPitch` na tela. Detecte `"preservesPitch" in HTMLMediaElement.prototype` (Baseline 2023) e, se faltar, esconda o par e avise que só há modo fita.

**PASSO 6 — inverter na reprodução: não existe nativo, e no `<audio>` a falha é BARULHENTA.**
`playbackRate = -1` no elemento de mídia **lança NotSupportedError** (medido) — melhor que o `AudioBufferSourceNode`, que aceita e renderiza silêncio. De qualquer forma a inversão é a do Passo 2; o elemento só toca a variante já invertida.

**PASSO 7 — a REGRA que impede o falso negativo.**
**Todo detector (DTMF, Morse, espectrograma, matemática de canal) roda no `AudioBuffer` ORIGINAL a 1,0×. Sempre. A variante de reprodução é outro objeto e NUNCA entra no detector.**
Por quê, medido no par DTMF 697+1209 Hz (tecla 1):
- manter o tom, rate 0,25 / 0,5 / 1 / 2 → picos em **697,3 e 1210 Hz** nos quatro casos, sem nenhum pico espúrio dentro de 25 dB
- modo fita, rate 0,5 → **348,6 e 603,5 Hz**
Ou seja: em modo fita o detector de DTMF não acha tecla nenhuma e não tem como saber por quê, enquanto os tons estão claramente audíveis. E a WSOLA, embora não invente tons (bom!), multiplica as DURAÇÕES por 1/rate — um detector de Morse por envelope leria o WPM errado.

**PASSO 8 — espectrograma invertido: FLIP de canvas, não recálculo.**
Já provado exato (erro 2,281e−7). `ctx.save(); ctx.scale(-1,1); ctx.drawImage(...); ctx.restore()`. Custo zero, e o `drawImage` de reescala já foi medido em 0 ms.
Se alguém insistir em recalcular, o detalhe que quebra: a análise do invertido tem de começar no deslocamento **r = (L − N) mod hop**. Medi os dois: sem o offset o erro relativo máximo vai a **9,998e−1** (colunas completamente diferentes); com `r = 37` cai para **3,881e−11**. É mais um motivo para só espelhar.

**PASSO 9 — trocar de variante durante a reprodução.**
A invertida tem a MESMA duração. Ao alternar normal↔invertida mantendo o ponto de escuta equivalente, o `currentTime` novo é `duration − currentTime`, não `currentTime`. Errar isso é o bug que faz a pessoa achar que o botão não fez nada.

**PASSO 10 — leitura de apoio na UI**, tudo em `font-mono`: taxa efetiva, duração efetiva (`duration / rate`), e "ponto de Morse equivalente" = `(1200 / WPM) / rate` ms, para calibrar quanto desacelerar.

**O que NÃO implementar, e por quê (medido):**
- **WSOLA/phase vocoder na mão.** Minha OLA caseira (N=2048, hop de síntese N/4, busca de correlação ±256) levou **203 ms** para 60 s @0,5× na thread principal — e soaria pior que a do Chrome, que custa 0 ms porque roda no pipeline de mídia. Escrever isso é pagar para piorar.
- **Pitch-shift com duração constante.** Não há caso de gincana: transpor sem mudar a duração não revela informação que o par velocidade+tom não revele.
- **`detune` como controle de tom.** Armadilha medida: `detune = -1200` no `AudioBufferSourceNode` dá o MESMO 498 Hz que `playbackRate = 0.5`. Não é pitch-shift independente — é a mesma reamostragem em outra unidade (cents). Quem for implementar vai cair nessa.

**Riscos:** FALSO NEGATIVO SILENCIOSO — o pior, e o único de verdade grave. Detector rodando no áudio transformado: em modo fita a 0,5× o par DTMF 697/1209 vira 348,6/603,5 Hz (MEDIDO) e o detector não acha tecla nenhuma, sem erro, com os tons audíveis. Defesa é arquitetural, não de UI: os detectores recebem o AudioBuffer ORIGINAL e a variante de reprodução é outro objeto que nunca chega neles. Vale um teste de regressão que fixe isso.; PAREIDOLIA ACÚSTICA — o falso positivo real desta técnica. Ouvir palavra em ruído invertido é o efeito psicoacústico que sustenta a lenda inteira do backmasking. A bancada NÃO pode transcrever nem pontuar áudio reverso: nenhum candidato automático sai daqui. O texto só entra na bancada se a PESSOA digitar o que ouviu (aí sim com o botão 'usar no Decodificador'). É o que preserva o princípio de que o score parou de mentir.; A ILUSÃO DO ESPECTROGRAMA INVERTIDO — provado que o espectrograma de magnitude do invertido é o espelho exato (erro relativo 2,281e−7). Se a UI oferecer 'analisar ao contrário' como se fosse análise, a pessoa vai gastar tempo procurando algo que matematicamente não pode estar lá. Rotular 'ver espelhado', nunca 'analisar'.; playbackRate FORA DA FAIXA LANÇA — 0,0624 e 16,1 dão NotSupportedError (MEDIDO); −1 idem; 0 é aceito em silêncio e vira pausa. Slider sem clamp derruba a aba na primeira arrastada até o extremo.; PORTABILIDADE DA FAIXA NÃO TESTADA — neste Chrome nada silencia (−19,7 dB constante de 0,0625 a 16, MEDIDO), mas o Gecko silencia fora de 0,25–4,0 (documentação MDN, NÃO testei Firefox nem Safari nem celular). Travar a UI em 0,25–4 é o que garante som em todo navegador.; preservesPitch É BASELINE 2023 — em Safari/iOS antigo não existe e o navegador faz modo fita calado, produzindo exatamente o resultado errado sem avisar. Detectar com `"preservesPitch" in HTMLMediaElement.prototype`; sem ele, esconder o par de botões. Prefixos moz/webkit são false neste Chrome (MEDIDO) — fallback prefixado é código morto.; ARMADILHA DO detune — `detune = -1200` dá o mesmo 498 Hz que `playbackRate = 0.5` (MEDIDO). Quem procurar pitch-shift independente na Web Audio vai achar que encontrou. Não existe.; MEMÓRIA E VAZAMENTO DE OBJECT URL — 11,5 MB por variante por minuto de estéreo, sobre os 22,0 MB do AudioBuffer. Sem revokeObjectURL a aba cresce a cada troca porque o Blob fica retido pela URL. Cache LRU de 2 variantes, no máximo.; PISO DE 16 BITS NO DOWNLOAD — −96 dBFS. Irrelevante para ouvir, mas mata conteúdo abaixo disso se a pessoa baixar o WAV invertido e reanalisar noutra ferramenta. Oferecer o download em float32 (23,0 MB/min, round-trip verificado).; TROCA DE VARIANTE PERDE O PONTO — a invertida tem a mesma duração, então manter o ponto de escuta exige `duration − currentTime`, não `currentTime`. Erro fácil e o sintoma é 'o botão não fez nada'.; LINT — `<audio>` em JSX dispara `lint/a11y/useMediaCaption` mesmo sem `controls` (VERIFIQUEI com o biome do repo: 2 erros em 2 elementos). Resolvido de graça criando o elemento com `new Audio()` no hook; se por algum motivo tiver de ir para JSX, `<track kind="captions" />` limpa (verificado, 0 erros). Não desligar a regra.; ÂNCORA FRACA NO ACERVO — 1 prova de áudio em 114 fichas, e backmasking com ZERO registro. Não escreva na Ajuda nem no commit que isto 'resolve' alguma prova conhecida: é capacidade nova para um canal que o acervo mostra existir (Morse por som), não solução de caso registrado.

### Ultrassom e infrassom: diagnóstico honesto da faixa (energia por banda + ponto de corte do codec) e deslocamento heterodino da faixa alta para a audível

**Resolve:** Quatro coisas concretas, em ordem de frequência real de uso.

(1) A PROVA NEGATIVA, que é a mais comum e a que mais economiza tempo: dizer em dois segundos "este arquivo tem corte em 15,8 kHz — foi comprimido, não existe nada acima disso para achar" ou "isto veio pelo caminho de voz do WhatsApp: taxa de 16 kHz, Nyquist de 8 kHz, metade do espectro nem existe". Fecha uma linha inteira de investigação sem ninguém passar meia hora olhando o topo do espectrograma.

(2) A GUARDA CONTRA A PRÓPRIA BANCADA MENTIR. Medido no mapeamento: um arquivo de 96 kHz com tom de 30 kHz decodificado num contexto de 48 kHz perde 54 dB (RMS 0,3535 → 0,0007) sem erro nenhum, e o espectrograma mostra uma faixa vazia com toda a cara de estar certa. Sem esta técnica a aba Áudio afirma "não há nada acima de 24 kHz" quando na verdade ela própria apagou. Isto não é conveniência, é correção.

(3) A prova em que o organizador distribui WAV/FLAC de 44,1 ou 48 kHz e gravou Morse, DTMF ou um desenho entre 16 e 22 kHz — inaudível para o adulto que confere, presente no arquivo. O time toca, ouve "só música", desiste. Com a tabela de faixas o achado é imediato.

(4) OUVIR a faixa alta com o TEMPO preservado: um Morse a 19 kHz reaparece a 4 kHz (medido: pico em 3996 Hz, resíduo do audível em −128 dB contra −53 dB antes). Dá para bater o ritmo e conferir a transcrição de ouvido — coisa que o espectrograma não faz.

O que ela NÃO destrava: nada em infrassom. Ver o algoritmo, passo 6 — mensagem em infrassom não existe fisicamente neste formato de arquivo.

**Algoritmo:** Tudo em cima da MESMA STFT que o espectrograma já vai calcular (N=4096, hop=1024, Hann; a 48 kHz isso dá 11,72 Hz/bin e 21,3 ms/quadro, janela de 85,3 ms, sobreposição 75%). FFT: reaproveitar a do espectrograma (fft.js, 2.778 B gz, atrás de import() dinâmico). Goertzel NÃO serve aqui — ele avalia frequências CONHECIDAS e o ponto do ultrassom é não saber onde está. O deslocamento não usa FFT nenhuma.

PASSO 0 — decodificar sem mentir. Copiar os bytes ANTES (`bytes.slice(0)`, o decodeAudioData destrói o ArrayBuffer). Parsear a taxa do container quando der (WAV: uint32 LE no offset 24). Decodificar em `OfflineAudioContext(canais, 1, alvo)` com alvo = clamp(taxaDoArquivo, 48000, 96000). Se não der para parsear: decodificar a 48000 e oferecer "varredura profunda" que redecodifica a 96000 a partir da cópia guardada e compara a energia acima de 24 kHz. REGRA DURA: nenhuma afirmação sobre a faixa alta sem exibir em que taxa se decodificou.

PASSO 1 — tabela de faixas, por canal (L, R e L−R). Somar potência por faixa: infra 0–20 Hz · grave 20–300 · fala 300–3400 · brilho 3,4k–15k · alta 15k–20k · ultra 20k–Nyquist. Exibir em dB relativo à faixa de fala, em font-mono. Custo MEDIDO: 12 ms para 8 s mono (a STFT em si foi 30 ms) — 29% do total, não justifica Worker próprio, mas herda o Worker da STFT.

PASSO 2 — ponto de corte do codec. Espectro médio de longo prazo; referência = mediana dos bins de 300–3000 Hz; corte = maior frequência cujo nível médio ainda está a menos de 40 dB abaixo da referência. Se corte < 0,9 × Nyquist, declarar "arquivo com corte em X kHz (compressão com perda)". Referências: MP3 128 kbps ≈ 16 kHz, MP3 320/LAME ≈ 20,5 kHz, AAC 128 ≈ 16–17 kHz, Opus ≈ 20 kHz. Validado na sonda: com lowpass aplicado o estimador acha o corte e os dois testes abaixo param de acusar.

PASSO 3 — TESTE A, contraste no TEMPO (pega mensagem intermitente: Morse, DTMF, desenho). Por bin da faixa alta: piso = percentil 20 no tempo (NÃO a mediana — com Morse de ciclo 62% a mediana JÁ É o tom e o teste morre; isso derrubou minha primeira versão). Bin "aceso" quando > piso + 12 dB. Exigir sequência contínua de pelo menos 2·N/hop quadros = 8 quadros = 171 ms.
O fator 2·N/hop é o achado central: com 75% de sobreposição quadros vizinhos NÃO são independentes. MEDIDO em três sorteios de ruído nulo, faixa 16–23,5 kHz (~238 mil células): exigir 4 quadros (85 ms = exatamente uma janela) deu 298, 304 e 304 bins falsos; exigir 8 quadros deu 0, 0 e 0. A raia de 240 ms do Morse gera sequência de 11 quadros, então passa com folga. Para pegar ponto de 60 ms ou dígito DTMF de 40 ms, usar N=1024/hop=256 (janela 21 ms, mínimo 43 ms) — a regra é sempre "≥ 2 janelas", nunca um número fixo de quadros.

PASSO 4 — TESTE B, contraste em FREQUÊNCIA (pega portadora contínua, que o teste A não vê). Nível médio no tempo do bin contra a mediana da vizinhança de ±1 kHz excluindo ±3 bins; acusa com +15 dB. MEDIDO: 0 falsos no nulo e no chiado largo em ultrassom; num arquivo limpo (piso do bin a 19 kHz = −136 dB) pega tom a −100 dBFS com +18 dB de contraste. OBRIGATÓRIO agrupar bins vizinhos num achado só: um tom com rampa de 5 ms acendeu 10 bins seguidos, e reportar "10 descobertas" seria mentira estatística.

PASSO 5 — deslocar para a faixa audível. Duas saídas.
(a) HETERODINO (preserva o tempo — é o que serve para Morse/DTMF): passa-alta em f0 (4 biquads RBJ Q=0,707 em cascata, 48 dB/oitava) → multiplicar por 2·cos(2π·f0·t) → passa-baixa em 7 kHz (4 biquads). Com f0 = 15 kHz a 48 kHz, a faixa 15–22 kHz cai em 0–7 kHz; a componente-soma vai a 30–37 kHz, volta por aliasing para 11–18 kHz e o passa-baixa a elimina. O passa-alta ANTES da mistura é obrigatório: sem ele a faixa 8–15 kHz dobra por cima da faixa de interesse. MEDIDO: tom de 19 kHz reaparece em 3996 Hz, resíduo do audível a −128 dB (era −53 dB por bin), 17 ms para 8 s mono.
(b) "FITA LENTA": mesmo Float32Array num AudioBuffer com sampleRate declarada dividida por 4 ou 8 — 19 kHz vira 2,4 kHz e o tempo estica junto. Uma linha, zero DSP; boa para desenho, ruim para ritmo.
Reportar SEMPRE a frequência ORIGINAL (o achado é 19 kHz, não 4 kHz).

PASSO 6 — INFRASSOM: não fazer análise espectral. Números: a N=4096/48 kHz a faixa 0–20 Hz cabe em 1 bin; resolver 1 Hz exigiria N=65536 (janela de 1365 ms) ou um caminho decimado próprio (÷512 → 93,75 Hz, N=256 → 0,366 Hz/bin, quadro de 2731 ms). E a 10 Hz um ponto de Morse de 60 ms não completa um ciclo. Entregar só duas leituras baratas no domínio do tempo: offset DC (média do canal) e energia abaixo de 20 Hz relativa ao total. Uma linha cada, sem promessa de "mensagem".

PASSO 7 — saída para a bancada. O que sai daqui é DIAGNÓSTICO, não candidato: cartão com faixa, frequência, nível em dB, duração da maior sequência e ciclo de trabalho, mais os botões "ouvir deslocado" e "espectrograma só desta faixa". Só quando o Morse/DTMF for de fato LIDO (do áudio deslocado) é que sai texto para o Decodificador, nos três formatos que o mapeamento mediu (colado · separado por espaço · agrupado por repetição). Jamais injetar candidato com forcedScore no fan-out a partir de uma detecção de energia.

**Riscos:** FALSO POSITIVO COM NOME PRÓPRIO: apito de TV de tubo (15.734 Hz NTSC / 15.625 Hz PAL), alarme antiaglomeração 'mosquito' de 17,4 kHz (a sonda acusou +15,7 dB — detecção CORRETA, mensagem NENHUMA), fontes chaveadas, marcas d'água de áudio e balizas ultrassônicas de 18–20 kHz. Todos passam no teste B. Mitigação obrigatória: o cartão mostra a evidência crua (frequência, dB, duração, ciclo) e nomeia os suspeitos conhecidos; a bancada nunca escreve 'há mensagem escondida', escreve 'há energia estreita e persistente em 17,4 kHz — pode ser alarme comercial'.; DITHER COM MODELAGEM DE RUÍDO põe uma prateleira de ruído subindo justamente entre 15 e 22 kHz, que é a faixa de interesse. É LARGA, então o teste B (contraste contra a vizinhança) rejeita — mas um teste de NÍVEL de faixa aceitaria e acusaria todo CD masterizado. Não trocar contraste por nível 'para simplificar'.; A PREMISSA MORRE NO TRANSPORTE, e isso é o mais provável de acontecer na prática: MP3 128 corta em ~16 kHz, AAC 128 em ~16–17 kHz; e áudio enviado pelo caminho de voz/áudio do WhatsApp é reconvertido no servidor para Opus a 16 kHz de TAXA (Nyquist de 8 kHz) — não sobra nada acima de 8 kHz. Se o arquivo da prova chegou assim, a técnica é inaplicável por construção. A ferramenta tem de DIZER isso, não mostrar faixa vazia.; 'INAUDÍVEL' É RELATIVO À IDADE: adolescente de gincana ouve até 17–19 kHz. Um 'ultrassom' a 17 kHz provavelmente já foi ouvido pela equipe antes de qualquer análise. E num arquivo de 44,1 kHz o teto absoluto é 22,05 kHz — a janela real de esconderijo é estreita (≈19–22 kHz), o que reduz o número de provas que isto destrava.; ARMADILHA DE REAMOSTRAGEM (a pior): decodificar num contexto de 48 kHz apaga silenciosamente tudo acima de 24 kHz (medido: −54 dB) e o espectrograma fica com cara de correto. Uma aba que desenha a faixa alta sem declarar a taxa de decodificação MENTE com aparência de rigor — pior do que não ter a feature, e diretamente contra o princípio de que o score parou de mentir.; OFF-BY-15000: depois do heterodino toda leitura está deslocada. Um detector de Morse/DTMF rodando no áudio deslocado precisa converter de volta antes de exibir, ou a bancada reporta 4 kHz onde o achado é 19 kHz.; A SOBREPOSIÇÃO DE 75% ENGANA A ESTATÍSTICA DE PERSISTÊNCIA: quatro quadros seguidos parecem 'sinal contínuo' e são UMA janela só. Medido: 298 bins falsos com run≥4 contra 0 com run≥8, no mesmo ruído. Qualquer regra de persistência tem de ser escrita em número de JANELAS (2·N/hop), nunca num número fixo de quadros — e tem de mudar junto quando o usuário mexer no N.; SAFARI/iOS NÃO TESTADO: OfflineAudioContext a 96 kHz, permissão de microfone e o limite de área de canvas (16.777.216 px, que falha em SILÊNCIO) são só documentação. Os tempos medidos são de desktop; celular é 3–5× mais lento, e a regra dos 375px vale para a tabela de faixas e para os controles do deslocamento.; MEMÓRIA DOBRA ao decodificar a 96 kHz (Float32 planar: ~21 MB por minuto de estéreo a 44,1 kHz vira ~46 MB/min). Só subir para 96 kHz quando a taxa do arquivo justificar, ou a 'varredura profunda' derruba a aba em arquivo longo.; RISCO DE ESCOPO: se esta técnica entrar antes do espectrograma e do transporte, vira uma tela que cospe números que o operador não pode conferir olhando nem ouvindo. Ela é um passageiro da aba Áudio, não um destino.

### Esteganografia em bits do WAV (LSB) e leitura de metadados/bytes crus (ID3, chunks RIFF)

**Resolve:** **Nenhuma prova real. Medido, não estimado.**

Varri o acervo inteiro do Itajaí Challenge em ~/Downloads (2017, 2018, 2022, 2023, 2025, CHALLENGE POCKET, PROVAS, Provas prontas REVISADAS): **97 arquivos de áudio, 593 MB, nove anos de evento.**

- Formatos: **78 mp3, 18 aac (ADTS cru), 1 m4a. ZERO wav, ZERO flac, ZERO aiff.**
- LSB exige PCM não comprimido. **Em 97 de 97 arquivos ela é estruturalmente impossível** — MP3/AAC não guardam amostras PCM, guardam coeficientes MDCT quantizados. Não é "difícil": não existe onde plantar o bit.
- Metadados: 68/97 têm ID3v2, e o conteúdo é 100% resíduo do transcodificador — TXXX x159 (major_brand M4A, minor_version 512), TSSE x53 (Lavf59.2 = ffmpeg), TYER/TDAT/TIME x14-15 (data de exportação), PRIV+XMP x14.
- **Texto humano em metadado: 2 frames, em 1 arquivo** (draft.mp3, TIT2/TALB = "The NFL Draft CHIME" — título residual do YouTube, mais uma capa APIC). **Pista plantada de propósito: 0 de 97.**
- Contêiner grudado (ZIP/PDF/JPEG): 119 assinaturas encontradas, **0 validam**. A única PK04 do acervo (E.mp3 @6174049) tem versao=20792, metodo=11164, sem EOCD — coincidência de bytes em stream comprimido.

Isto ecoa o que a própria casa já registrou: docs/QUEBRAR-PROVAS.md:523 ("EXIF da foto: nunca usado no acervo") e :667 ("sem OCR, sem EXIF, sem paleta, sem LSB"). É solução procurando um problema que este evento nunca teve.

**O que sobra e vale (~80 linhas, e NÃO é esta técnica):** ler o cabeçalho para saber a **taxa de amostragem REAL**. A Web Audio API não expõe isso (AudioBuffer.sampleRate já é a taxa do contexto) e decodeAudioData reamostra sempre. Parseei o frame header dos 78 MP3 reais em **32 ms, 0 falhas**: **62 são 44,1 kHz, 15 são 48 kHz, 1 é 22,05 kHz**. Num Mac com contexto de 48 kHz, **63 dos 78 seriam reamostrados em silêncio** antes de chegarem ao espectrograma. Esse leitor de cabeçalho é dependência da aba Áudio, não feature de esteganografia.

**Algoritmo:** Descrevo os dois caminhos com números medidos: o que eu REJEITO e o resíduo que eu MANTERIA dentro do passo de decodificação da aba Áudio.

## A) LSB — o algoritmo, e por que o descarto

1. bytes = await file.arrayBuffer(); paraDecodificar = bytes.slice(0). A cópia vem ANTES: decodeAudioData faz detach do ArrayBuffer de entrada (medido em outro mapa: 176.444 -> 0 bytes).
2. Confirmar RIFF/WAVE (bytes 0-3 "RIFF", 8-11 "WAVE"). Ler o chunk fmt: canais (offset fmt+2), sampleRate (fmt+4), bitsPorAmostra (fmt+14). Só 8/16/24/32-bit PCM ou float servem.
3. Localizar o chunk data e montar Int16Array sobre ele (respeitando o alinhamento LE).
4. Extrair os N bits menos significativos de cada amostra, empacotar de 8 em 8, e varrer corridas de ASCII imprimível (32..126).
5. A grade de hipóteses é o problema: canal (intercalado / L / R) x ordem de bit (MSB-first / LSB-first) x nº de LSBs (1, 2) x deslocamento de bit inicial (0..7) = **96 varreduras**. O deslocamento é obrigatório: se o payload começa no bit 3, só o offset 3 revela.

**Custo (medido, Node v26, este Mac):** extração de 30 s estéreo = **2,9 ms**. A grade de 96 hipóteses sobre 60 s estéreo = **1204 ms**. Capacidade a 1 LSB = 323 KB por 30 s estéreo.

**Falso positivo (medido, com a wordlist REAL do repo: 453.081 palavras de public/data/words-{pt,en}.txt).** Áudio limpo, sem mensagem nenhuma, grade de 96 hipóteses sobre 60 s estéreo, filtro = corrida imprimível + contém palavra real de 4+ letras:
- corrida >= 8: **118 falsos positivos** ("p7Z4BrAn" -> bran, "snOB|`O" -> snob, "iSoLo?U8" -> solo)
- corrida >= 10: **23 falsos positivos**
- corrida >= 12: **6 falsos positivos**
- corrida >= 16: **0 falsos positivos**

O único limiar honesto é **>= 16 caracteres imprimíveis contíguos + palavra real**, e ancorado no byte 0 (payload de script ingênuo começa no início: a chance de 16 imprimíveis por acaso é 0,371^16 ~ 4e-7). Ou seja: para não mentir, o gate tem de ser tão apertado que só pega o caso mais ingênuo possível — e é justamente o caso que nunca ocorreu.

**Por que nem o caso ingênuo compensa:** Steghide (o tool padrão para WAV) cifra com **Rijndael-128 CBC por padrão** e comprime; DeepSound usa AES-256. Payload cifrado é indistinguível de ruído no plano LSB — não há ASCII para achar. Só um script caseiro em Python `wave` deixa texto puro. E ele precisaria de um WAV, que o evento nunca produziu.

**Coup de grâce medido:** int16 -> float32 -> int16 é exato em **65536/65536 valores** (o LSB sobreviveria à decodificação), MAS reamostrar 44100 -> 48000 -> 44100 deixa o LSB correto em **51,1%** — cara ou coroa. Como decodeAudioData sempre reamostra para a taxa do contexto, é obrigatório ler o cabeçalho e abrir um OfflineAudioContext na taxa exata — ou seja, o LSB depende do leitor de cabeçalho, não o contrário.

## B) O resíduo que eu manteria: "cartão de identidade do arquivo" (~80 linhas)

Roda uma vez, no mesmo `decode.ts` que já vai existir para a aba Áudio, sobre a cópia dos bytes crus. Sem grade, sem heurística, sem score.

1. **Magic vs extensão.** "RIFF"+"WAVE" / "ID3" ou 0xFF 0xEx (MP3) / "ftyp" (MP4-M4A) / "fLaC" / "OggS" / "FORM"+"AIFF". Divergência entre magic e extensão é fato, não palpite — e é o único "achado" com zero falso positivo.
2. **Taxa real, canais, bits.** WAV: uint32 LE no offset do fmt+4. MP3: pular a tag ID3 (tamanho synchsafe nos bytes 6-9), varrer até 0xFF com (b1 & 0xE0) == 0xE0, ler versão (bits 3-4 de b1), índice de taxa (bits 2-3 de b2) na tabela [[11025,12000,8000],-,[22050,24000,16000],[44100,48000,32000]]. **Medido: 78/78 MP3 reais lidos em 32 ms, 0 falhas.** Este número alimenta o OfflineAudioContext do espectrograma.
3. **Chunks RIFF, quando for WAV.** Caminhar de 8 em 8 bytes a partir do offset 12, **parando no tamanho declarado no header (offset 4) e não no fim do buffer** — senão o parser lê o apêndice como chunk fantasma (aconteceu no meu teste: apareceu um chunk "GRUD" de 760.169.537 bytes). Emitir o texto de LIST/INFO (ICMT, INAM, IART) e de qualquer chunk desconhecido cujo conteúdo seja imprimível. **Medido: 0,052 ms para um WAV de 0,88 MB.**
4. **Sobra no fim.** tamanhoDoArquivo - (header.RIFF_size + 8). Se > 0, há dado grudado depois do fim declarado: emitir os bytes como texto se forem imprimíveis. Isto é aritmética exata, não heurística — no meu teste recuperou "GRUDADO-DEPOIS-DO-FIM: RUA HERCILIO LUZ 639" limpo.
5. **Tags ID3v2, só os frames de texto.** Frames T*, COMM, USLT. Encoding no primeiro byte (0=latin1, 1/2=UTF-16, 3=UTF-8); tamanho synchsafe em v2.4, uint32BE em v2.3 (a diferença importa: 15 dos arquivos reais são v2.3 e 1 é v2.4). **Filtrar o resíduo conhecido** (TSSE, TXXX com major_brand/minor_version/compatible_brands, TYER/TDAT/TIME/PRIV) — senão a UI cospe lixo de ffmpeg em todo arquivo e ensina a equipe a ignorar o painel.
6. **Assinatura de contêiner grudado — só com validação.** Varredura de PK04/%PDF/PNG/JPEG a 922 MB/s (medido nos 593 MB reais). Mas **nunca reportar a assinatura crua**: exigir versão <= 63, método em {0,8}, tamNome em 1..255, nome imprimível e EOCD presente. Sem essa validação são 119 achados falsos no acervo; com ela, 0.

Nada disso encadeia score. Tudo sai como fato em font-mono num cartão de inspeção, no molde do "perfil linha a linha" do whitespace-stego (forcedScore 0,4, notes "inspeção, não decodificação"). Um texto legítimo achado em tag/apêndice ganha botão "usar no Decodificador" via o handoff onDecodificador/entradaInicial que já existe.

**Riscos:** FALSO POSITIVO EM MASSA — o risco central, e é o pecado capital desta bancada. Medido com a wordlist real do repo sobre áudio limpo sem mensagem: a grade de 96 hipóteses produz 118 achados com palavra real a corrida >= 8, 23 a >= 10, 6 a >= 12. Cada um vem com cara de resultado ('snOB|`O' casa 'snob'). Só a >= 16 zera. Uma equipe às 2h da manhã persegue 'trog' por vinte minutos.; A GRADE É UM MOTOR DE MENTIRA — 3 canais x 2 ordens de bit x 2 profundidades x 8 deslocamentos = 96 varreduras sobre 323 KB cada. É teste de hipótese múltipla sem correção nenhuma. Reduzir a grade para matar o FP (só offset 0, só intercalado, só MSB-first) mata junto a capacidade de achar qualquer coisa que não seja o embedding mais ingênuo possível. Não há ajuste que resolva os dois lados.; O ACERVO NÃO TEM UM ÚNICO ARQUIVO ONDE A TÉCNICA POSSA RODAR — 97 áudios em 9 anos, 0 WAV. Construir isto é entregar um botão que nunca vai acender. Pior: acende com ruído, porque a tentação seguinte é rodar a busca no arquivo MP3 cru, onde o 'LSB' é bit de coeficiente comprimido e o resultado é aleatório por construção.; OS TOOLS REAIS CIFRAM POR PADRÃO — Steghide (o único tool clássico que aceita WAV) usa Rijndael-128 CBC por padrão, DeepSound usa AES-256. Se um organizador usar ferramenta de verdade, o payload é indistinguível de ruído e a busca por ASCII não acha nada. A técnica só funciona contra um script caseiro sem cifra — um cenário que exige simultaneamente WAV (nunca aconteceu) e ingenuidade técnica.; DETACH SILENCIOSO DO ArrayBuffer — decodeAudioData faz detach do buffer de entrada (176.444 -> 0 bytes, medido). Quem chamar decodeAudioData e depois tentar ler os bytes crus recebe comprimento 0 sem nenhum erro: passa no TypeScript, passa no Biome, passa em teste que não olhe o dado. A defesa é convenção (slice(0) antes), e convenção quebra na segunda pessoa que mexer no arquivo.; A REAMOSTRAGEM APAGA O LSB EM SILÊNCIO — 44100 -> 48000 -> 44100 deixa o LSB correto em 51,1% (medido; acaso = 50%). Como decodeAudioData reamostra para a taxa do contexto (48 kHz neste Mac) e 62 dos 78 MP3 reais são 44,1 kHz, qualquer LSB lido a partir do AudioBuffer é ruído puro. Um implementador que use getChannelData em vez dos bytes crus produz uma feature que NUNCA funciona e nunca avisa.; ASSINATURA DE CONTÊINER SEM VALIDAÇÃO É PIOR QUE NADA — 119 hits de PK04/JPEG/RAR nos 593 MB reais, todos coincidência de bytes em stream comprimido. A única PK04 tem versão 20792 e método 11164. Sem a validação de campos + EOCD, o painel acusa 'arquivo escondido' em 1,2 arquivos por prova.; RUÍDO DE METADADO TREINA A EQUIPE A IGNORAR O PAINEL — 68/97 arquivos têm ID3, e o conteúdo é sempre TSSE 'Lavf59.2' e TXXX 'major_brand M4A'. Despejar isso cru faz o cartão de metadados parecer sempre cheio e sempre inútil. Sem uma lista de descarte do resíduo de ffmpeg/Adobe, o sinal (quando houver) some no meio.; O .aac NÃO TEM ONDE GUARDAR METADADO — 18 dos 97 arquivos são ADTS cru (magic FFF9). Não há contêiner, não há tag, não há chunk. O .m4a exige um parser de átomos MP4 (moov/udta/ilst), que é um segundo projeto. Prometer 'leitura de metadados' e falhar em 19/97 dos arquivos reais é ruim de UX.

### Sequências de tons e modulação digital por tons (binário por 2 tons, 2-FSK genérico, Bell 202/RTTY/Selcall só como rótulo)

**Resolve:** O que REALMENTE destrava, com evidência do acervo:

1) **Binário por dois tons alternados** — o caso simples, e o único desta família com lastro. `docs/QUEBRAR-PROVAS.md:753` cita a nota da própria CP em GIA-16: *"não é difícil identificar o binário; o objetivo da prova é a organização das informações"* — binário JÁ é vocabulário do acervo, e "tom grave = 0 / tom agudo = 1" é o que um gerador de tons online produz em cinco minutos. Hoje isso é 100% manual: não há como tirar bits de um .wav na bancada.

2) **A trilha de tons (quando, qual frequência, por quanto tempo)** — é o substrato compartilhado. GIA-09 (`QUEBRAR-PROVAS.md:251,828`) é uma prova de ÁUDIO cuja resposta é um telefone, com "ligada/ligação" plantado na faixa; ITC 2018 P18 tem morse num vídeo (`:746`). Morse-de-áudio, DTMF, "tons" e "faixas de frequência" da ferramenta antiga são TODOS leituras da mesma lista de eventos `{início, duração, frequência, dBFS, canal}`. Quem construir Morse ou DTMF vai construir isto de qualquer jeito — coordenem, ou sai em triplicata.

3) A ponte com o que já existe é curta e é o maior ganho: a saída é uma string de bits, e a bancada já tem `binary` (codecs.ts:52, exige múltiplo de 8), `baudot` (ITA2, exige múltiplo de 5) e `digit-regroup` (blocos 8/7/6/5/4 com portão de imprimíveis). Bits → botão "Decodificador" → o fan-out faz o resto. Nada de reimplementar leitura ASCII no painel de áudio.

O que NÃO destrava nada — e sou categórico: **Bell 202/AX.25/APRS, RTTY completo, Selcall ZVEI/CCIR, PSK31.** Varri o acervo (41 provas GIA + ITC): zero ocorrência. Nenhuma comissão de gincana gera um quadro AX.25 com NRZI, bit stuffing e CRC-16 — isso exige software de radioamador que ninguém do público-alvo tem. Implementar HDLC aqui é engenharia de rádio disfarçada de ferramenta de prova. O útil desses padrões é só o RÓTULO: medi 1200/2200 Hz a 1200 baud, mostro "compatível com Bell 202" — uma tabela de 40 linhas, meia hora de trabalho, e ajuda o usuário a nomear o que está vendo.

**Algoritmo:** Trabalhar na taxa do AudioBuffer (`sr`, tipicamente 48000); todas as constantes em segundos, convertidas por `sr`. Rodar em L, R, L−R e L+R (o pedido de estéreo do usuário), pulando L−R quando `max|L−R| < 1e-4` (canais iguais).

=== CAMINHO A — TRILHA DE TONS (eventos ≥ ~25 ms: binário lento, Morse, DTMF, selcall) ===

A1. STFT com N=1024 (21,33 ms; 46,875 Hz/bin a 48 kHz) e hop=128 (2,667 ms), janela Hann `0.5−0.5·cos(2πi/(N−1))`. Hop pequeno é obrigatório: um dígito DTMF de 40 ms só dá 3 quadros com o hop=512 do espectrograma. Potência por bin → dB (0 dB = fundo de escala).

A2. Piso de ruído POR BIN: mediana temporal de todos os quadros daquele bin. Um quadro tem "tom" no bin k se: (i) dB[k] ≥ piso[k] + 12 dB, E (ii) dB[k] ≥ mediana espectral do quadro + 10 dB. A condição (ii) é o que impede ruído branco de virar tom.

A3. Refino de frequência por interpolação parabólica em log-magnitude nos 3 bins do pico:
δ = 0,5·(a−c)/(a−2b+c), com a=dB[k−1], b=dB[k], c=dB[k+1]; f = (k+δ)·sr/N.
Isso leva o erro de ±23 Hz (meio bin) para ~±1 Hz num tom limpo — é o que permite distinguir 1060 Hz (ZVEI "1") de 1124 Hz (CCIR "1") e dizer "1200,3 Hz" em vez de "1172 Hz".

A4. Guarda de harmônico (anti-música): medir a energia em 2f e 3f. Aceitar o evento só se H2 ≤ −12 dB em relação a H1. Senoide pura e onda quadrada passam (a quadrada não tem harmônico par; H3 dela é −9,5 dB, por isso a guarda é no H2); voz, violão e a maioria dos instrumentos reprovam. Mostrar o valor medido, nunca filtrar em silêncio.

A5. Segmentação: agrupar quadros consecutivos cuja f refinada varie menos que `max(8 Hz; 1,5%·f)`. Histerese: fecha o evento após 3 quadros ruins (8 ms). Descartar eventos < 15 ms. Saída: `{ t0, dur, f, dbfs, canal }` + os silêncios entre eles.

A6. Classificação da trilha (contando frequências distintas, agrupadas a 2%):
- 1 frequência, durações BIMODAIS com razão 2,5–3,5 → Morse (a portadora não codifica; a duração sim).
- 2 frequências → binário OU Morse de dois tons. Desambiguar pelo coeficiente de variação das durações: CV < 0,15 → binário por símbolo; bimodal 1:3 → Morse. **Mostrar as duas leituras, não escolher sozinho.**
- pares SIMULTÂNEOS de 2 tons (linha 697–941 × coluna 1209–1633) → DTMF, é outra técnica.
- 3–16 frequências, duração fixa 40–150 ms → sequência tipo selcall: só rotular contra as tabelas, sem protocolo.

A7. **Relógio de símbolo — o passo que quase todo mundo erra.** T = mediana das durações. "Dois tons alternados" quase nunca alterna a cada bit: `1101` é tom₁(2T), tom₀(T), tom₁(T). Expandir cada evento de duração d em k = round(d/T) símbolos iguais, aceitando só se |d/T − k| ≤ 0,3 e k ≤ 8. Sem essa expansão o binário sai errado em silêncio — que é o pior modo de falha possível aqui.

A8. Saída: string de bits nas DUAS polaridades (qual tom é 1 é indecidível pelo sinal). Chips no estilo do `SaidaTexto` da Matriz: "bits crus" · "invertido" · "aparado para múltiplo de 8" (porque `decodeBinary` retorna `null` calado se `length % 8 !== 0`) · "grupos de 5". Mostrar SEMPRE a contagem de bits. Botão "Decodificador" com `chainValue` = os bits.

=== CAMINHO B — 2-FSK RÁPIDO (bit < 25 ms; o único caminho para Bell 202/RTTY) ===

B1. Achar o par de tons: espectro médio (Welch, N=4096, hop=2048) do arquivo inteiro; dois picos mais fortes. **Abortar** se estiverem a menos de 100 Hz um do outro ou se a razão de energia entre eles passar de 6 dB — não é 2-FSK, e dizer isso é melhor que inventar.

B2. Estimar o baud sem chutar: decisão contínua d(t) = |G_mark| − |G_space| com Goertzel curto de N=round(sr/4000) ≈ 12 amostras, hop 6. Histograma dos intervalos entre trocas de sinal de d(t); a moda do quartil inferior = período de bit T_b. baud = sr/T_b. Encaixar (snap) em {45,45 · 50 · 75 · 110 · 300 · 600 · 1200 · 2400} só com erro ≤ 2%; fora disso, mostrar o valor medido e não rotular.

B3. Fatiador: por bit, dois Goertzel de N = round(sr/baud) amostras nas duas frequências (a 1200 baud/48 kHz → N=40). Goertzel NÃO exige k inteiro — coeficiente 2·cos(2π·f/sr) com f real; a perda de scalloping é irrelevante numa decisão "qual dos dois é maior". Custo: ~2 operações por amostra.

B4. Recuperação de relógio por early-late gate: comparar |d| em ±T_b/4 do centro e corrigir a fase com ganho 0,05·erro por bit. Nada de PLL de verdade — arquivo sintético não tem deriva.

B5. Saída = mesma do A8. Se e só se o fluxo tiver framing 5 bits (start=0 + 5 dados LSB-first + stop=1) reconhecível em ≥ 8 grupos consecutivos, desenframar, INVERTER a ordem de cada grupo (a tabela de `baudot.ts` é MSB-first: "00011" = A) e oferecer os grupos limpos ao decoder `baudot` já existente. **Nunca** implementar NRZI, bit stuffing, flag 0x7E ou CRC-16-CCITT.

=== TABELA DE RÓTULOS (só reconhecimento, tolerância ±3% nas frequências E baud compatível) ===
DTMF 697/770/852/941 × 1209/1336/1477/1633 · Bell 202: 1200 mark / 2200 space, 1200 bps · Bell 103: 1070/1270 (originate) e 2025/2225 (answer), 300 bps · RTTY AFSK: 2125/2295 (shift 170 Hz), 45,45 baud; comercial 50 baud / shift 425 Hz · ZVEI-1 (tom 70 ms ±15): 0=2400, 1=1060, 2=1160, 3=1270, 4=1400, 5=1530, 6=1670, 7=1830, 8=2000, 9=2200, A=2800, B=810, C=970, D=885, E=2600 (repetição) · CCIR-1 (tom 100 ms ±10): 0=1981, 1=1124, 2=1197, 3=1275, 4=1358, 5=1446, 6=1540, 7=1640, 8=1747, 9=1860, A=2400, E=2110 (repetição).

=== CUSTO E WORKER ===
Caminho A com hop=128 e N=1024: extrapolando a medição do Mapa 2 (932 ms para 60 s estéreo com N=2048/hop=512), dá ~1,6 s para 60 s estéreo — **Worker obrigatório**, com progresso e cancelamento; num celular médio são 5–8 s. Caminho B é ~2 ops/amostra: dezenas de ms para 60 s, roda em qualquer lugar. Tudo é puro sobre `Float32Array`, sem DOM — testável no jsdom com sinais sintéticos gerados no próprio teste (`Math.sin` + ruído gaussiano com semente fixa), que é como se prova SNR de limiar sem arquivo binário no repo.

**Riscos:** FALSO POSITIVO CAPITAL — música vira 'sequência de tons'. Uma nota sustentada de violão, um sintetizador ou um assobio passam pelo detector de pico e viram eventos. Guardas obrigatórias e cumulativas: estabilidade de frequência (desvio < 1,5% ao longo do evento — vibrato e voz reprovam), H2 ≤ −12 dB em relação à fundamental, e conjunto pequeno e RECORRENTE de frequências distintas (≤ 16). Se qualquer uma falhar, reportar 'tons instáveis — provavelmente música' em vez de uma leitura.; FALSO POSITIVO CAPITAL — bits que viram texto por sorte. NÃO fazer varredura de deslocamento/polaridade/ordem-de-bit dentro do painel de áudio: 64 hipóteses sobre um fluxo aleatório produzem uma que parece texto. O painel emite os bits e as duas polaridades; quem decide é o motor, que já tem portão de imprimíveis (`digit-regroup`), scorer calibrado e o corte de 0,35 do `partition`. Se um card de áudio for ao fan-out, `forcedScore` tem de ACOMPANHAR a medição (SNR, número de eventos, aderência ao relógio) — `forcedScore` fixo alto promove lixo, e o repo já pagou essa conta no realce de palavra real.; Relógio de símbolo mal estimado corrompe TUDO em silêncio. Se T sair errado por um fator 2, os bits saem plausíveis e errados, e nenhum teste que não olhe o dado percebe. Mitigação: exigir que ≥ 90% dos eventos tenham |d/T − round(d/T)| ≤ 0,3, mostrar T medido e o histograma de durações na UI, e recusar a leitura binária abaixo desse índice de aderência.; Rótulo de protocolo induz caçada errada. Chamar 1200/2200 Hz de 'Bell 202' faz o usuário procurar AX.25 e queimar os 15 minutos que o acervo diz serem o gargalo. Só nomear com as DUAS frequências dentro de ±3% E o baud compatível; caso contrário, texto seco: 'dois tons: 1187 Hz e 2203 Hz, ~1200 símbolos/s'.; Snap de baud mentiroso. Encaixar 1180 em 1200 é honesto; encaixar 900 em 1200 não é. Limite duro de 2% e o valor medido sempre visível ao lado do rótulo.; Ambiguidade binário × Morse é estrutural, não é bug. Dois tons com durações 1:3 são Morse de dois tons; dois tons com durações iguais são binário. Mostrar as duas leituras rotuladas, nunca escolher em silêncio.; Codec com perda destrói a medida. MP3/AAC/Opus deslocam e borram tons, zeram bandas abaixo de ~−60 dBFS e cortam acima de ~16 kHz (MP3 128 kbps) ou ~20 kHz (Opus). Um selcall a 2800 Hz sobrevive; um tom de 17 kHz não. Avisar quando o container for com perda e a frequência estiver alta.; Áudio reamostrado escala TODAS as frequências pelo mesmo fator. Se as medidas forem consistentemente k× uma tabela conhecida (ex.: 1,05× o DTMF), sugerir 'o arquivo parece reamostrado em ~5%' em vez de declarar 'não bate com nada'.; Buraco na bancada a jusante: `decodeBinary` exige múltiplo de 8 e retorna null calado; `digit-regroup` recusa entradas 100% de bits (`if (/^[01]+$/...) return []`). Uma tira de 203 bits não tem NENHUM decoder que a leia. Ou o painel de áudio oferece o aparo explícito, ou a tira some sem explicação — e some justamente no caso real, porque demodulação raramente entrega múltiplo exato de 8.; Sobreposição de escopo com Morse e DTMF. A trilha de tons é o mesmo código para as três técnicas. Se três frentes a implementarem em paralelo, sai triplicada e divergente. Ou uma frente entrega `tone-track.ts` e as outras consomem, ou não se faz.; Risco de escopo puro: Bell 202/AX.25 completo (NRZI + bit stuffing + flag + CRC-16-CCITT) é ~250 linhas com zero prova conhecida que o exija; RTTY off-air exige AFC e tratamento de diddle. Ambos são fantasia neste contexto. Se aparecerem na PR, é escopo inflado — cortar.