# Release 1 — Strategy Split UI
## Page Map (نسخة تنفيذية)

تاريخ: 2026-03-02  
الحالة: In Progress

---

## 1) الهدف
تفكيك مسار الاستراتيجية من شاشة واحدة إلى صفحات واضحة، مع إبقاء محرك التحليل الحالي كما هو.

---

## 2) المسارات
1. `/app/strategy`
   - مركز المسار (Strategy Command Center)
   - يعرض نظرة عامة للمراحل + بدء المسار

2. `/app/strategy/brief`
   - موجز المشروع المختصر

3. `/app/strategy/advisors`
   - تجهيز واختيار المستشارين

4. `/app/strategy/dialogue`
   - شرح جلسة التحليل + ربط للمحرك

5. `/app/strategy/workspace`
   - المحرك الحالي (بدون أي تعديل منطق)

6. `/app/strategy/decision`
   - القرار التنفيذي قبل التشغيل

7. `/app/strategy/execution/scope`
   - هيكلة النطاق إلى بنود

8. `/app/strategy/execution/budget`
   - ضبط الخطة المالية

9. `/app/strategy/execution/plan`
   - الخطة الزمنية والتبعيات

10. `/app/strategy/execution/risks`
   - سجل المخاطر والمعالجات

11. `/app/strategy/review`
   - المراجعة النهائية قبل التقارير

---

## 3) Layout موحد
1. يمين: Sidebar المراحل (Sticky) + نسبة التقدم.
2. وسط: Action Workspace (محتوى المرحلة).
3. جوال: نفس المراحل بشكل Stack قابل للنقر.

---

## 4) آلية الحالة داخل السايدبار
1. Active: المرحلة الحالية.
2. Complete: المراحل السابقة.
3. Upcoming: المراحل اللاحقة.

ملاحظة:
الحالة هنا UI Flow في Release 1، والربط بالتحقق الفعلي للبيانات يتم في Release 2.

---

## 5) معايير قبول Release 1
1. كل المسارات تعمل بدون أخطاء.
2. السايدبار يظهر في كل صفحات الاستراتيجية.
3. محرك التحليل الحالي متاح عبر `/app/strategy/workspace`.
4. لا تغيير في `strategy-workspace` logic.
5. نجاح `npm run lint` و`npm run build`.
