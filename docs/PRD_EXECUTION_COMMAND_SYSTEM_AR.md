# One Minute Strategy
## PRD تنفيذي معتمد (نسخة SaaS POC)

تاريخ الإصدار: 2026-03-02  
الحالة: Draft v1 (Execution Blueprint)  
النطاق: `/tmp/one-minute-strategy-saas-poc` فقط

---

## 1) رؤية المنتج
منصة قيادة مشروع متكاملة تبدأ من الاستشارة قبل الالتزام، وتنتهي بإدارة التنفيذ والإغلاق بتقارير تنفيذية ومالية.

المنتج يخدم:
- مدير المشروع (المستخدم التشغيلي الأساسي)
- الإدارة التنفيذية (قارئ القرار والتقرير)

---

## 2) النتيجة المستهدفة
عند دخول المستخدم:
1. يجهز موجز مشروع مختصر.
2. يحصل على استشارة وقرار أولي.
3. يحوّل القرار إلى نطاق تنفيذي وميزانية وخطة.
4. يعيّن المسؤولين ويتابع التنفيذ اليومي.
5. يراقب الربحية والمخاطر والانحرافات لحظيًا.
6. يصدر تقارير تشغيلية ومالية وختامية.

---

## 3) الوحدات الأساسية
1. Decision Engine:
   - موجز المشروع
   - حوار المستشارين
   - القرار التنفيذي
2. Execution Structuring:
   - Scope Breakdown
   - Budget Structuring
   - Timeline & Dependencies
3. Operations Control:
   - تعيين المسؤوليات
   - متابعة يومية
   - تنبيهات التأخير/الانحراف
4. Financial Control:
   - Planned / Actual / Remaining
   - Deviation %
   - Profit / Loss impact
5. Risk Control:
   - سجل مخاطر
   - تقييم الشدة/الاحتمال
   - خطط المعالجة والتصعيد
6. Reporting:
   - يومي
   - تنفيذي
   - ختامي

---

## 4) حالات المشروع
1. Draft
2. In Analysis
3. Decision Ready
4. Approved for Planning
5. Planned
6. In Execution
7. At Risk
8. Closed

---

## 5) مؤشرات الإدارة (KPIs)
1. Execution Readiness Score
2. نسبة الإنجاز الفعلية
3. نسبة التقارير المعتمدة
4. انحراف الميزانية %
5. عدد المخاطر الحرجة المفتوحة
6. زمن الوصول لأول تقرير

---

## 6) الصلاحيات (RBAC)
1. Executive: اعتماد القرارات والتغييرات الكبرى
2. Project Manager: إدارة كاملة للتنفيذ
3. Department Lead: إدارة البنود التابعة للتخصص
4. Contributor: تحديثات يومية وتنفيذ
5. Viewer: قراءة وتقارير فقط

---

## 7) قواعد الحوكمة
1. لا انتقال لمرحلة لاحقة بدون شروط الحد الأدنى.
2. كل تعديل مالي كبير يمر عبر Change Impact.
3. كل تنبيه مرتبط بإجراء تنفيذي مباشر.
4. كل تقرير قابل للتدقيق (Audit-ready).

---

## 8) حدود التنفيذ التقنية
1. ممنوع تعديل منطق `strategy-workspace` في هذه المرحلة.
2. مسموح إعادة هيكلة الواجهات والمسارات.
3. مسموح إضافة صفحات مستقلة مع ربط تدريجي للمنطق.
4. ممنوع كسر العقود الحالية API.

---

## 9) خطة الإصدارات
1. Release 1: Strategy Split UI + Stage Navigation
2. Release 2: Work Packages + Assignments + Daily Logs
3. Release 3: Budget/Risk Control + Alerts
4. Release 4: Executive Reporting + Closure Pack

---

## 10) Definition of Done (لكل Release)
1. RTL صحيح على Desktop/Tablet/Mobile.
2. تجربة تنقل واضحة بلا تضارب.
3. `lint` و`build` ناجحين.
4. لا تراجع في منطق التحليل الحالي.
5. توثيق تغييرات الإصدار محدث داخل `docs`.
