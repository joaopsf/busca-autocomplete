// Ícones de traço que herdam a cor do texto. Ficam escondidos do leitor de tela:
// o nome do botão continua sendo o texto dele (ou o aria-label).
const desenhos = {
  lupa: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  semRede: (
    <>
      <path d="M3 3l18 18" />
      <path d="M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.5M14.8 10.4A10 10 0 0 1 19 12.9M2 9.4a15 15 0 0 1 4-2.6M11 5.1a15 15 0 0 1 11 4.3" />
      <path d="M12 20h.01" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 3.5L2.5 20h19z" />
      <path d="M12 10v4.5M12 17.5h.01" />
    </>
  ),
  recomecar: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
    </>
  ),
  lixeira: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
      <path d="M10.5 11v5.5M13.5 11v5.5" />
    </>
  ),
  ajuda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01" />
    </>
  ),
  concluir: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  pino: (
    <>
      <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
}

export type NomeIcone = keyof typeof desenhos

export function Icone({ nome }: { nome: NomeIcone }) {
  return (
    <svg
      className="ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {desenhos[nome]}
    </svg>
  )
}
