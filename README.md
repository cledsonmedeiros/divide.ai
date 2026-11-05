# divide.ai

App web para dividir a conta do restaurante com os amigos. Funciona no celular, sem cadastro, sem backend e sem dependências.

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
- **Compartilhar** o resumo pelo menu nativo do celular (Web Share API), **Enviar no WhatsApp** ou **Copiar**. O resumo traz os itens da conta, os totais e o que cada pessoa consumiu.
- Os dados ficam salvos no navegador (`localStorage`).
- Botão **Exemplo** carrega uma conta real (R$ 424,00 + 10 %).

## Como usar

Abra o `index.html` no navegador. Ou sirva localmente:

```bash
npm start   # http://localhost:8080
```

## Publicar no GitHub Pages (divideai.ctech.foo)

O workflow `.github/workflows/pages.yml` roda os testes em todo PR e publica o site a cada push na `main`.

1. **DNS do `ctech.foo`**: crie `CNAME divideai → cledsonmedeiros.github.io` (no Cloudflare, com o proxy desligado).
2. **Settings → Pages** do repositório: em *Source* escolha **GitHub Actions**; em *Custom domain* informe `divideai.ctech.foo`; depois que o certificado sair, marque **Enforce HTTPS**.
3. Opcional, recomendado: verifique o domínio `ctech.foo` em *Settings → Pages* da sua conta.

Domínios `.foo` só abrem em HTTPS, então o site só funciona depois que o GitHub emitir o certificado.

## Publicar na Vercel

É um site estático, sem etapa de build (`vercel.json` já configurado):

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
2. Framework Preset: **Other**. Deixe build e output como estão.
3. Deploy.

Ou pela CLI: `npx vercel --prod`.

O botão **Compartilhar** usa o menu nativo do sistema e precisa de HTTPS (a Vercel já serve assim). Ele aparece onde o navegador suporta (Android, iOS, Safari/Edge/Chrome desktop) e fica escondido quando o app roda dentro de um iframe de outro site.

## Testes

```bash
npm test
```

## Estrutura

```
index.html       # marcação
styles.css       # estilos (claro/escuro, mobile-first)
src/calc.js      # lógica de divisão (pura, testável no Node)
src/app.js       # interface
tests/           # testes com node:test
```
