# divideaí

![divideaí](icons/logo.svg)

App web para dividir a conta do restaurante com os amigos. Funciona no celular, sem cadastro, sem backend e sem dependências.

Endereço: **https://divideai.ctech.foo**.

## Funcionalidades

- **Pessoas**: adicione quem está na mesa (dá para colar vários nomes separados por vírgula).
- **Itens**: nome, quantidade e preço unitário (ex.: 10 × Massa de R$ 25,00). Todos podem ser editados direto na lista.
- **Dois modos de divisão**
  - **Igualmente**: o subtotal é dividido por igual entre todos.
  - **Pelo que cada um consumiu**: cada item pode ser
    - *Dividido entre* algumas pessoas (ex.: a torre só para quem bebeu), ou
    - *Por unidade*: quantas unidades cada pessoa consumiu (aceita frações, ex.: 0,5).
    - Unidades sem dono são divididas entre todos, e o app avisa.
- **Gorjeta**: ligada/desligada, percentual padrão (atalhos 0/10/12/15 %) e **gorjeta personalizada por pessoa**: cada um escolhe o seu %, e 0 é para quem não quer pagar gorjeta.
- **Centavos exatos**: os cálculos usam centavos inteiros com o método do maior resto, então a soma das partes sempre fecha com o total.
- **Compartilhar o resumo** em texto, com os itens da conta, os totais e o que cada pessoa consumiu:
  - **Compartilhar resumo**: menu nativo do sistema (Web Share API). Precisa de HTTPS e aparece onde o navegador suporta (Android, iOS, Safari/Edge/Chrome no desktop); fica escondido quando o app roda dentro de um iframe de outro site.
  - **Enviar no WhatsApp** e **Copiar**: funcionam em qualquer navegador.
- **Compartilhar como imagem**: gera um PNG com quanto cada um paga e os totais. Onde o navegador aceita arquivos (Android, iOS), abre o menu de compartilhar; nos outros, baixa a imagem.
- **PWA**: instalável na tela inicial e funciona offline (service worker em `sw.js`).
- **SEO**: descrição, prévia de link (Open Graph com `og-image.png`), dados estruturados, `robots.txt` e `sitemap.xml`.
- Os dados ficam só no navegador (`localStorage`, chave `divide.ai:v1`). A primeira visita abre com a conta vazia.

## Rodar localmente

```bash
npm start   # http://localhost:8080 (usa o Python 3: python3 -m http.server)
```

Abrir o `index.html` direto do disco também funciona, mas sem o modo offline e sem a instalação: o service worker só roda em `http://localhost` ou HTTPS.

## Testes

```bash
npm test    # node --test (Node 18 ou mais novo)
```

## Publicar no GitHub Pages (divideai.ctech.foo)

O workflow `.github/workflows/pages.yml` roda os testes em todo PR e, a cada push na `main`, publica só os arquivos públicos (a pasta `brand/` e os testes ficam de fora).

Configuração, feita uma vez:

1. **Settings → Pages** do repositório: *Source* em **GitHub Actions** e *Custom domain* `divideai.ctech.foo`.
2. **DNS do `ctech.foo`**: `CNAME divideai → cledsonmedeiros.github.io` (no Cloudflare, com o proxy desligado).
3. Quando o GitHub emitir o certificado, marque **Enforce HTTPS** em *Settings → Pages*. Domínios `.foo` só abrem em HTTPS, então o site só funciona a partir daí.
4. Opcional, recomendado: verifique o domínio `ctech.foo` em *Settings → Pages* da sua conta.

**A cada publicação**, se algum arquivo do app, da fonte ou dos ícones mudou, aumente a `VERSION` em `sw.js`. É ela que faz quem já usa o app receber os arquivos novos.

## Publicar na Vercel (alternativa)

É um site estático, sem etapa de build (`vercel.json` já configurado; `.vercelignore` tira `brand/`, `tests/` e este README):

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
2. Framework Preset: **Other**. Deixe build e output como estão.
3. Deploy. Ou pela CLI: `npx vercel --prod`.

## Marca

O arquivo-fonte é `brand/divideai.vectorcraft` (VectorCraft), com 4 pranchetas:

| Prancheta | Exporta para |
| --- | --- |
| `icon` (512×512, cantos arredondados) | `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, `favicon.ico` |
| `icon-maskable` (512×512, fundo inteiro) | `icons/maskable-192.png`, `icons/maskable-512.png`, `icons/apple-touch-icon.png` (180) |
| `logo` (horizontal) | `icons/logo.svg` (texto em curvas) |
| `og-image` (1200×630) | `og-image.png` |

- **Nome**: divideaí, sem ponto (lê-se "divide aí"). O "aí" vai na cor de destaque.
- **Paleta**: teal `#0f766e`, âmbar `#fbbf24`, tinta `#17201e`.
- **Tipografia**: Inter. O logo usa Inter Bold; no app, a Inter variável (`fonts/inter-latin-var.woff2`, só caracteres latinos), com tamanhos e pesos nos tokens `--fs-*` e `--fw-*` do `styles.css`.
- O `favicon.ico` sai do PNG: `convert icons/icon-512.png -define icon:auto-resize=48,32,16 favicon.ico`.

## Estrutura

```
index.html            # marcação, SEO e metadados do PWA
styles.css            # estilos (claro/escuro, mobile-first) e tokens de tipografia
src/calc.js           # lógica de divisão (pura, testável no Node)
src/app.js            # interface
src/share-image.js    # imagem (PNG) do resultado, desenhada em <canvas>
src/icons.js          # ícones SVG embutidos
src/pwa.js            # registro do service worker
sw.js                 # cache offline
manifest.webmanifest  # instalação do PWA
icons/                # ícones e logo exportados
fonts/                # Inter (woff2) + licença
brand/                # fonte da marca (VectorCraft), não vai para o deploy
tests/                # testes com node:test
```

## Créditos e licenças

- [Inter](https://rsms.me/inter/), fonte sob SIL Open Font License 1.1 (`fonts/Inter-LICENSE.txt`).
- [Lucide](https://lucide.dev), ícones de interface sob ISC; logo do WhatsApp do [Simple Icons](https://simpleicons.org), CC0 (`icons/LICENSES.md`). WhatsApp é marca da Meta.
