// Confere na InfinitePay se o pagamento foi aprovado (usado pela página obrigado.html).
// POST /.netlify/functions/verificar-pagamento  corpo: { order_nsu, transaction_nsu, slug }

const API = "https://api.checkout.infinitepay.io/payment_check";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { erro: "Use POST." });

  const handle = process.env.INFINITEPAY_HANDLE;
  if (!handle) return json(500, { erro: "INFINITEPAY_HANDLE não configurado." });

  let d;
  try { d = await req.json(); } catch { return json(400, { erro: "Dados inválidos." }); }

  const order_nsu = String(d.order_nsu || "");
  const transaction_nsu = String(d.transaction_nsu || "");
  const slug = String(d.slug || "");
  if (!order_nsu || !transaction_nsu || !slug) return json(400, { erro: "Faltam dados do pagamento." });

  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ handle, order_nsu, transaction_nsu, slug }),
    });
    const corpo = await r.json().catch(() => ({}));
    return json(200, {
      pago: Boolean(corpo.paid),
      metodo: corpo.capture_method || "",
      parcelas: corpo.installments || 1,
      valor_pago_centavos: corpo.paid_amount ?? null,
    });
  } catch (e) {
    return json(502, { erro: "Não foi possível consultar o pagamento agora." });
  }
};
