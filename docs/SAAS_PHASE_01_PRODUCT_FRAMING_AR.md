# One Minute Strategy SaaS POC
## المرحلة 1: Product Framing (بدون المساس بالمنطق)

تاريخ الإعداد: 2026-03-02
آخر تحديث: 2026-03-02
الحالة: Approved v2
النطاق: نسخة SaaS المنفصلة فقط (`one-minute-strategy-saas-poc`)

---

## 1) هدف المرحلة
تحويل النسخة الحالية من شكل **POC وظيفي** إلى مسار واضح نحو **منتج SaaS احترافي** عبر:
- تعريف المنتج بدقة.
- تثبيت شخصية المستخدم الأساسية.
- توضيح رحلة الاستخدام من البداية للنهاية.
- تحديد مؤشرات نجاح يمكن قياسها.
- تثبيت حدود التطوير (ما الذي لن نغيره).

> هذه المرحلة توجيهية/هيكلية، ولا تغير منطق الاستراتيجية أو البيانات.

---

## 2) تعريف النظام المعتمد (System Definition)
### 2.1 System Purpose
`One Minute Strategy` منصة ثنائية الطبقة:
- `Decision Intelligence Engine`
- `Operational Execution Management System`

المنصة ليست أداة دعم قرار فقط، بل نظام تحكم كامل لدورة حياة مشاريع الفعاليات.

### 2.2 Target Domain
النظام يدعم كل أنواع الفعاليات والمؤتمرات والمعارض، بما فيها:
- فعاليات عامة مفتوحة
- مواسم موسمية
- مؤتمرات مدفوعة
- معارض تجارية
- مشاريع برعاية Sponsors
- فعاليات الجهات الحكومية
- تفعيلات القطاع الخاص
- فعاليات داخلية للشركات

ويجب أن يعمل عبر أحجام مختلفة:
- `Small`: تنفيذ سريع وتعقيد منخفض
- `Medium`: فرق منظمة ونطاق واضح
- `Large`: طبقات اعتماد متعددة، ميزانيات معقدة، موردون متعددون

### 2.3 Core Architecture
#### A) Decision Layer (Pre-Commitment)
**Input**
- Project brief
- Scope description
- Estimated budget
- Stakeholders
- Timeline

**Process**
- تحليل متعدد الزوايا (استراتيجي/مالي/تشغيلي/تسويقي/مخاطر)
- منطق حوار داخلي منظم
- إخراج قرار تنفيذي

**Output**
- قرار تنفيذي واضح
- ملخص مخاطر
- مؤشر جدوى مالية
- درجة مواءمة استراتيجية

#### B) Execution Layer (Post-Decision)
بعد الاعتماد، يحول النظام المشروع إلى هيكل تشغيلي عبر:
- `Scope Breakdown Engine`
- `Budget Structuring Module`
- `Progress Tracking System`
- `Risk Log Module`
- `Operational Dashboard`
- `Final Reporting Engine`

### 2.4 Lifecycle Coverage
النظام يغطي الدورة الكاملة:
1. استقبال موجز المشروع
2. التحليل الاستراتيجي
3. القرار التنفيذي
4. هيكلة النطاق
5. تخطيط الميزانية
6. مراقبة التنفيذ
7. التتبع المالي
8. قياس الأداء
9. الإقفال والتقرير النهائي

### 2.5 Identity Constraint
المنتج هو `Professional SaaS for executive event leaders`:
- ليس Chat tool
- ليس Note-taking app
- ليس Task manager بسيط
- هو نظام قيادة استراتيجي/تشغيلي منظم

---

## 3) المستخدمون المستهدفون (Personas)
### 3.1 المستخدم الأساسي
- مدير المشروع / مدير التشغيل.
- يحتاج قرار سريع، صورة مخاطر واضحة، وتقرير جاهز للعرض.

### 3.2 المستخدم الثانوي
- الإدارة التنفيذية (قارئ تقرير).
- لا يحتاج تفاصيل إدخال كاملة، يحتاج ملخص تنفيذي موثوق.

### 3.3 احتياجات كل فئة
- الأساسي: سرعة، وضوح، استمرارية جلسة، انتقال سهل بين المراحل.
- الثانوي: قراءة سريعة للقرار، المخاطر، التوصيات، الحالة.

---

## 4) رحلة المنتج الحالية (Core Flow)
1. Landing `/`
2. Sign in/up (`Clerk`)
3. Dashboard `/app`
4. Strategy `/app/strategy`
5. Reports `/app/reports`
6. Report details `/app/reports/[id]`

---

## 5) مؤشرات النجاح (KPIs)
- معدل إكمال الرحلة: من دخول `/app` إلى توليد تقرير.
- زمن الوصول لأول تقرير.
- عدد الزيارات لصفحة التقارير لكل مستخدم.
- نسبة التقارير التي تصل لحالة `معتمد`.

مستهدف مبدئي:
- 70% من المستخدمين المسجلين يكملون تحليلًا واحدًا على الأقل.
- أقل من 12 دقيقة للوصول لأول تقرير في أول جلسة.

---

## 6) حدود التطوير (Guardrails)
### 6.1 مسموح
- UI/UX
- Layout
- Navigation
- Empty states / loading states / copywriting
- تنظيم مسارات الواجهة داخل نسخة SaaS المنفصلة

### 6.2 ممنوع
- تعديل `strategy-workspace` logic (التحليل/القرارات/التخزين الأساسي)
- تغيير contracts الحالية للـ API
- أي تغيير على المشروع الأساسي خارج نسخة `saas-poc`

---

## 7) خطة التنفيذ القادمة
- المرحلة 2: IA + Navigation
- المرحلة 3: Design System Foundation
- المرحلة 4: Dashboard as Decision Cockpit
- المرحلة 5: Reports Workspace Pro
- المرحلة 6: Mobile/Tablet Polish
- المرحلة 7: QA + Accessibility + Release

---

## 8) مراجع تصميمية (Web References)
- https://linear.app/
- https://linear.app/now/how-we-redesigned-the-linear-ui
- https://vercel.com/changelog/dashboard-navigation-redesign-rollout
- https://m1.material.io/patterns/navigation.html
- https://m1.material.io/components/bottom-navigation.html
- https://contrastchecker.com/

---

## 9) حالة الاعتماد
تم اعتماد المرحلة 1 بناءً على `System Definition` المرسل منك، والانتقال الآن إلى المرحلة 2 (IA + Navigation).
