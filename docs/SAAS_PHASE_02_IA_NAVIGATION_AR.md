# One Minute Strategy SaaS POC
## المرحلة 2: IA + Navigation Blueprint

تاريخ الإعداد: 2026-03-02
الحالة: Proposed v1
النطاق: UI/UX فقط (بدون مساس بالمنطق)

---

## 1) هدف المرحلة
بناء هيكل تنقل احترافي يعكس هوية المنتج كنظام قيادة استراتيجي/تشغيلي، مع المحافظة على منطق الاستراتيجية الحالي كما هو.

---

## 2) الهيكل المعلوماتي المقترح (Information Architecture)

### 2.1 المستوى الأعلى (Top-Level)
- `نظرة عامة` (`/app`)
- `سير العمل` (`/app/workflows`)
- `الاستراتيجية` (`/app/strategy`)
- `التقارير` (`/app/reports`)
- `الإعدادات` (`/app/settings`)

> في هذه المرحلة سنُبقي التفعيل الوظيفي الكامل على: `نظرة عامة + الاستراتيجية + التقارير`، ونضيف الصفحات الجديدة كـ shell احترافي تدريجيًا.

### 2.2 Tabs داخل `نظرة عامة`
- `ملخص القرار`
- `الصحة التشغيلية`
- `المؤشرات`
- `آخر النشاط`

### 2.3 `سير العمل` (واجهة تنسيقية)
- `Draft` (المدخلات)
- `In Analysis` (قيد التحليل)
- `Ready for Review` (جاهز للمراجعة)
- `Approved` (معتمد)

---

## 3) User Flows الأساسية

### Flow A: First-time user
1. Landing
2. Sign-up
3. نظرة عامة (Empty State موجه)
4. بدء تحليل جديد
5. الوصول لأول تقرير

### Flow B: Returning user
1. Sign-in
2. نظرة عامة
3. متابعة مشروع
4. مراجعة التقرير

### Flow C: Executive reader
1. Sign-in
2. التقارير
3. صفحة تفاصيل التقرير
4. تصدير/مشاركة

---

## 4) قواعد التنقل (Navigation Rules)
- يجب أن يكون الوصول إلى `بدء تحليل جديد` متاحًا دائمًا.
- يجب أن يعرف المستخدم دائمًا: المشروع الحالي + المرحلة + آخر تحديث.
- في الجوال: `Bottom navigation` للصفحات الرئيسية.
- في الديسكتوب: `Sidebar` ثابت + `Context bar` علوي.

---

## 5) خطة تطبيق المرحلة 2 على النسخة الحالية

### 5.1 تحسين `App Shell`
- إعادة ترتيب الـSidebar حسب الهيكل الجديد.
- إضافة `Context Header` (المشروع الحالي، تاريخ التحديث، زر إجراء سريع).

### 5.2 إضافة صفحات هيكلية بدون منطق جديد
- `/app/workflows`
- `/app/settings`

### 5.3 تحسين تسمية العناصر
- Dashboard -> نظرة عامة
- Strategy -> الاستراتيجية
- Reports -> التقارير

### 5.4 Mobile Navigation
- Bottom bar من 4 عناصر رئيسية:
  - نظرة عامة
  - الاستراتيجية
  - التقارير
  - المزيد

---

## 6) معايير القبول (Acceptance Criteria)
- التنقل يصبح أوضح خلال 3 نقرات كحد أقصى للوصول لأي وظيفة أساسية.
- لا يوجد كسر لأي مسار حالي في `strategy`.
- صفحات الجوال قابلة للاستخدام بيد واحدة بدون تمرير جانبي مربك.
- هوية المنتج تظهر كنظام SaaS احترافي وليست واجهة تجريبية.

---

## 7) مراجع بصرية للمرحلة 2
- Linear app structure: https://linear.app/
- Vercel dashboard IA: https://vercel.com/changelog/dashboard-navigation-redesign-rollout
- Material navigation IA: https://m1.material.io/patterns/navigation.html
- Mobile bottom navigation pattern: https://m1.material.io/components/bottom-navigation.html

---

## 8) قرار مطلوب قبل التنفيذ
اعتماد هذا الـBlueprint كمرجع تنفيذ المرحلة 2:
- `موافق` -> أبدأ التنفيذ مباشرة على الفرع المنفصل.
- `تعديل` -> نعدل النقاط المطلوبة ثم ننفذ.
