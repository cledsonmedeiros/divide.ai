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
- **Compartilhar/Copiar** o resumo (ex.: para o WhatsApp).
- Os dados ficam salvos no navegador (`localStorage`).
- Botão **Exemplo** carrega uma conta real (R$ 424,00 + 10 %).

## Como usar

Abra o `index.html` no navegador. Ou sirva localmente:

```bash
npm start   # http://localhost:8080
```

Para publicar, qualquer hospedagem estática serve (GitHub Pages, Netlify, Vercel…).

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
