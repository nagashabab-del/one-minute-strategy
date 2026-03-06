# Release Gate Checklist

## الهدف
توثيق بوابة الجودة قبل النشر إلى production لضمان:
- عدم تمرير إصدار مكسور.
- وجود تحقق إلزامي على staging.
- وجود خطة rollback واضحة وسريعة.

## 1) Quality Gate (إلزامي)
يجب نجاح جميع الخطوات التالية في CI ضمن workflow:
- `npm run lint`
- `npm run build`
- `npm run e2e`

حالة القرار:
- إذا فشل أي بند: `NO-GO` (يمنع الدمج/الإطلاق).
- إذا نجحت كل البنود: الانتقال إلى فحص staging.

## 2) Staging Checklist (إلزامي قبل production)
البيئة:
- الرابط الثابت: `https://one-minute-strategy-saas-poc-staging.vercel.app`
- رابط preview للإصدار الحالي (Vercel deployment URL)

الفحوصات الدنيا:
1. الوصول عبر bypass محمي (عند تفعيل Deployment Protection):
   - التأكد من `HTTP 200` للرابطين (`staging` و`preview`) باستخدام:
   - `x-vercel-protection-bypass: <SECRET>`
2. التحقق الوظيفي السريع (Smoke):
   - فتح الصفحة الرئيسية.
   - التحقق من صفحات `sign-in` و`sign-up`.
   - الدخول لمسار `/app/reports` والتأكد من عدم وجود crash.
3. التحقق من Auth policy:
   - في production يجب منع مفاتيح Clerk التجريبية (`pk_test_` / `sk_test_`).
   - عند إعداد خاطئ للمفاتيح، يجب إرجاع `503` بدل سلوك غير واضح.

حالة القرار:
- أي فشل في البنود أعلاه: `NO-GO`.
- نجاح كامل: `GO` للإطلاق.

## 3) Rollback Plan
عند ظهور خلل بعد الإطلاق:
1. تحديد آخر deployment مستقر من Vercel.
2. إعادة توجيه alias/routing إلى آخر نسخة مستقرة (أو `promote` آخر build مستقر).
3. إعادة فحص سريع:
   - `HTTP 200` للمسارات الرئيسية.
   - فتح `/sign-in` و`/app/reports`.
4. توثيق سبب الحادث (RCA) وإنشاء إجراء منع تكرار.

الهدف الزمني:
- تنفيذ rollback خلال أقل من 10 دقائق من قرار التراجع.

## 4) سجل الدليل (Evidence)
يجب حفظ مخرجات الأدلة التالية لكل إصدار:
- نتائج `lint/build/e2e`.
- روابط deployment (`preview` + alias `staging`).
- نتائج `curl` (status codes) مع/بدون bypass حسب السياسة.

