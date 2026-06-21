# أكك لايف — تطبيق أندرويد (Expo)

تطبيق يغلّف موقع الحاسبة المنشور (`baloot-tv-app.vercel.app`) داخل WebView،
فكل المزايا (الحاسبة، البطولات، النشرة، البث) تشتغل كما هي على الويب.

## المتطلبات
- Node.js 18+
- حساب مجاني على https://expo.dev
- (للبناء السحابي) لا تحتاج Android Studio — EAS يبني في السحابة

## ١) تجهيز الأيقونات
ضع داخل `mobile/assets/`:
- `icon.png` — مربّعة 1024×1024 (تقدر تستخدم `public/icon-512x512.png` بعد تكبيرها)
- `splash.png` — شعار على خلفية داكنة (مثلاً 1242×2436 أو أي مقاس، resizeMode = contain)

## ٢) التثبيت
```bash
cd mobile
npm install
npx expo install --fix   # يضبط إصدارات الحزم تلقائياً مع SDK
```

## ٣) التجربة على جوالك (أثناء التطوير)
```bash
npx expo start
```
ثم افتح تطبيق **Expo Go** (من المتجر) وامسح رمز QR — بيفتح التطبيق فوراً.

## ٤) بناء ملف أندرويد عبر السحابة (EAS)
```bash
npm install -g eas-cli
eas login
eas build:configure          # أول مرة فقط
# APK للتجربة المباشرة على الجهاز:
eas build -p android --profile preview
# AAB للنشر على Google Play:
eas build -p android --profile production
```
بعد انتهاء البناء يعطيك رابط تحميل الملف.

## ٥) النشر على Google Play (اختياري)
```bash
eas submit -p android --profile production
```
(يتطلب حساب Google Play Developer — رسوم لمرة واحدة ٢٥$.)

## تعديلات سريعة
- رابط الموقع: غيّر `APP_URL` في `App.tsx`
- اسم التطبيق / المعرّف: في `app.json` (`name`, `android.package`)
- التحديثات: أي تعديل تنشره على Vercel يظهر فوراً في التطبيق (لأنه WebView) —
  بدون إعادة بناء، ما عدا تغييرات الغلاف الأصلية (الأيقونة/الاسم).
