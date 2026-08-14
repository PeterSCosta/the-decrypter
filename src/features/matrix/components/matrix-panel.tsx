import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { CircleAlert, Eraser, Redo2, Sparkles, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { FUNCOES_REF, OPERADORES_REF } from "../expr";
import { FORMATOS, type MatrixFormat, ORDENS_LEITURA, type OrdemLeitura } from "../matrix";
import { ACOES, ESCOPOS, MAX_ESTADOS, MODOS, VARIAVEIS_REF } from "../rules";
import { ALFABETOS, type AlfabetoId, MAX_LADO_UI, MAX_RENDER, useMatrix } from "../use-matrix";
import { MatrixGrid, StatePalette } from "./matrix-grid";
import { BotaoPng, CartaoQr, Contagens, LeituraBlocos, SaidaTexto } from "./matrix-output";
import {
  Acordeao,
  CellSizeToggle,
  CropBox,
  DimensionControls,
  PaintModeToggle,
  TransformBar,
} from "./matrix-toolbar";
import { type AtalhoExpr, ReferenciaExpr, RuleEditor } from "./rule-editor";

/**
 * A aba Matriz. A pergunta que ela responde é "QUAIS células, e o que fazer com
 * elas" — seleção e pintura por regra. A pergunta vizinha, "em que ORDEM se lê
 * uma grade que já tem conteúdo", é do `grid-read` no Decodificador, e por isso
 * espiral, quatro braços e serpentina NÃO existem aqui: existe o botão que manda
 * a grade para lá.
 *
 * Ordem da tela = ordem do trabalho: origem → regras → destino → saída. No
 * estreito tudo empilha, e cada grade rola dentro do próprio invólucro.
 */

/** Condições prontas por escopo. Todas usam só o que o motor de fato oferece. */
const ATALHOS: Record<string, AtalhoExpr[]> = {
  elemento: [
    { rotulo: "vogal", expr: "vogal(v)", hint: "a célula é uma vogal" },
    { rotulo: "consoante", expr: "consoante(v)" },
    { rotulo: "dígito", expr: "digito(v)" },
    { rotulo: "vazia", expr: "vazio(v)" },
    { rotulo: "par", expr: "par(n)", hint: "o número da célula é par" },
    { rotulo: "n > 5", expr: "n > 5" },
    { rotulo: "acima da média", expr: "n > media(linha)" },
    { rotulo: "está na lista", expr: 'v em "A,E,I,O,U"' },
    { rotulo: "casa regex", expr: 'casa(v, "^[A-M]$")' },
    { rotulo: "linha par", expr: "par(r)" },
    { rotulo: "coluna múltipla de 3", expr: "resto(c, 3) = 0" },
    {
      rotulo: "igual à vizinha",
      expr: "v = viz(0, 1)",
      hint: "mesma coisa que a célula à direita",
    },
    { rotulo: "borda", expr: "r = 1 ou c = 1 ou r = nLinhas ou c = nCols" },
    { rotulo: "diagonal", expr: "r = c" },
    { rotulo: "já pintada", expr: "m > 0", hint: "o que uma regra anterior pintou" },
  ],
  linha: [
    { rotulo: "3+ vogais", expr: 'conta(linhaTxt, "[aeiou]") > 3' },
    { rotulo: "soma > 20", expr: "soma(linha) > 20" },
    { rotulo: "contém CAFE", expr: 'contem(v, "CAFE")', hint: "v é a linha inteira emendada" },
    { rotulo: "linha par", expr: "par(r)" },
  ],
  coluna: [
    { rotulo: "3+ vogais", expr: 'conta(colunaTxt, "[aeiou]") > 3' },
    { rotulo: "soma > 20", expr: "soma(coluna) > 20" },
    { rotulo: "coluna par", expr: "par(c)" },
  ],
  matriz: [{ rotulo: "sempre", expr: "" }],
};

function Secao({
  titulo,
  hint,
  acao,
  children,
}: {
  titulo: string;
  hint: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {/* O piso de largura é o que faz os controles caírem para a linha de
            baixo em 375px, em vez de espremerem o texto numa coluna de palavra. */}
        <div className="min-w-[15rem] flex-1">
          <h3 className="font-display text-sm uppercase tracking-wide text-[var(--text-secondary)]">
            {titulo}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{hint}</p>
        </div>
        {acao ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Interruptor({
  ligado,
  onLigado,
  rotulo,
  hint,
}: {
  ligado: boolean;
  onLigado: (v: boolean) => void;
  rotulo: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={ligado}
        onChange={(e) => onLigado(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-strong)]"
      />
      <span className="min-w-0">
        <span className="text-sm text-[var(--text-primary)]">{rotulo}</span>
        <span className="block text-xs text-[var(--text-secondary)]">{hint}</span>
      </span>
    </label>
  );
}

const select =
  "h-8 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

const numero =
  "h-8 w-14 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-2 text-center font-mono text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export interface MatrixPanelProps {
  /**
   * Manda um texto para a aba Decodificador. Quem liga a aba no `App.tsx` passa
   * isto; sem ele, os botões de "Decodificador" somem e sobra o copiar.
   */
  onDecodificador?: (texto: string) => void;
}

export function MatrixPanel({ onDecodificador }: MatrixPanelProps) {
  const m = useMatrix();
  const celulas = m.origem.rows * m.origem.cols;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="font-display text-xl text-[var(--text-primary)]">
          Matriz — pintar a grade por regra
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Uma grade N×M, uma <strong>regra por elemento, linha, coluna ou matriz</strong>, e o
          desenho que sai disso. É o mecanismo que devolve <strong>forma</strong> em vez de texto: a
          runa 3×5 que vira algarismo, o nonograma, a máscara que lê só as células certas. A ordem
          de leitura (espiral, quatro braços) é do Decodificador — daqui sai o botão para lá.
        </p>
      </div>

      {/* --------------------------------------------------------- exemplos */}
      <div className="flex flex-wrap gap-1.5">
        {m.exemplos.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => m.carregarExemplo(e.id)}
            title={e.descricao}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-strong)] hover:text-[var(--text-primary)]"
          >
            <Sparkles className="h-3 w-3 text-[var(--brand-strong)]" />
            {e.titulo}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------------- origem */}
      <Secao
        titulo="Origem — o conteúdo"
        hint={
          <>
            O que a prova entregou. As <strong>condições leem daqui</strong>. Cole do Excel, de uma
            tabela markdown ou contígua — o formato é detectado — ou digite célula a célula (clique
            e escreva; as setas andam pela grade).
          </>
        }
        acao={
          <>
            <CellSizeToggle size={m.tamanho} onSize={m.setTamanho} />
            <IconButton
              label="Desfazer"
              onClick={m.desfazer}
              disabled={!m.podeDesfazer}
              className="h-8 w-8 border border-[var(--border-subtle)] disabled:opacity-30"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              label="Refazer"
              onClick={m.refazer}
              disabled={!m.podeRefazer}
              className="h-8 w-8 border border-[var(--border-subtle)] disabled:opacity-30"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </IconButton>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <DimensionControls
            rows={m.origem.rows}
            cols={m.origem.cols}
            max={MAX_LADO_UI}
            onDim={m.setDim}
          />
          <TransformBar onTransform={m.transformar} />
        </div>

        {m.grande ? (
          <p className="flex items-start gap-1.5 text-xs text-[var(--color-pulse-700)]">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {celulas.toLocaleString("pt-BR")} células — acima de{" "}
            {MAX_RENDER.toLocaleString("pt-BR")} eu não desenho a grade (a tela travaria). As saídas
            em texto lá embaixo continuam valendo; recorte com a faixa para voltar a ver.
          </p>
        ) : (
          <MatrixGrid
            matrix={m.origem}
            size={m.tamanho}
            editable
            onEditCell={m.editarOrigem}
            cursor={m.cursorOrigem}
            onCursor={m.setCursorOrigem}
            ariaLabel="Matriz de origem"
          />
        )}

        <Acordeao titulo="Colar a matriz" hint="Excel, markdown, CSV, contígua">
          <Textarea
            value={m.colagem}
            onChange={(e) => m.setColagem(e.target.value)}
            placeholder={"Cole aqui…\nA B C\nD E F\nG H I"}
            aria-label="Matriz colada"
            className="min-h-[6rem]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={select}
              value={m.formatoColagem}
              aria-label="Formato da colagem"
              onChange={(e) => m.setFormatoColagem(e.target.value as MatrixFormat | "auto")}
            >
              <option value="auto">detectar sozinho</option>
              {FORMATOS.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={m.aplicarColagem} disabled={m.colagem.trim() === ""}>
              Montar a grade
            </Button>
          </div>
          {m.issues.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {m.issues.map((i) => (
                <li
                  key={`${i.linha}-${i.mensagem}`}
                  className="flex items-start gap-1.5 text-xs text-[var(--color-pulse-700)]"
                >
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {i.mensagem}
                </li>
              ))}
            </ul>
          ) : null}
        </Acordeao>

        <Acordeao titulo="Recortar" hint="isola um bloco dentro de uma grade maior">
          <CropBox
            valor={m.recorte}
            onValor={m.setRecorte}
            onRecortar={m.aplicarRecorte}
            erro={m.erroRecorte}
          />
        </Acordeao>
      </Secao>

      {/* ----------------------------------------------------------- regras */}
      <Secao
        titulo="Regras"
        hint={
          <>
            <strong>escopo × condição × ação</strong>, na ordem, cada uma ligável sem apagar. O
            número de células que a regra pegou aparece nela — é o que diz se a hipótese está viva
            antes de olhar o desenho.
          </>
        }
        acao={
          <select
            className={select}
            value={m.modo}
            aria-label="Como as regras se combinam"
            onChange={(e) => m.setModo(e.target.value as typeof m.modo)}
          >
            {MODOS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Interruptor
            ligado={m.limparAoRecalcular}
            onLigado={m.setLimparAoRecalcular}
            rotulo="Limpar o destino a cada recálculo"
            hint="Desligado, as regras se somam ao que já está pintado — é assim que se aplica regra em camadas por cima da pintura à mão."
          />
          <Interruptor
            ligado={m.espelharTexto}
            onLigado={m.setEspelharTexto}
            rotulo="Destino nasce com o texto da origem"
            hint="Deixa ver a letra por baixo da pintura. Desligado, o destino é só a máscara."
          />
        </div>

        <RuleEditor
          regras={m.regras}
          escopos={ESCOPOS.map((e) => ({ id: e.valor, label: e.rotulo, hint: e.ajuda }))}
          acoes={ACOES.map((a) => ({ id: a.valor, label: a.rotulo, hint: a.ajuda }))}
          atalhos={ATALHOS}
          estados={m.estados}
          rotulosEstado={m.rotulosEstado}
          onAdicionar={m.addRegra}
          onRemover={m.removerRegra}
          onMover={m.moverRegra}
          onAlterar={m.alterarRegra}
        />

        <Acordeao titulo="O que dá para escrever na condição">
          <ReferenciaExpr
            grupos={[
              { titulo: "Variáveis", itens: VARIAVEIS_REF },
              { titulo: "Operadores", itens: OPERADORES_REF },
              { titulo: "Funções", itens: FUNCOES_REF },
            ]}
          />
        </Acordeao>
      </Secao>

      {/* ---------------------------------------------------------- destino */}
      <Secao
        titulo="Destino — a pintura"
        hint={
          <>
            Onde as ações escrevem, e onde você pinta à mão. No celular use <strong>Pintar</strong>{" "}
            para arrastar pintando e <strong>Rolar</strong> para passar o dedo sem sujar a grade.
          </>
        }
        acao={
          <>
            <PaintModeToggle painting={m.pintando} onPainting={m.setPintando} />
            <Button variant="secondary" size="sm" onClick={m.limparPintura}>
              <Eraser className="h-3.5 w-3.5" />
              Limpar
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            Estados
            <input
              type="number"
              min={2}
              max={MAX_ESTADOS}
              value={m.estados}
              aria-label="Quantos estados de célula"
              className={numero}
              onChange={(e) =>
                m.setEstados(Math.max(2, Math.min(MAX_ESTADOS, Number(e.target.value) || 2)))
              }
            />
          </label>
          {m.estados > 2 ? (
            <StatePalette
              count={m.estados}
              active={m.estadoAtivo}
              onActive={m.setEstadoAtivo}
              labels={m.rotulosEstado}
            />
          ) : null}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={m.mostrarTexto}
              onChange={(e) => m.setMostrarTexto(e.target.checked)}
              className="h-4 w-4 accent-[var(--brand-strong)]"
            />
            Mostrar as letras
          </label>
        </div>

        {m.avisoPintura ? (
          <p className="flex items-start gap-1.5 text-xs text-[var(--color-pulse-700)]">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {m.avisoPintura}
          </p>
        ) : null}

        {m.grande ? (
          <p className="text-xs text-[var(--text-muted)]">
            Grade grande demais para desenhar — veja as saídas em texto abaixo.
          </p>
        ) : (
          <MatrixGrid
            matrix={m.destino}
            size={m.tamanho}
            showText={m.mostrarTexto}
            paintable={m.pintando}
            activeState={m.estadoAtivo}
            onPaint={m.pintar}
            cursor={m.cursorDestino}
            onCursor={m.setCursorDestino}
            ariaLabel="Matriz de destino"
          />
        )}

        <Acordeao
          titulo="Pintar por lista de células"
          hint="A1/B1/C1/A2 · D1 F1 A12 M15 · uma lista por linha"
        >
          <Textarea
            value={m.listaCelulas}
            onChange={(e) => m.setListaCelulas(e.target.value)}
            placeholder={"A1/B1/C1/A2/C2/A3/B3/C3/A4/C4/A5/B5/C5\nA1/B1/C1/A2/C2/…"}
            aria-label="Lista de células a pintar"
            className="min-h-[5rem]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={m.aplicarListaCelulas}
              disabled={m.listaCelulas.trim() === ""}
            >
              Pintar a lista
            </Button>
            <span className="text-xs text-[var(--text-secondary)]">
              Separador livre. Cada linha vira um bloco, e os blocos ficam lado a lado — é assim que
              as 8 runas de 2019 saem de uma vez.
            </span>
          </div>
          {m.resumoLista ? (
            <p className="text-xs text-[var(--text-primary)]">{m.resumoLista}</p>
          ) : null}
        </Acordeao>
      </Secao>

      {/* ------------------------------------------------------------ saída */}
      <Secao
        titulo="Saída"
        hint={
          <>
            A aba é um <strong>elo</strong>, não o fim: o resultado vira CEP, vetor de contagens ou
            caminho de leitura. Tudo copiável.
          </>
        }
        acao={
          <select
            className={select}
            value={m.ordem}
            aria-label="Ordem de leitura"
            onChange={(e) => m.setOrdem(e.target.value as OrdemLeitura)}
          >
            {ORDENS_LEITURA.map((o) => (
              <option key={o.valor} value={o.valor}>
                ler {o.rotulo}
              </option>
            ))}
          </select>
        }
      >
        <SaidaTexto
          formatos={m.formatos}
          atual={m.saidaAtual}
          onAtual={m.setSaidaAtual}
          onDecodificador={onDecodificador}
        />

        <Card className="flex flex-col gap-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={select}
              value={m.alfabeto}
              aria-label="Alfabeto de bloco"
              onChange={(e) => m.escolherAlfabeto(e.target.value as AlfabetoId)}
            >
              {ALFABETOS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.rotulo}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              bloco
              <input
                type="number"
                min={1}
                value={m.blocoLinhas}
                aria-label="Linhas do bloco"
                className={numero}
                onChange={(e) => m.setBlocoLinhas(Math.max(1, Number(e.target.value) || 1))}
              />
              ×
              <input
                type="number"
                min={1}
                value={m.blocoColunas}
                aria-label="Colunas do bloco"
                className={numero}
                onChange={(e) => m.setBlocoColunas(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              folga
              <input
                type="number"
                min={0}
                value={m.blocoFolga}
                aria-label="Folga entre blocos"
                className={numero}
                onChange={(e) => m.setBlocoFolga(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {ALFABETOS.find((a) => a.valor === m.alfabeto)?.ajuda}
          </p>
        </Card>

        <LeituraBlocos leitura={m.leitura} onDecodificador={onDecodificador} />

        <Contagens
          linhas={m.contagens.linhas}
          colunas={m.contagens.colunas}
          pistasLinhas={m.contagens.pistasLinhas}
          pistasColunas={m.contagens.pistasColunas}
        />

        <CartaoQr
          diagnostico={m.diagnostico}
          resultado={m.qrResultado}
          carregando={m.qrCarregando}
          onLer={m.lerQr}
          onDecodificador={onDecodificador}
        />

        <BotaoPng onBaixar={m.salvarPng} aviso={m.avisoPng} />
      </Secao>
    </div>
  );
}
