// Lista de inscrições em CSV (abre no Excel / Google Planilhas).
// Acesso: https://SEU-SITE/.netlify/functions/inscritos?token=SEU_ADMIN_TOKEN
// Use &status=pago para ver só quem pagou.

import { getStore } from "@netlify/blobs";

const COLUNAS = [
  "status", "nome", "email", "telefone", "metodo_escolhido", "metodo_pago", "parcelas",
  "quantidade", "valor_centavos", "valor_pago_centavos", "conferir", "comprovante",
  "order_nsu", "transaction_nsu", "criado_em", "pago_em",
];

function celula(v) {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export default async (req) => {
  const url = new URL(req.url);
  const token = process.env.ADMIN_TOKEN;
  if (!token || url.searchParams.get("token") !== token) {
    return new Response("Acesso negado", { status: 401 });
  }
  const filtro = url.searchParams.get("status");

  const store = getStore("inscricoes");
  const { blobs } = await store.list();
  const linhas = [];
  for (const b of blobs) {
    const item = await store.get(b.key, { type: "json" });
    if (!item) continue;
    if (filtro && item.status !== filtro) continue;
    linhas.push(item);
  }
  linhas.sort((a, b) => String(a.criado_em).localeCompare(String(b.criado_em)));

  const csv = "﻿" + [COLUNAS.join(";")]
    .concat(linhas.map((l) => COLUNAS.map((c) => celula(l[c])).join(";")))
    .join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="inscritos-risen.csv"',
      "cache-control": "no-store",
    },
  });
};
