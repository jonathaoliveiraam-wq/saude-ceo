const Anthropic = require("@anthropic-ai/sdk");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { images, weight, previousWeight, date } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY não configurada no Vercel." });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content = [];

  if (images && images.length > 0) {
    for (const img of images) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      });
    }
  }

  const diff = previousWeight ? (weight - previousWeight).toFixed(1) : null;
  const weightLine = previousWeight
    ? `Peso atual: ${weight}kg | Anterior: ${previousWeight}kg | Variação: ${diff > 0 ? "+" : ""}${diff}kg`
    : `Peso atual: ${weight}kg (primeiro registro)`;

  content.push({
    type: "text",
    text: `Você é especialista em composição corporal e saúde. Analise o progresso do Jonatha Oliveira.

Data do registro: ${date}
${weightLine}
Meta: 120kg (peso inicial: 130kg)

${images && images.length > 0 ? "Analise as fotos e os dados de peso:" : "Analise os dados de peso (sem fotos desta vez):"}

Responda com este formato exato em Markdown:

## Composição Corporal
[Se houver fotos: o que está visível — gordura, massa muscular, retenção. Se não houver fotos: pule esta seção]

## Tendência de Peso
[Avalie a variação. É saudável? Está no caminho certo para a meta de 120kg?]

## O que está funcionando
[Pontos positivos claros e objetivos]

## Ajustes recomendados
[1-3 ações concretas para melhorar]

## Mensagem do coach
[Uma frase direta e motivadora para o Jonatha continuar]

Seja preciso, objetivo e motivador. Máximo 400 palavras no total.`,
  });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    });

    return res.status(200).json({ analysis: message.content[0].text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
