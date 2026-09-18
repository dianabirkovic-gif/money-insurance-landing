// api/lead.js — Serverless-функція (Vercel).
// Приймає заявку з форми та надсилає сповіщення у Telegram.
// Токен і chat_id зберігаються у змінних оточення (Environment Variables),
// тому в коді сайту вони НЕ світяться. Див. README.md.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const clean = (v, max) => (v == null ? '' : v.toString().trim().slice(0, max));
  const name    = clean(body.name, 100);
  const phone   = clean(body.phone, 40);
  const service = clean(body.service, 120);
  const cdate   = clean(body.cdate, 20);    // YYYY-MM-DD
  const ctime   = clean(body.ctime, 40);    // напр. "09:00 – 12:00"
  const comment = clean(body.comment, 1000);

  if (!name || !phone) {
    return res.status(400).json({ ok: false, error: 'Вкажіть імʼя і телефон' });
  }

  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  // Підпис джерела (щоб знати, з якого лендінгу заявка). Можна задати у Vercel.
  const source = process.env.LEAD_SOURCE || 'Накопичувальне страхування життя';

  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: 'Бекенд не налаштований' });
  }

  // Дата у форматі ДД.ММ.РРРР
  let dateStr = '';
  if (cdate) {
    const p = cdate.split('-');
    dateStr = p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : cdate;
  }
  const whenParts = [dateStr, ctime].filter(Boolean).join(' ');
  const sentAt = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

  // Складаємо повідомлення; необовʼязкові поля додаємо лише якщо заповнені
  const lines = [];
  lines.push(`⚡ Нова заявка на консультацію (${source}) ⚡`);
  lines.push('');
  lines.push(`👤 Імʼя: ${name}`);
  lines.push(`📞 Телефон: ${phone}`);
  if (service) lines.push(`🛠 Вибрана послуга: ${service}`);
  if (whenParts) lines.push(`📅 Зручний час для звʼязку: ${whenParts}`);
  if (comment) lines.push(`📝 Коментар: ${comment}`);
  lines.push('');
  lines.push(`🕒 Відправлено: ${sentAt}`);
  const text = lines.join('\n');

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const data = await tg.json();
    if (!data.ok) throw new Error(data.description || 'Telegram error');
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Send failed' });
  }
}
