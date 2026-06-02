# Panduan Skenario Pengujian Postman NeoKarir

Direktori ini berisi skenario pengujian fungsional dan integrasi lengkap untuk platform **NeoKarir** menggunakan Postman. Pengujian ini mencakup seluruh endpoint pada **Express API Gateway** serta endpoint langsung pada **AI Service 1** dan **AI Service 2**.

## Daftar Berkas

1. **`NeoKarir_API_Collection.json`**: Koleksi Postman berisi folder pengujian terstruktur.
2. **`NeoKarir_Environment.json`**: Berkas variabel lingkungan (*Environment*) Postman untuk menguji secara lokal.

---

## Langkah-langkah Penggunaan

### 1. Impor Berkas ke Postman
1. Buka aplikasi **Postman** (Desktop atau Web).
2. Klik tombol **Import** di pojok kiri atas.
3. Seret dan lepas berkas `NeoKarir_API_Collection.json` dan `NeoKarir_Environment.json`.
4. Pastikan koleksi dan lingkungan *NeoKarir Local Environment* berhasil diimpor.

### 2. Aktifkan Lingkungan (Environment)
1. Pilih *dropdown* lingkungan di pojok kanan atas Postman.
2. Pilih **NeoKarir Local Environment**.
3. (Opsional) Klik ikon mata untuk melihat variabel yang tersedia:
   - `api_url`: URL dasar API Gateway (`http://localhost:3000/api/v1`).
   - `ai_service_1_url`: URL dasar AI Service 1 (`http://localhost:8000`).
   - `ai_service_2_url`: URL dasar AI Service 2 (`http://localhost:8001`).
   - `email` / `password`: Kredensial akun uji coba.

### 3. Jalankan Alur Pengujian

#### Skenario A: Uji Coba Health Check & Status Konektivitas
Jalankan request di dalam folder **`1. Health Checks`** untuk memastikan seluruh server (API Gateway, DB, AI Service 1 & 2) menyala dan saling terhubung.

#### Skenario B: Alur Registrasi & Login Otomatis
1. Jalankan **`2. Authentication -> Register`** untuk mendaftarkan akun baru.
2. Jalankan **`2. Authentication -> Login`**.
   * **Catatan:** Skenario login memiliki skrip otomatis pada *Tests tab* yang mengekstrak token JWT (`access_token`) dan menyimpannya ke dalam variabel lingkungan `auth_token`. Request berikutnya yang memerlukan autentikasi akan menggunakan token ini secara otomatis.

#### Skenario C: Pengujian Profil & Analisis CV
1. Jalankan pengujian di folder **`3. Profile Management`**.
2. Untuk pengujian **`4. CV Operations -> Upload CV File / Analyze CV / Smart Analyze CV`**:
   * Masuk ke tab **Body** -> pilih **form-data**.
   * Di baris kunci `file` / `cv_file`, arahkan kursor ke kolom Value, klik **Select Files**, lalu pilih berkas PDF contoh yang ada di direktori project `neokarir-backend/neokarir-api/tests/cv-testing-1.pdf`.
   * Klik **Send**.

#### Skenario D: Asisten Chat Karir AI (Chatbot RAG)
1. Jalankan **`8. AI Career Assistant -> Create Chat Session`**. Skenario ini akan otomatis menyimpan UUID sesi chat baru ke variabel `chat_id`.
2. Jalankan **`Send Chat Message`** untuk berinteraksi langsung dengan model asisten karir.

#### Skenario E: Pengujian Langsung ke Microservice AI
Gunakan folder **`11. Direct AI Service 1`** dan **`12. Direct AI Service 2`** untuk menguji endpoint AI secara mandiri tanpa melalui Express Gateway.

---

## Tips Pengujian Otomatis (Collection Runner)
Anda dapat menjalankan seluruh rangkaian tes (kecuali tes unggah berkas yang membutuhkan pemilihan file manual) secara otomatis:
1. Klik kanan pada nama koleksi **NeoKarir API & AI Services Collection**.
2. Pilih **Run collection**.
3. Pastikan lingkungan *NeoKarir Local Environment* terpilih.
4. Klik **Run NeoKarir...** untuk melihat laporan eksekusi lengkap.
