// Cria um checkout da InfinitePay para a inscrição na imersão.
// Chamado pelo site em POST /.netlify/functions/criar-checkout
// Corpo: { nome, email, telefone, metodo: "pix" | "cartao", quantidade? }

import { getStore } from "@netlify/blobs";

const API = "https://api.checkout.infinitepay.io/links";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function soDigitos(v) {
  return String(v || "").replace(/\D+/g, "");
}

function telefoneE164(v) {
  let d = soDigitos(v);
  if (d.startsWith("55") && d.length >= 12) return "+" + d;
  if (d.length === 10 || d.length === 11) return "+55" + d;
  return "";
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { erro: "Use POST." });

  const handle = process.env.INFINITEPAY_HANDLE;
  const siteUrl = (process.env.SITE_URL || "").replace(/\/+$/, "");
  const precoPix = parseInt(process.env.PRECO_PIX_CENTAVOS || "16900", 10);
  const precoCartao = parseInt(process.env.PRECO_CARTAO_CENTAVOS || "19900", 10);
  const descricao = process.env.DESCRICAO_ITEM || "Imersão Risen School · 28/11/2026";

  if (!handle || !siteUrl) {
    return json(500, { erro: "Configuração incompleta no servidor (INFINITEPAY_HANDLE ou SITE_URL)." });
  }

  let dados;
  try {
    dados = await req.json();
  } catch {
    return json(400, { erro: "Dados inválidos." });
  }

  const nome = String(dados.nome || "").trim().slice(0, 120);
  const email = String(dados.email || "").trim().toLowerCase().slice(0, 160);
  const telefone = telefoneE164(dados.telefone);
  const metodo = dados.metodo === "cartao" ? "cartao" : "pix";
  const quantidade = Math.min(Math.max(parseInt(dados.quantidade || "1", 10) || 1, 1), 10);

  if (nome.length < 3) return json(400, { erro: "Informe o nome completo." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { erro: "Informe um e-mail válido." });
  if (!telefone) return json(400, { erro: "Informe o WhatsApp com DDD." });

  const preco = metodo === "cartao" ? precoCartao : precoPix;
  const orderNsu = "risen-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

  const payload = {
    handle,
    order_nsu: orderNsu,
    redirect_url: siteUrl + "/obrigado.html",
    webhook_url: siteUrl + "/.netlify/functions/webhook-infinitepay",
    items: [
      {
        quantity: quantidade,
        price: preco,
        description: descricao + (metodo === "pix" ? " (Pix)" : " (Cartão)"),
      },
    ],
    customer: { name: nome, email, phone_number: telefone },
  };

  let resposta, corpo;
  try {
    resposta = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const texto = await resposta.text();
    try { corpo = JSON.parse(texto); } catch { corpo = { bruto: texto }; }
  } catch (e) {
    return json(502, { erro: "Não foi possível falar com a InfinitePay. Tente de novo em instantes." });
  }

  if (!resposta.ok) {
    console.error("InfinitePay /links", resposta.status, corpo);
    return json(502, { erro: "A InfinitePay recusou a criação do pagamento. Tente de novo ou fale com a gente no WhatsApp." });
  }

  // A documentação não mostra o nome do campo com o link; aceitamos os nomes mais comuns.
  const url =
    corpo.url || corpo.link || corpo.checkout_url || corpo.payment_url ||
    (corpo.data && (corpo.data.url || corpo.data.link || corpo.data.checkout_url)) || "";

  if (!url) {
    console.error("Resposta sem URL de checkout:", corpo);
    return json(502, { erro: "Pagamento criado, mas sem link de checkout. Fale com a gente no WhatsApp." });
  }

  // Guarda a inscrição como "pendente" até o webhook confirmar o pagamento.
  try {
    const store = getStore("inscricoes");
    await store.setJSON(orderNsu, {
      order_nsu: orderNsu,
      nome, email, telefone, metodo_escolhido: metodo,
      quantidade, valor_centavos: preco * quantidade,
      status: "pendente",
      criado_em: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Falha ao salvar inscrição pendente", e);
  }

  return json(200, { url, order_nsu: orderNsu });
};
