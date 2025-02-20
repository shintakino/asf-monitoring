# ASF Monitoring System (Offline)

## Overview
The ASF Monitoring System is an **offline** mobile application built using **Expo (React Native) and SQLite**. It helps farmers **monitor their pigs' health** and **prevent ASF** by tracking temperature, daily health checklists, and generating reports.

---

## 📌 Features

### 🏠 Dashboard
- Displays **pig profiles** with labels: **Monitored / Not Monitored** for the day.
- Each pig profile shows **prone level** to ASF.
- **Clickable profiles** allow users to take **Daily Monitoring**.
- Displays **total count** of: 
  - 🐷 **Total Pigs**
  - ✅ **Monitored Pigs**
  - ❌ **Not Monitored Pigs**
- **Filter pigs**: Show only monitored or not monitored pigs.
- **Color coding for risk levels**:
  - 🟢 Green = Healthy
  - 🟠 Orange = Moderate Risk
  - 🔴 Red = High Risk

### 📝 Pig Profile
Each pig profile contains:
- **Basic Info**: Name, Age, Weight, Category (Adult/Young), Profile Image, and Breed.
- **Breed-specific temperature range** (pulled from **Breed Management** in Settings).
- **Daily Monitoring**:
  - **Temperature Input** - Compares against breed-specific normal range.
  - **Health Checklist** - Displays symptoms from **Checklist Management**.
  - **Risk Assessment & Recommendations** - Provides tips if health risks are detected.
  - **Alerts** if temperature is abnormal.
  - **Reminder notifications** for missed daily monitoring.

### 📊 Reports
- **Temperature History View** per pig.
- **Simple temperature trend visualization (graph)**.
- **Basic recommendations** based on checklist results.
- **Sort pigs by prone level** to ASF.

### ⚙️ Settings
#### ✅ Checklist Management
- Add, edit, or delete **health checklist items**.
- Each checklist item includes **symptoms, risk weight, and treatment recommendations**.
- Checklist items dynamically appear in **Daily Monitoring**.
- **Health tips** based on checklist results.

#### 🐖 Breed Management
- Add, edit, or delete **pig breeds**.
- Set **normal temperature range** for **Adult** and **Young** pigs.

#### ⏰ Reminders & Notifications
- Enable reminders for **daily monitoring**.
- Notify users if a pig hasn’t been monitored for the day.
- **Alerts** for abnormal temperature readings.

---

## 📚 Database Schema
-- SQLite Database Schema for ASF Monitoring System

-- Table: Pigs
CREATE TABLE Pigs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    weight REAL NOT NULL,
    category TEXT CHECK(category IN ('Adult', 'Young')) NOT NULL,
    breed_id INTEGER NOT NULL,
    image TEXT,
    prone_level TEXT CHECK(prone_level IN ('Low', 'Moderate', 'High')) NOT NULL,
    FOREIGN KEY (breed_id) REFERENCES Breeds(id) ON DELETE CASCADE
);

-- Table: Breeds
CREATE TABLE Breeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    normal_temp_adult REAL NOT NULL,
    normal_temp_young REAL NOT NULL
);

-- Table: DailyMonitoring
CREATE TABLE DailyMonitoring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pig_id INTEGER NOT NULL,
    date DATE NOT NULL,
    temperature REAL NOT NULL,
    checklist_results TEXT NOT NULL, -- JSON format storing checklist responses
    FOREIGN KEY (pig_id) REFERENCES Pigs(id) ON DELETE CASCADE
);

-- Table: Checklist
CREATE TABLE Checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symptom TEXT NOT NULL,
    risk_weight INTEGER NOT NULL,
    treatment_recommendation TEXT NOT NULL
);

-- Table: ChecklistResults (Linking DailyMonitoring & Checklist)
CREATE TABLE ChecklistResults (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monitoring_id INTEGER NOT NULL,
    checklist_id INTEGER NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (monitoring_id) REFERENCES DailyMonitoring(id) ON DELETE CASCADE,
    FOREIGN KEY (checklist_id) REFERENCES Checklist(id) ON DELETE CASCADE
);

-- Table: Settings
CREATE TABLE Settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reminder_notifications BOOLEAN NOT NULL DEFAULT 1,
    checklist_items TEXT, -- Stores default checklist items in JSON format
    breed_data TEXT -- Stores default breed information in JSON format
);

-- Indexes for optimization
CREATE INDEX idx_pig_breed ON Pigs(breed_id);
CREATE INDEX idx_monitoring_pig ON DailyMonitoring(pig_id);
CREATE INDEX idx_checklist_results ON ChecklistResults(monitoring_id, checklist_id);


