---
name: update-help
description: Sincroniza a página de Ajuda do The Decrypter com os decoders e ferramentas reais. Use sempre que adicionar, remover ou renomear um decoder/aba, ou quando o usuário pedir para "atualizar a ajuda".
---

# Atualizar a página de Ajuda

A página de Ajuda (botão `?` no topbar) é alimentada por
`src/features/help/help-content.ts` (`HELP_INTRO` + `HELP_SECTIONS`). Este arquivo
é **curado à mão**, então precisa ser reconciliado com o sistema real sempre que
os decoders/ferramentas mudam. Esta skill faz essa reconciliação.

## Passo 1 — Levantar o que existe hoje

O registro de decoders vem de 4 fontes (ver `src/features/decoder/engine/registry.ts`):

```bash
# Decoders embutidos (factories): codecs, ciphers e lookups
grep -oE 'single\("[^"]+", *"[^"]+"' src/features/decoder/engine/codecs.ts | sed -E 's/.*, *"//;s/"$//'
grep -oE 'name: *"[^"]+"' src/features/decoder/engine/ciphers.ts | sed 's/name: *"//;s/"$//'
grep -oE 'name: *"[^"]+"' src/features/decoder/engine/lookups.ts | sed 's/name: *"//;s/"$//'

# Decoders auto-descobertos (1+ por arquivo)
grep -rhoE 'name: *"[^"]+"' src/features/decoder/engine/decoders/*.ts | grep -v '\.test\.' | sed 's/name: *"//;s/"$//' | sort -u

# Abas/ferramentas
grep -oE 'label: "[^"]+"' src/App.tsx
```

Cuidado: o grep em `decoders/*.ts` pode pegar falsos positivos de tabelas de
dados (campos `name:` em objetos como `CodeHit`/`ElementInfo`). Confirme abrindo
o arquivo se um nome parecer dado e não decoder.

## Passo 2 — Reconciliar `help-content.ts`

Também há uma seção **"APIs utilizadas"** (`id: "apis"`) em `HELP_SECTIONS`: liste
toda consulta externa que o app realmente faz. Fontes: `src/lib/brasilapi.ts`,
`src/lib/openfoodfacts.ts`, qualquer `fetch("https...")` em `src/lib/data.ts` e nos
cards (`*-card.tsx`). Ao adicionar/remover uma API, atualize essa seção.

Para cada decoder/ferramenta encontrado no Passo 1:

- **Faltando na ajuda** → adicione um `HelpEntry { name, desc, example? }` na
  seção certa de `HELP_SECTIONS` (codificações, cifras, transformações,
  localização, documentos, bases-blumenau, ferramentas). Escreva 1 frase de
  `desc` e, quando ajudar, um `example` curto `{ in, out }` realista e correto.
- **Na ajuda mas não existe mais** → remova a entrada.
- **Renomeado** → atualize o `name` (e o exemplo se mudou o comportamento).

Mantenha a `desc` curta e os exemplos verídicos (rode mentalmente ou teste no
`vite preview` quando tiver dúvida). Agrupe itens parecidos numa entrada só
quando fizer sentido (ex.: "Base45 / Base58 / Base85").

## Passo 3 — Verificar

```bash
export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node | tail -1)/bin:$PATH"
pnpm format && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

No `vite preview` (ou `pnpm dev`), abra o botão `?` e confira que cada seção
lista os itens novos com exemplos. Depois, commit/push como de costume.

## Observação

Se um dia o catálogo ficar grande demais para manter à mão, vale gerar parte do
`help-content.ts` a partir dos metadados dos decoders (id/name/category já
existem em cada `Decoder`); os exemplos e descrições continuariam curados. Por
ora, manter à mão com esta skill é suficiente.
