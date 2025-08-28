# 🐷 Thermo Track - ASF Monitoring System

<div align="center">

![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge\&logo=expo\&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge\&logo=react\&logoColor=61DAFB)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge\&logo=sqlite\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge\&logo=typescript\&logoColor=white)

**An offline-first mobile application for monitoring pig health and preventing African Swine Fever (ASF).**

📊 Track temperatures • ✅ Conduct health checklists • 📑 Generate reports — all **without internet connectivity**

[🚀 Getting Started](#-getting-started) • [📱 Features](#-key-features) • [🏗️ Architecture](#-architecture) • [🤝 Contributing](#-contributing)

</div>  

---

## 🎯 Overview

**Thermo Track** is an **offline-first mobile app** built with **Expo (React Native) + SQLite** to help farmers monitor pig health and prevent ASF outbreaks.

It enables:

* 📊 **Daily health monitoring** with temperature & symptom tracking
* ⚠️ **Risk assessment** via color-coded alerts
* 📈 **Historical reporting** with charts & analytics
* 🔔 **Smart notifications** for reminders & risks
* ⚙️ **Customizable settings** for breeds & checklists

---

## 📱 Key Features

### 🏠 Dashboard & Pig Management

* Interactive pig profiles with monitoring status (✅ Monitored / ❌ Not Monitored)
* Risk level indicators (🟢 Healthy, 🟠 Moderate, 🔴 High Risk)
* Filtering by status
* Farm statistics overview

### 🌡️ Health Monitoring

* Breed-specific temperature ranges (Adult/Young pigs)
* Customizable health checklist
* Automated risk scoring based on symptoms + temperature
* Treatment recommendations

### 📊 Reporting & Analytics

* Temperature history charts (7-day trends)
* Symptom tracking over time
* Risk score breakdown
* Export-ready health reports

### ⚙️ Configuration Management

* Breed management with thresholds
* Health checklist editor with risk weighting
* Monitoring schedule settings
* Notification preferences

### 🔔 Smart Notifications

* Alerts for missed monitoring
* Risk-based alerts requiring attention
* Customizable system with history tracking
* Offline-capable notifications

---

## 🏗️ Architecture

### ⚙️ Technology Stack

* **Frontend**: React Native + Expo Router
* **Database**: SQLite (encrypted)
* **State Management**: React Context + Custom Hooks
* **Charts**: React Native Chart Kit
* **Notifications**: Expo Notifications (background)
* **Type Safety**: TypeScript

### 🗄️ Database Schema

```sql
-- Core Tables
Pigs (id, name, age, weight, category, breed_id, image, prone_level)
Breeds (id, name, normal_temp_adult, normal_temp_young)
DailyMonitoring (id, pig_id, date, temperature, checklist_results)
Checklist (id, symptom, risk_weight, treatment_recommendation)
ChecklistResults (monitoring_id, checklist_id, checked)
Settings (reminder_notifications, monitoring_start_time)
```

### 📂 Project Structure

```
asf-monitoring/
├── app/                  
│   ├── (pigs)/            # Pig management
│   │   ├── new.tsx        # Add pig
│   │   ├── notifications.tsx
│   │   └── [id]/          
│   │       ├── edit.tsx  
│   │       ├── monitor.tsx
│   │       └── report.tsx
│   ├── (settings)/        # Config
│   │   ├── breeds.tsx     
│   │   ├── checklist.tsx  
│   │   ├── monitoring-time.tsx 
│   │   └── breeds/        
│   │   └── checklist/     
│   └── (tabs)/            # Navigation
│       ├── index.tsx      # Dashboard
│       ├── pigs.tsx       # Pig list
│       ├── reports.tsx    # Reports
│       └── settings.tsx   # Settings
├── components/            
├── contexts/              
├── hooks/                 
├── utils/                 
└── constants/             
```

---

## 🚀 Getting Started

### ✅ Prerequisites

* Node.js 16+
* npm or yarn
* Expo CLI
* iOS Simulator / Android Emulator (optional)

### 📌 Installation

```bash
git clone https://github.com/shintakino/asf-monitoring.git
cd asf-monitoring
npm install
npx expo start
```

Run with:

* `a` → Android emulator
* `i` → iOS simulator
* Scan QR → Expo Go app

### 📦 Production Build

```bash
# Android
npx expo prebuild --clean
npx eas build --platform android  

# iOS
npx expo prebuild --clean
npx eas build --platform ios  
```

---

## 📊 Database Initialization

### 🐖 Default Breeds

* Duroc | Adult: 38.0–39.5°C | Young: 38.5–40.0°C
* Landrace | Adult: 38.0–39.5°C | Young: 38.5–40.0°C
* Yorkshire | Adult: 38.0–39.5°C | Young: 38.5–40.0°C
* Hampshire | Adult: 38.0–39.5°C | Young: 38.5–40.0°C

### ✅ Default Checklist

* Loss of Appetite (Risk 3) → Appetite stimulants
* Lethargy/Weakness (Risk 4) → Isolate, electrolytes, vet consult
* Respiratory Distress (Risk 5) → Immediate vet attention
* Fever (Risk 5) → Antipyretics, cooling, vet consult
* Skin Discoloration (Risk 4) → Isolate, photo lesions, vet consult

---

## 🎨 UI/UX Highlights

* Themed components with dark/light mode
* Haptic feedback & smooth animations
* Accessible components (contrast + labels)
* Responsive layouts (phones & tablets)
* Offline-friendly UI states

---

## 🔧 Customization

* **Add Breed Ranges** → edit `utils/database.ts`
* **Update Health Checklist** → edit `utils/database.ts`
* **Configure Notifications** → edit `app.json`

---

## 🤝 Contributing

1. Fork repo
2. Create feature branch → `git checkout -b feature/amazing-feature`
3. Commit → `git commit -m "Add amazing feature"`
4. Push → `git push origin feature/amazing-feature`
5. Open Pull Request

✅ Areas: new analytics, export formats, multi-language, notifications, backup/restore

---

## 📜 License

MIT License – see [LICENSE](LICENSE).

---

## 👨‍💻 Developer

**Joshua Jay Narvaza Javier**
*IoT Developer & Mobile App Specialist*

📧 [joshuajaynarvaza@gmail.com](mailto:joshuajaynarvaza@gmail.com)
💼 [LinkedIn](https://www.linkedin.com/in/joshua-jay-n-javier-250710172/)
🐙 [GitHub](https://github.com/shintakino)

*"Passionate about building real-world tech solutions for agriculture & animal health."*

---

<div align="center">

## 🌟 Support the Project

[![Star this repo](https://img.shields.io/badge/⭐-Star-yellow?style=for-the-badge)](https://github.com/shintakino/asf-monitoring)
[![Fork](https://img.shields.io/badge/🍴-Fork-blue?style=for-the-badge)](https://github.com/shintakino/asf-monitoring/fork)
[![Share](https://img.shields.io/badge/📢-Share-green?style=for-the-badge)](https://github.com/shintakino/asf-monitoring)

**Together, we can help prevent ASF outbreaks and support sustainable farming! 🐷❤️**

*Made with ❤️ for the farming community*

</div>  

---

