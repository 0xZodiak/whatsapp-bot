const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')

async function askClaude(userMessage, conversationHistory = []) {
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: process.env.BOT_SYSTEM_PROMPT || 'أنت مساعد خدمة عملاء محترف ومفيد. رد بشكل مختصر وواضح. إذا سألك العميل سؤالاً لا تعرف إجابته، اعتذر بأدب واقترح التواصل مع فريق الدعم.',
      messages
    })
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.content[0].text
}

// بنخزن تاريخ المحادثات في الميموري
const conversations = new Map()

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['WhatsApp Bot', 'Chrome', '1.0.0']
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed. Reconnecting:', shouldReconnect)
      if (shouldReconnect) connectToWhatsApp()
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    // تجاهل رسائل الجروبات لو مش عايزها
    const isGroup = msg.key.remoteJid.endsWith('@g.us')
    if (isGroup && process.env.IGNORE_GROUPS === 'true') return

    const text = msg.message.conversation ||
                 msg.message.extendedTextMessage?.text || ''

    if (!text) return

    const sender = msg.key.remoteJid
    console.log(`📩 Message from ${sender}: ${text}`)

    try {
      // جيب تاريخ المحادثة
      if (!conversations.has(sender)) conversations.set(sender, [])
      const history = conversations.get(sender)

      // بعت "جاري الكتابة..."
      await sock.sendPresenceUpdate('composing', sender)

      const reply = await askClaude(text, history)

      // حدّث تاريخ المحادثة (آخر 10 رسائل بس عشان متتقلش)
      history.push({ role: 'user', content: text })
      history.push({ role: 'assistant', content: reply })
      if (history.length > 20) history.splice(0, 2)

      await sock.sendMessage(sender, { text: reply })
      console.log(`✅ Replied to ${sender}`)
    } catch (err) {
      console.error('Error:', err.message)
      await sock.sendMessage(sender, { text: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' })
    }
  })
}

connectToWhatsApp()
