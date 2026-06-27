# WhatsApp AI Bot 🤖

بوت واتساب مدعوم بـ Claude AI لخدمة العملاء.

## خطوات التشغيل على Railway

1. **ارفع الملفات على GitHub**
2. **في Railway:** New Project → Deploy from GitHub → اختار الـ repo
3. **أضف Environment Variables:**
   - `ANTHROPIC_API_KEY` = مفتاح Claude API
   - `IGNORE_GROUPS` = true
4. **افتح Logs** وانتظر QR Code
5. **امسح QR** من واتساب → الأجهزة المتصلة

## ملاحظات
- البوت بيتذكر تاريخ كل محادثة (آخر 10 رسائل)
- لو الاتصال انقطع بيتوصل تلقائي
- غيّر `BOT_SYSTEM_PROMPT` عشان تخلي البوت يتكلم عن بيزنسك
