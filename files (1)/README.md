# 📋 Job Tracker

เว็บ tracker สำหรับติดตามการสมัครงาน — เก็บข้อมูลใน Supabase, host บน GitHub Pages ฟรี!

---

## 🚀 วิธีติดตั้ง

### 1. สร้าง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com) → Sign up / Sign in
2. **New Project** → ตั้งชื่อ (เช่น `job-tracker`) → เลือก Region: **Southeast Asia (Singapore)**
3. รอสร้างเสร็จ (~2 นาที)

### 2. สร้าง Table

ไปที่ **SQL Editor** → รัน SQL นี้:

```sql
create table jobs (
  id            bigint generated always as identity primary key,
  company       text not null,
  position      text not null,
  url           text,
  source        text,
  status        text default 'Applied',
  salary        text,
  location      text,
  commute       text,
  applied_date  date,
  notes         text,
  created_at    timestamptz default now()
);

-- เปิด RLS + allow all (เพราะใช้ส่วนตัว)
alter table jobs enable row level security;

create policy "allow all" on jobs
  for all using (true) with check (true);
```

### 3. เอา Supabase URL & Key

ไปที่ **Project Settings → API**:
- **Project URL** → copy ทั้งหมด เช่น `https://xxxx.supabase.co`
- **Project API Keys → anon public** → copy

### 4. Host บน GitHub Pages

1. สร้าง GitHub repo ใหม่ (public) — เช่น `job-tracker`
2. Upload ไฟล์ทั้ง 3 ไฟล์: `index.html`, `style.css`, `app.js`
3. ไปที่ **Settings → Pages → Branch: main → / (root)** → Save
4. รอ 1-2 นาที → เข้า URL เช่น `https://yourname.github.io/job-tracker`

### 5. ใส่ Config ในเว็บ

- กด ⚙️ (มุมขวาบน)
- วาง Supabase URL และ Anon Key
- กด **บันทึก** → โหลดข้อมูล!

> 🔐 Key จะเก็บใน `localStorage` ของ browser ตัวเอง ไม่ได้ส่งออกไปไหน

---

## 📊 Columns

| Field | คำอธิบาย |
|-------|----------|
| ชื่อบริษัท | ชื่อบริษัทที่สมัคร |
| ตำแหน่งงาน | ตำแหน่งที่สมัคร |
| ที่มา (URL) | ลิงก์ประกาศงาน |
| ช่องทาง | Jobsdb / JobThai / Jobtopgun / LinkedIn / ฯลฯ |
| สถานะ | Applied / Interviewing / Offered / Rejected / Withdrawn |
| เงินเดือน | ช่วงเงินเดือน |
| สถานที่ | ที่ตั้งบริษัท |
| การเดินทาง | BTS/MRT ใกล้เคียง |
| วันที่สมัคร | วันที่ยื่นใบสมัคร |
| หมายเหตุ | บันทึกเพิ่มเติม |

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (ไม่ต้อง build)
- **Backend**: Supabase (PostgreSQL + REST API)
- **Hosting**: GitHub Pages (ฟรี)
