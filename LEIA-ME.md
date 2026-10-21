# Risen School · site com checkout InfinitePay

## O que tem nesta pasta

```
site/
  index.html          o site (botões de inscrição abrem o checkout)
  obrigado.html       página de volta depois do pagamento
  fundo-risen.mp4     vídeo de fundo do topo
  convite-risen.mp4   vídeo do popup
netlify/functions/
  criar-checkout.mjs        cria o pagamento na InfinitePay
  verificar-pagamento.mjs   confere se o pagamento foi aprovado
  webhook-infinitepay.mjs   recebe o aviso de pagamento aprovado
  inscritos.mjs             baixa a lista de inscritos em planilha (CSV)
netlify.toml   configuração do Netlify
package.json   dependência usada pelas funções
```

## Como funciona

1. A pessoa clica em qualquer botão de inscrição e abre a janela "Garanta sua vaga".
2. Ela preenche nome, e-mail e WhatsApp e escolhe **Pix (R$ 169)** ou **Cartão (10x de R$ 21, total R$ 210)**.
3. O site cria o pagamento na InfinitePay e leva a pessoa para a tela de pagamento.
4. Depois de pagar, ela volta para `obrigado.html`, que confirma o pagamento e mostra o comprovante.
5. A InfinitePay avisa o site (webhook) e a inscrição fica marcada como **pago** na lista de inscritos.

## Publicar (uma vez só)

O arrastar e soltar do Netlify **não publica funções**. Por isso o site passa a ser publicado pelo GitHub.

1. Crie uma conta no GitHub, se ainda não tiver, e um repositório novo, por exemplo `risen-school-site`.
2. Envie para ele **todo o conteúdo desta pasta**. No site do GitHub use "Add file", depois "Upload files", e arraste tudo, mantendo as pastas.
3. No Netlify, abra o site **risenschool**. Vá em **Site configuration**, depois **Build & deploy**, depois **Link repository**, e escolha o repositório.
   - Build command: deixe em branco.
   - Publish directory: `site` (já vem do `netlify.toml`).
4. Ainda no site, abra **Site configuration** e depois **Environment variables**, e crie estas variáveis:

| Variável | Valor |
|---|---|
| `INFINITEPAY_HANDLE` | sua InfiniteTag, **sem o $** |
| `SITE_URL` | `https://risenschool.netlify.app` |
| `PRECO_PIX_CENTAVOS` | `16900` |
| `PRECO_CARTAO_CENTAVOS` | `21000` |
| `ADMIN_TOKEN` | uma senha longa só sua, para baixar a lista de inscritos |

5. Volte em **Deploys** e clique em **Trigger deploy**.

Depois disso, toda alteração enviada ao GitHub publica o site sozinha.

## Testar antes de divulgar

1. Abra o site numa aba anônima e clique em **Quero me inscrever**.
2. Preencha com seus dados e escolha **Pix**. Você deve cair na tela de pagamento da InfinitePay.
3. Se possível, faça um pagamento real de teste. Para isso, coloque o `PRECO_PIX_CENTAVOS` em `100` (R$ 1,00), faça o deploy, pague e depois volte o valor.
4. Confira se você voltou para a página "Sua vaga está garantida".
5. Baixe a lista em `https://risenschool.netlify.app/.netlify/functions/inscritos?token=SUA_SENHA`.

## Lista de inscritos

- Todos: `/.netlify/functions/inscritos?token=SUA_SENHA`
- Só quem pagou: `/.netlify/functions/inscritos?token=SUA_SENHA&status=pago`

A planilha abre no Excel ou no Google Planilhas. A coluna **conferir** avisa quando alguém escolheu Pix (R$ 169) no site e pagou com cartão. A InfinitePay não permite travar a forma de pagamento.

## Pontos de atenção

- **Parcelamento:** o número máximo de parcelas e quem paga os juros do 10x são definidos no app da InfinitePay, não no site.
- **Primeira chamada:** a documentação pública da InfinitePay não mostra o formato exato da resposta. O código aceita os nomes mais comuns do campo com o link. Se aparecer "Pagamento criado, mas sem link de checkout", abra em Netlify **Logs**, depois **Functions**, depois `criar-checkout`, e envie o conteúdo para ajuste.
- **Mudar preço ou descrição:** basta alterar as variáveis de ambiente e fazer um novo deploy. A variável opcional `DESCRICAO_ITEM` muda o nome que aparece no pagamento.
