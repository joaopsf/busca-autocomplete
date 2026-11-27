# Busca

Resposta completa pro clássico “faça uma busca com autocomplete” de teste técnico e entrevista de front sênior: quem avalia deve reparar no **combobox acessível de verdade** (WAI-ARIA 1.2), na **ausência de race condition** mesmo com servidor que ignora o cancelamento e nos **testes com relógio controlado** que provam isso.

Feito em **React 19 + TypeScript + Vite**, buscando nos **5.571 municípios do IBGE**.

**[Ver funcionando](https://joaopsf.github.io/busca-autocomplete/)** · tem um painel “Simular” com rede lenta, respostas fora de ordem, erro e sem internet, e uma linha do tempo que mostra cada requisição sendo usada, cancelada ou descartada.

## O problema

Autocomplete parece simples: um `input`, um `fetch` no `onChange` e uma lista. Essa versão ingênua quebra de vários jeitos que só aparecem com rede real:

- **Resposta fora de ordem.** A pessoa digita “rio” e depois “rio branco”. Se a resposta de “rio” demorar mais, ela chega por último e a tela mostra o resultado errado. É o bug mais comum, e quase ninguém testa.
- **Requisição a cada tecla.** “belo horizonte” vira 14 requisições.
- **Teclado e leitor de tela esquecidos.** Lista de `div` clicável, foco pulando pra lista, nada anunciado.
- **Acento.** “sao” não acha “São Paulo”, ou acha mas o destaque sai torto.
- **Só existe o caminho feliz.** Sem estado de carregando, vazio, erro ou sem internet.

## O que dá pra fazer

- Buscar qualquer município sem se preocupar com acento, maiúscula, hífen ou apóstrofo (`embu guacu` acha `Embu-Guaçu`).
- Filtrar por estado com vírgula ou barra: `santa maria, rs`, `campo grande/ms`.
- Navegar só pelo teclado: setas (dão a volta), Home e End, Enter escolhe, Esc fecha e, de novo, limpa.
- Ver as buscas recentes ao focar o campo vazio.
- Simular rede lenta, fora de ordem, erro (30% ou sempre) e sem internet, e ajustar o debounce e a validade do cache.
- Acompanhar cada requisição na linha do tempo: tempo, se foi usada, cancelada, descartada ou servida pelo cache.

## Decisões técnicas

**A guarda contra race condition é do cliente, não do servidor** ([`busca/useBusca.ts`](src/busca/useBusca.ts)).
Toda consulta nova aborta a anterior com `AbortController`. Mas abortar não basta: um servidor (ou proxy, ou service worker) pode ignorar o cancelamento, e o `fetch` pode já ter recebido a resposta quando o abort acontece. Por isso, antes de usar qualquer resposta, o hook confere `signal.aborted` do controlador daquela requisição. Resposta de requisição cancelada nunca chega no estado, chegue antes ou depois da nova. O modo “Fora de ordem” do simulador existe pra provar isso: o servidor ignora o abort e responde as consultas curtas mais devagar.

**Estado mínimo, o resto é derivado.**
O hook guarda só duas coisas: a última busca que terminou (com sucesso ou erro) e a última resposta boa. “Carregando”, “ocioso”, “offline” e “veio do cache” são calculados no render a partir da consulta atual. Isso elimina o `setState` síncrono dentro de `useEffect` (que causa render em cascata) e uma classe inteira de bug de estado dessincronizado.

**Enquanto carrega, a lista anterior fica (apagada).**
Limpar a lista a cada tecla faz a interface piscar. A última resposta boa continua visível com opacidade menor e um indicador no campo, e o destaque usa a consulta *daquela* resposta, não a digitada agora.

**Debounce no hook, não no input.** O atraso é configurável (0 a 1000 ms no painel). Consulta que já está no cache volta na hora, sem esperar o debounce. “Tentar de novo” também pula o debounce.

**Cache em memória com validade e limite** ([`lib/cache.ts`](src/lib/cache.ts)).
`Map` com prazo por entrada e no máximo 100 consultas; reinserir na leitura transforma o `Map` num LRU simples. A chave do cache é a consulta normalizada (`sao` e `São` são a mesma busca). Erro nunca vai pro cache. Sem internet, o que já está no cache continua aparecendo.

**Combobox no padrão WAI-ARIA 1.2** ([`ui/Autocomplete.tsx`](src/ui/Autocomplete.tsx)).
- O foco nunca sai do campo. A opção ativa é indicada por `aria-activedescendant`, com `aria-selected` na opção e rolagem automática pra ela ficar visível.
- `role="combobox"`, `aria-expanded`, `aria-controls` e `aria-autocomplete="list"` no campo; `role="listbox"` e `role="option"` na lista.
- Uma região viva anuncia “8 de 367 resultados”, “Nenhum resultado”, “Erro na busca” ou “Sem conexão”. Ela fica calada enquanto carrega, senão o leitor de tela falaria “buscando” a cada tecla.
- **Home e End:** no padrão, eles movem o cursor no texto. Aqui eles vão pra primeira e última opção só quando a pessoa já está navegando na lista (com uma opção ativa). Sem opção ativa, continuam movendo o cursor. Assim ninguém perde o comportamento normal do campo de texto.
- Digitar desmarca a opção ativa, pra que o Enter não escolha um resultado da lista anterior.
- O `mousedown` na lista é cancelado, pra que o `blur` do campo não feche a lista antes do clique chegar na opção (bug clássico, principalmente no Safari).

**Componente genérico, hook separado.**
`Autocomplete<T>` não sabe o que é cidade: recebe itens, `chave`, `textoDoItem` e um `renderizarItem` opcional. `useBusca<R>` não sabe o que é API de cidades: recebe uma função `buscar(consulta, signal)`. Os dois servem pra buscar produto, pessoa ou CEP sem mudar uma linha.

**Destaque que ignora acento sem perder o acento** ([`lib/texto.ts`](src/lib/texto.ts)).
A comparação é feita no texto normalizado (NFD, sem marcas, minúsculo), mas o recorte é feito no original, com um mapa de posições. Por isso “sao” destaca “São” com o til, e “doe” destaca “D'Oe” em “Alta Floresta D'Oeste”.

**Ranking simples e previsível** ([`api/pesquisa.ts`](src/api/pesquisa.ts)).
Nome igual, depois começa com, depois alguma palavra começa com, depois contém. No empate, as 27 capitais sobem (quem digita “sao” quer São Paulo ou São Luís antes de São Benedito), e o resto fica em ordem alfabética.

**API simulada com contrato real** ([`api/cidades.ts`](src/api/cidades.ts)).
O app roda no GitHub Pages, sem back-end. A “API” devolve `{ consulta, total, itens }` como um `GET /cidades?q=` devolveria, respeita `AbortSignal`, tem latência sorteada, responde 503 quando mandada falhar e rejeita com `TypeError` quando “sem internet”, como o `fetch`. A lista do IBGE vira um pedaço separado do build e só é baixada na primeira busca.

## O que costuma dar errado em autocomplete

| Erro comum | Como aparece | O que este projeto faz |
| --- | --- | --- |
| Confiar na ordem de chegada | resultado de “rio” aparece com “rio branco” digitado | aborta a anterior e descarta resposta de requisição abortada |
| Só abortar, sem guarda | servidor que ignora o abort ainda sobrescreve | guarda por `signal.aborted` do lado do cliente |
| Debounce dentro do componente com `setTimeout` solto | busca dispara depois de desmontar | o timer e o abort ficam no cleanup do efeito |
| Esquecer o erro de requisição velha | aparece “erro” de uma consulta que nem está mais digitada | erro de requisição abortada também é descartado |
| Foco indo pra lista | leitor de tela se perde, digitar para de funcionar | foco fica no campo, `aria-activedescendant` aponta a opção |
| `blur` fechando antes do clique | clicar na opção não faz nada | `mousedown` cancelado no painel |
| Anunciar demais | leitor de tela fala a cada tecla | só anuncia a contagem quando chega resultado |
| Destaque com string normalizada | aparece “sao” em vez de “São” | recorta no texto original com mapa de posições |
| Lista pisca a cada tecla | interface nervosa | mantém a última lista boa enquanto carrega |
| Cache sem validade nem limite | dado velho para sempre, memória crescendo | TTL por entrada e LRU com teto |

## Estrutura

```
src/
  busca/useBusca.ts        hook: debounce, abort, guarda de ordem, cache, offline
  ui/
    Autocomplete.tsx       combobox genérico <T> (WAI-ARIA 1.2)
    Destaque.tsx           <mark> no trecho que bateu
    LinhaDoTempo.tsx       requisições: usada, cancelada, descartada, cache
    PainelSimular.tsx      controla a API falsa e os ajustes do hook
  api/
    pesquisa.ts            índice e ranking (puro)
    cidades.ts             API simulada: latência, falha, AbortSignal
    simulacao.ts           estado do painel Simular
  lib/
    texto.ts               normalização e destaque sem acento
    cache.ts               cache com TTL e LRU
    recentes.ts            buscas recentes no aparelho
  dados/municipios.json    5.571 municípios do IBGE
scripts/gerar-municipios.mjs   gera o JSON a partir da API do IBGE
```

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5191
npm test           # testes
npm run typecheck  # tipos
npm run lint       # oxlint, falha com qualquer aviso
npm run build && npm run preview
```

Node 24 ou mais novo.

## Testes

Vitest + Testing Library. Os testes de tempo usam relógio falso (`vi.useFakeTimers`) e promessas controladas pelo teste, então não tem `sleep` nem teste instável:

- **debounce**: quatro teclas em 400 ms viram uma busca, só da última consulta, exatamente depois do atraso; abaixo do mínimo não busca; espaço sobrando não vira outra busca.
- **cancelamento e ordem**: consulta nova aborta a anterior na hora; resposta velha que chega depois da nova é descartada (servidor que ignora o abort); resposta velha que chega antes também; erro de requisição velha não vira erro na tela; desmontar cancela.
- **cache**: mesma consulta dentro da validade não vai pra rede e volta sem debounce; depois da validade busca de novo; erro não entra; “sao” e “São” são a mesma chave; LRU tira a menos usada.
- **estados**: vazio, erro com “tentar de novo” sem debounce, offline que usa o cache e volta sozinho quando a rede volta, rede caindo no meio cancela.
- **teclado e ARIA**: papéis e atributos, `aria-activedescendant` seguindo as setas, Home/End, Enter, Esc duas vezes, digitar desmarca, clique sem perder foco, anúncio “N resultados” e “N de total”, silêncio enquanto carrega, buscas recentes.
- **dados**: os 5.571 municípios com código de 7 dígitos, as 27 capitais, ranking e filtro por UF com a lista real.
- **tela inteira**: “sao jose dos campos” acha, destaca com acento e escolhe pelo teclado; sem internet não chama a API.

O CI (GitHub Actions) roda lint, tipos, testes e build a cada push e publica no GitHub Pages quando passa na `main`.

## Fonte dos dados

Lista de municípios da **API de Localidades do IBGE** (`https://servicodados.ibge.gov.br/api/v1/localidades/municipios`), baixada em 26/11/2026 e reduzida pra `[código IBGE, nome, UF]` (de 2,3 MB pra 168 KB, 55 KB com gzip). Pra atualizar: `npm run municipios`.

## O que muda num produto real

- Busca no servidor com índice de verdade (Postgres com `unaccent` e trigramas, ou Elasticsearch/Meilisearch), e o ranking ganharia população ou popularidade.
- `fetch` de verdade no `buscar`, com o mesmo `signal`. O hook não muda.
- Cache HTTP (`Cache-Control`, `ETag`) somado ao cache em memória.
- Em lista muito grande de opções, rolagem virtual na listbox.

## Autor

João Paulo da Silva Ferreira · [joaopaulo.omniahub.com.br](https://joaopaulo.omniahub.com.br) · [LinkedIn](https://www.linkedin.com/in/jo%C3%A3o-paulo-da-silva-ferreira-682aa423/)

Licença MIT.
