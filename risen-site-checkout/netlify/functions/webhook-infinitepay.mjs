// Recebe o aviso da InfinitePay quando um pagamento é aprovado.
// URL: /.netlify/functions/webhook-infinitepay (enviada como webhook_url ao criar o checkout)

import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });

  let evento;
  try {
    evento = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const orderNsu = evento.order_nsu;
  if (!orderNsu) return new Response("Sem order_nsu", { status: 400 });

  try {
    const store = getStore("inscricoes");
    const atual = (await store.get(orderNsu, { type: "json" })) || { order_nsu: orderNsu };

    // Pix escolhido no site (preço menor) mas pago com cartão: marca para conferência.
    const pagoComCartao = evento.capture_method === "credit_card";
    const divergente = atual.metodo_escolhido === "pix" && pagoComCartao;

    await store.setJSON(orderNsu, {
      ...atual,
      status: "pago",
      pago_em: new Date().toISOString(),
      metodo_pago: evento.capture_method || "",
      parcelas: evento.installments || 1,
      valor_pago_centavos: evento.paid_amount ?? evento.amount ?? null,
      transaction_nsu: evento.transaction_nsu || "",
      invoice_slug: evento.invoice_slug || "",
      comprovante: evento.receipt_url || "",
      conferir: divergente ? "Escolheu Pix no site e pagou no cartão" : "",
    });
  } catch (e) {
    console.error("Falha ao registrar pagamento", e);
    // 400 faz a InfinitePay tentar reenviar mais tarde.
    return new Response("Erro ao salvar", { status: 400 });
  }

  return new Response("OK", { status: 200 });
};
