/**
 * Entregar um blob como arquivo salvo.
 *
 * Devolve `false` quando o navegador não deixou — o mesmo contrato de
 * `baixarPng` (`features/matrix/render.ts`), para que a UI possa AVISAR em vez
 * de fingir que baixou. O `try` não é decorativo: `createObjectURL` lança em
 * WebView antiga e sob restrição de armazenamento, e uma exceção crua subindo
 * de um `onClick` não vira mensagem nenhuma na tela.
 *
 * (O mesmo bloco está copiado à mão em quatro painéis — arquivo, áudio, vídeo.
 * Migrá-los é limpeza separada, não a deste botão.)
 */
export function baixarArquivo(blob: Blob, nome: string): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return false;
  let url: string | null = null;
  try {
    url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  } finally {
    // O `revoke` vai no `finally` porque o `click` é síncrono: quando ele
    // retorna, o navegador já leu o blob. Deixar a URL viva segura o arquivo
    // inteiro na memória da aba até a navegação seguinte.
    if (url) URL.revokeObjectURL(url);
  }
}
