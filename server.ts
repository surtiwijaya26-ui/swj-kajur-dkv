import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header for telemetry
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// POST endpoint to generate tailored PKL HRD Application Email using Gemini-3.5-flash
app.post("/api/gemini/generate-email", async (req, res) => {
  const { studentName, studentSkills, studentPortfolio, companyName, companyIndustry, customMessage } = req.body;

  if (!studentName || !companyName) {
    return res.status(400).json({ error: "Nama siswa dan Nama perusahaan wajib diisi." });
  }

  // Robust fallback content if Gemini API key is missing
  if (!ai) {
    const fallbackSubject = `Permohonan Praktek Kerja Lapangan (PKL) DKV - ${studentName} - SMKN 1 Teluknaga`;
    const fallbackBody = `Kepada Yth.
Bapak/Ibu HRD ${companyName}
di tempat

Dengan hormat,

Saya yang bertanda tangan di bawah ini:
Nama: ${studentName}
Sekolah: SMK Negeri 14 Kab. Tangerang
Jurusan: Desain Komunikasi Visual (DKV)

Berdasarkan kurikulum pendidikan SMK, saya bermaksud mengajukan permohonan untuk melaksanakan Praktek Kerja Lapangan (PKL) di perusahaan yang Bapak/Ibu pimpin (${companyName}) pada bidang ${companyIndustry || 'Desain / Industri Kreatif'}.

Sebagai siswa DKV, saya memiliki keahlian dan minat mendalam di bidang:
${studentSkills || '- Desain Grafis & Layouting\n- Editing Video & Storyboarding\n- Ilustrasi Digital\n- Fotografi & Branding'}

Portofolio & Karya Saya:
${studentPortfolio || 'Kumpulan karya desain digital, mockup produk, dan portofolio kreatif.'}

${customMessage ? `Catatan Tambahan:\n${customMessage}\n` : ''}
Saya sangat berharap dapat diberikan kesempatan untuk belajar langsung di bawah bimbingan para profesional di perusahaan Bapak/Ibu. Atas perhatian dan kesempatan yang diberikan, saya ucapkan terima kasih yang sebesar-besarnya.

Hormat saya,
${studentName}
Jurusan DKV - SMK Negeri 14 Kab. Tangerang`;

    return res.json({
      subject: fallbackSubject,
      body: fallbackBody,
      mode: "Template Fallback (API Key tidak terdeteksi)"
    });
  }

  try {
    const prompt = `
Anda adalah konsultan karier profesional dan penasihat PKL untuk SMK Negeri 1 Teluknaga jurusan Desain Komunikasi Visual (DKV).
Tugas Anda adalah membuat email lamaran PKL (Praktek Kerja Lapangan) yang sangat sopan, profesional, memikat, dan terstruktur dalam Bahasa Indonesia yang ditujukan kepada HRD sebuah perusahaan.

Berikut adalah detail siswa yang melamar:
- Nama Siswa: ${studentName}
- Keahlian DKV: ${studentSkills || "Desain Grafis, Adobe Illustrator, Canva, Fotografi, Editing Video"}
- Portofolio/Karya Unggulan: ${studentPortfolio || "Portofolio branding logo UMKM, edit video pendek promosi, ilustrasi digital"}
- Perusahaan Tujuan: ${companyName}
- Bidang/Industri Perusahaan: ${companyIndustry || "Agensi Kreatif / IT / Media"}
- Pesan Kustom / Keinginan Siswa: ${customMessage || "Sangat antusias belajar hal baru dan berkomitmen tinggi"}

Buatkan Judul Subjek Email yang menarik dan Isi Email (Body) yang rapi, humanis, dan persuasif. Tekankan bahwa siswa DKV ini siap memberikan kontribusi nyata dalam membantu tugas kreatif di perusahaan, serta memiliki mentalitas belajar tinggi dan disiplin (sesuai standar SMKN 1 Teluknaga).

Response harus dalam format JSON dengan struktur persis seperti berikut:
{
  "subject": "Judul Subjek Email",
  "body": "Isi lengkap surat/email lamaran PKL"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
          },
          required: ["subject", "body"],
        }
      }
    });

    const resultText = response.text;
    if (resultText) {
      const parsed = JSON.parse(resultText.trim());
      return res.json({
        subject: parsed.subject,
        body: parsed.body,
        mode: "Gemini AI Generated"
      });
    } else {
      throw new Error("No response output from Gemini model.");
    }
  } catch (error: any) {
    console.error("Gemini Email generation error:", error);
    // On error, return template rendering
    const fallbackSubject = `Permohonan PKL DKV - ${studentName} - SMKN 1 Teluknaga`;
    const fallbackBody = `Kepada Yth. HRD ${companyName}\n\nDengan hormat,\nSaya ${studentName} dari program keahlian Desain Komunikasi Visual SMK Negeri 1 Teluknaga bermaksud mengajukan permohonan PKL.\n\nKeahlian:\n${studentSkills}\n\nTerima kasih.`;
    return res.json({
      subject: fallbackSubject,
      body: fallbackBody,
      mode: "Template Fallback (Gemini API Error: " + error.message + ")"
    });
  }
});

// POST endpoint to analyze student productivity using Gemini-3.5-flash
app.post("/api/gemini/analyze-productivity", async (req, res) => {
  const { students, logbooks } = req.body;

  const totalStudents = students?.length || 0;
  const totalLogs = logbooks?.length || 0;
  const ongoingOrCompleted = students?.filter((s: any) => s.status === 'Ongoing' || s.status === 'Completed')?.length || 0;
  const unassignedCount = students?.filter((s: any) => s.status === 'Unassigned')?.length || 0;
  const pendingCount = students?.filter((s: any) => s.status === 'Pending')?.length || 0;

  const dudiApproved = logbooks?.filter((l: any) => l.approvedByDudi)?.length || 0;
  const teacherApproved = logbooks?.filter((l: any) => l.approvedByTeacher)?.length || 0;

  const fallbackSummary = `Berdasarkan rekapitulasi data ${totalStudents} siswa DKV, sebanyak ${ongoingOrCompleted} siswa (${totalStudents > 0 ? Math.round((ongoingOrCompleted/totalStudents)*100) : 0}%) telah ditempatkan di mitra industri, sementara ${unassignedCount} siswa masih belum mendapatkan tempat PKL. Tercatat ${totalLogs} entri laporan logbook terkumpul dengan tingkat persetujuan industri sebesar ${totalLogs > 0 ? Math.round((dudiApproved/totalLogs)*100) : 0}% dan persetujuan guru sebesar ${totalLogs > 0 ? Math.round((teacherApproved/totalLogs)*100) : 0}%. Jurnal harian didominasi pengerjaan konten visual dan penulisan laporan produk kreatif.`;

  const fallbackStrengths = [
    `Tingkat kesiapan penempatan siswa berada di angka ${totalStudents > 0 ? Math.round((ongoingOrCompleted/totalStudents)*100) : 0}% dengan koordinasi industri yang cukup efektif.`,
    `Kedisiplinan pengisian jurnal kreatif dengan terkumpulnya ${totalLogs} laporan jurnal harian aktif dari lapangan.`,
    `Kemitraan industri responsif, dibuktikan dari tingkat persetujuan pembimbing lapangan (DUDI) sebesar ${totalLogs > 0 ? Math.round((dudiApproved/totalLogs)*100) : 0}% terhadap entri logbook siswa.`
  ];

  const fallbackWeaknesses = [
    `${unassignedCount} siswa (${totalStudents > 0 ? Math.round((unassignedCount/totalStudents)*100) : 0}%) masih berstatus Belum PKL (Unassigned) dan memerlukan perhatian intensif serta konseling khusus.`,
    `${pendingCount} siswa sedang menunggu konfirmasi HRD, berisiko mengalami kemunduran jadwal jika tidak difollow-up berkala.`,
    `Terdapat laporan hambatan berupa kendala koordinasi lapangan, ketersediaan hardware pendukung editing, maupun lisensi tools desain gratisan.`
  ];

  const fallbackRecommendations = [
    `Segera hubungi tim Hubungan Industri (Hubinmas) untuk mem-follow up ${pendingCount} siswa yang berstatus 'Pending' agar mendapat kepastian penempatan dari HRD perusahaan.`,
    `Uraikan rencana magang alternatif atau proyek internal sekolah (Project-based Learning) bagi ${unassignedCount} siswa yang masih berstatus Belum PKL.`,
    `Tingkatkan komunikasi dengan pembimbing industri/DUDI untuk memastikan penugasan kerja siswa tetap relevan dengan kompetensi Desain Komunikasi Visual.`
  ];

  // Robust fallback content if Gemini API key is missing
  if (!ai) {
    return res.json({
      summary: fallbackSummary,
      strengths: fallbackStrengths,
      weaknesses: fallbackWeaknesses,
      recommendations: fallbackRecommendations,
      mode: "Template Fallback (API Key tidak terdeteksi)"
    });
  }

  try {
    // Collect a clean representation of the state for Gemini to analyze
    // Compress standard structures to save token usage
    const serializedStudents = (students || []).map((s: any) => ({
      name: s.name,
      class: s.className,
      status: s.status,
      skills: (s.skills || []).slice(0, 3)
    }));

    const serializedLogs = (logbooks || []).map((l: any) => ({
      id: l.id,
      activity: l.activity.substring(0, 100),
      tools: l.toolsUsed,
      obstacle: l.obstacle || "",
      solution: l.solution || "",
      approvedDudi: l.approvedByDudi,
      approvedTeacher: l.approvedByTeacher
    })).slice(0, 15); // Limit logs for context safety and speed

    const prompt = `
Anda adalah konsultan pendidikan vokasi dan pengawas PKL (Praktek Kerja Lapangan) ahli untuk program keahlian Desain Komunikasi Visual (DKV) di SMK Negeri 14 Kabupaten Tangerang.
Tugas Anda adalah menelaah data administrasi dan kinerja logbook siswa secara real-time, lalu memberikan insight yang taktis, solutif, dan profesional untuk Kepala Program Studi DKV (Ibu Surti Wijaya, S.Kom., Gr.).

Berikut adalah ringkasan data saat ini:
- Total Siswa: ${totalStudents} orang
- Status Penempatan:
  * Belum PKL (Unassigned): ${unassignedCount} siswa
  * Menunggu HRD (Pending): ${pendingCount} siswa
  * Sedang/Selesai PKL: ${ongoingOrCompleted} siswa
- Total Laporan Logbook Terkumpul: ${totalLogs} laporan
- Tingkat Persetujuan DUDI/Mitra Pembimbing: ${totalLogs > 0 ? Math.round((dudiApproved/totalLogs)*100) : 0}%
- Tingkat Persetujuan Guru: ${totalLogs > 0 ? Math.round((teacherApproved/totalLogs)*100) : 0}%

Berikut adalah beberapa sampel detail siswa yang terdaftar:
${JSON.stringify(serializedStudents.slice(0, 10), null, 2)}

Berikut adalah sampel data logbook terbaru beserta kendala & solusinya:
${JSON.stringify(serializedLogs, null, 2)}

Analisislah data ini secara mendalam untuk menemukan:
1. "summary": Ringkasan kondisi kepatuhan, produktivitas, dan kendala umum penempatan siswa PKL DKV (Tulis dalam 3-4 kalimat Bahasa Indonesia yang formal dan berbobot).
2. "strengths": 3 poin kekuatan utama yang terlihat dari sebaran data di atas (misal kedisiplinan logbook, keterampilan yang digunakan di dudi, atau kemitraan aktif).
3. "weaknesses": 3 kelemahan atau ancaman operasional utama (misal siswa belum ditempatkan, kelambatan approval, kendala yang dilaporkan di logbook).
4. "recommendations": 3 rekomendasi tindakan taktis berskala prioritas untuk Kaprog DKV (Ibu Surti) demi kelancaran administrasi dan kompetensi siswa.

kembalikan hasil dalam format JSON murni sesuai schema berikut:
{
  "summary": "Teks ringkasan analisis...",
  "strengths": ["kekuatan 1", "kekuatan 2", "kekuatan 3"],
  "weaknesses": ["hambatan 1", "hambatan 2", "hambatan 3"],
  "recommendations": ["saran 1", "saran 2", "saran 3"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "strengths", "weaknesses", "recommendations"]
        }
      }
    });

    const resultText = response.text;
    if (resultText) {
      const parsed = JSON.parse(resultText.trim());
      return res.json({
        summary: parsed.summary,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        recommendations: parsed.recommendations,
        mode: "Gemini AI Generated"
      });
    } else {
      throw new Error("No response output from Gemini model.");
    }
  } catch (error: any) {
    console.error("Gemini analyze-productivity error:", error);
    return res.json({
      summary: fallbackSummary,
      strengths: fallbackStrengths,
      weaknesses: fallbackWeaknesses,
      recommendations: fallbackRecommendations,
      mode: "Template Fallback (Gemini API Error: " + error.message + ")"
    });
  }
});

// POST endpoint to analyze logbooks and provide short AI feedback for a student using Gemini-3.5-flash
app.post("/api/gemini/analyze-logbook", async (req, res) => {
  const { studentName, studentClass, logbooks } = req.body;

  if (!studentName) {
    return res.status(400).json({ error: "Nama siswa wajib diisi." });
  }

  const logsCount = logbooks?.length || 0;
  
  // Calculate dynamic fallback feedback based on log logs content
  let score: "Sangat Baik" | "Baik" | "Cukup" | "Kurang Detail" = "Baik";
  let summary = `Laporan logbook harian ${studentName} menunjukkan partisipasi aktif dalam kegiatan kejuruan Desain Komunikasi Visual. Siswa secara mandiri telah merekam beberapa penugasan utama dari bimbingan lapangan.`;
  let feedback = [
    "Sebutkan rincian resolusi, durasi, atau spesifikasi format file yang diekspor untuk memperjelas aspek teknis.",
    "Bila menemukan kendala operasional, pastikan untuk selalu mencatatkan solusi tuntas yang diambil pada kolom solusi.",
    "Cantumkan link portofolio hasil revisi desain agar guru pembimbing dapat memantau progres visualnya secara langsung."
  ];
  let technical = [
    "Eksplorasi penggunaan pintasan keyboard (hotkeys) pada Adobe Suite untuk meningkatkan efisiensi layouting.",
    "Uji coba transisi easing pada motion graphic atau kompresi file WebP untuk efisiensi loading halaman website."
  ];

  if (logsCount === 0) {
    score = "Kurang Detail";
    summary = `Belum ditemukan catatan logbook aktif dari siswa ${studentName}. Pembimbing menyarankan untuk mengisi logbook harian sesegera mungkin guna melacak riwayat kegiatan PKL DKV.`;
    feedback = [
      "Laporkan aktivitas harian segera setelah pengerjaan selesai agar rincian tugas tidak terlupa.",
      "Tanyakan kendala teknis harian kepada mentor industri (DUDI) untuk memperkaya analisis masalah.",
      "Catat jenis software kreatif yang digunakan secara spesifik untuk masing-masing pengerjaan visual."
    ];
  } else {
    // Check if the student often logs obstacles
    const hasObstacles = logbooks.some((l: any) => l.obstacle && l.obstacle.trim().length > 3);
    const hasLinks = logbooks.some((l: any) => l.projectLink && l.projectLink.trim().length > 3);
    const shortActivities = logbooks.filter((l: any) => l.activity && l.activity.trim().length < 25).length;

    if (shortActivities > logsCount / 2) {
      score = "Kurang Detail";
      summary = `Deskripsi penugasan yang ditulis siswa ${studentName} dinilai terlalu ringkas. Penting untuk menjabarkan tahapan kerja dan kontribusi spesifik dalam proyek agar melatih penulisan laporan profesional.`;
      feedback = [
        "Hindari laporan satu kalimat pendek. Jabarkan proses pengerjaan, misalnya dari pembuatan draf kasar hingga hasil akhir (rendering/slicing).",
        "Sebutkan nama proyek atau kampanye kreatif spesifik yang sedang Anda kerjakan.",
        "Uraikan bimbingan langsung atau instruksi apa saja yang Anda dapatkan dari mentor industri hari itu."
      ];
    } else if (hasObstacles && hasLinks) {
      score = "Sangat Baik";
      summary = `Seluruh pengerjaan terdokumentasi dengan sangat komprehensif. Siswa ${studentName} menunjukkan pemahaman yang matang dalam merefleksikan proses kreatif, kendala teknis, solusi penanganan, serta menyertakan tautan karya.`;
    } else if (!hasObstacles) {
      score = "Cukup";
      summary = `Laporan jurnal harian ${studentName} dinilai cukup teratur, namun bersifat terlalu lurus tanpa mendokumentasikan kendala atau penyelesaian masalah (troubleshooting) selama masa magang.`;
      feedback = [
        "Catat hambatan sekecil apa pun, seperti lag hardware komputer, revisi komposisi warna dari klien, atau kendala referensi ide.",
        "Tuliskan solusi praktis yang Anda ambil untuk menyelesaikan masalah tersebut sebagai bukti kemandirian belajar di industri.",
        "Diskusikan alternatif pengerjaan kreatif bersama dengan rekan tim atau supervisor lapangan."
      ];
    }
  }

  if (!ai) {
    return res.json({
      qualityScore: score,
      summary,
      feedbackBullets: feedback,
      technicalRecommendations: technical,
      mode: "Template Fallback (API Key tidak terdeteksi)"
    });
  }

  try {
    const serializedLogs = (logbooks || []).map((l: any) => ({
      date: l.date,
      activity: l.activity.substring(0, 150),
      tools: l.toolsUsed,
      obstacle: l.obstacle || "",
      solution: l.solution || ""
    })).slice(0, 10);

    const prompt = `
Anda adalah Pembimbing Kreatif dan Pengawas PKL Jurusan Desain Komunikasi Visual (DKV) SMK Negeri 14 Kabupaten Tangerang.
Tugas Anda adalah menelaah riwayat entri logbook harian siswa berikut dan memberikan evaluasi & rekomendasi umpan balik yang membangun untuk meningkatkan kualitas pelaporan serta kompetensi teknis DKV mereka.

Identitas Siswa:
- Nama: ${studentName}
- Kelas: ${studentClass || "XII DKV"}

Entri Logbook yang Ditemukan (Sampel):
${JSON.stringify(serializedLogs, null, 2)}

Analisislah entri logbook di atas secara objektif untuk menilai:
1. "qualityScore": Berikan penilaian kualitas pelaporan dari pilihan berikut: "Sangat Baik", "Baik", "Cukup", "Kurang Detail".
   Kurang Detail jika logbook hanya berisi teks pendek tanpa rincian proses, tools, kendala, atau solusi harian yang memadai.
2. "summary": Ringkasan evaluasi keseluruhan tentang pencapaian siswa dan kesesuaian teknik DKV yang digunakan (Tulis dalam 2-3 kalimat Bahasa Indonesia yang formal namun memotivasi).
3. "feedbackBullets": 3 poin rekomendasi spesifik agar penulisan logbook harian siswa lebih berbobot, detail, atau merefleksikan proses kreatif yang sesungguhnya.
4. "technicalRecommendations": 2 rekomendasi teknis DKV (misal eksplorasi software pendukung, teknik rendering, atau integrasi aset) yang relevan dengan kegiatan mereka di logbook.

Kembalikan hasil dalam format JSON murni sesuai schema berikut:
{
  "qualityScore": "Sangat Baik",
  "summary": "...",
  "feedbackBullets": ["...", "...", "..."],
  "technicalRecommendations": ["...", "..."]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            qualityScore: { type: Type.STRING },
            summary: { type: Type.STRING },
            feedbackBullets: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            technicalRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["qualityScore", "summary", "feedbackBullets", "technicalRecommendations"]
        }
      }
    });

    const resultText = response.text;
    if (resultText) {
      const parsed = JSON.parse(resultText.trim());
      return res.json({
        qualityScore: parsed.qualityScore,
        summary: parsed.summary,
        feedbackBullets: parsed.feedbackBullets,
        technicalRecommendations: parsed.technicalRecommendations,
        mode: "Gemini AI Generated"
      });
    } else {
      throw new Error("No response output from Gemini model.");
    }
  } catch (error: any) {
    console.error("Gemini logbook analysis error:", error);
    return res.json({
      qualityScore: score,
      summary: summary + " (Analisis AI bermasalah, menggunakan evaluasi cerdas lokal)",
      feedbackBullets: feedback,
      technicalRecommendations: technical,
      mode: "Template Fallback (Gemini API Error: " + error.message + ")"
    });
  }
});

// POST endpoint to predictive match unassigned students with companies based on skills, slots, and portfolios
app.post("/api/gemini/predict-placement", async (req, res) => {
  const { students, companies } = req.body;

  if (!students || !companies) {
    return res.status(400).json({ error: "Data siswa dan perusahaan wajib disertakan." });
  }

  const unassigned = students.filter((s: any) => s.status === "Unassigned");

  // Helper local matcher function for fallback or direct calculations
  const calculateLocalPredictions = () => {
    return unassigned.map((st: any) => {
      // Calculate matches for each company
      const scoredCompanies = companies.map((co: any) => {
        let score = 50; // default base match score

        // Estimate current company filled slots
        const enrolledCount = students.filter((s: any) => s.companyId === co.id && s.status !== "Unassigned").length;
        const slotsLeft = Math.max(0, co.slots - enrolledCount);

        // Prioritize open slots
        if (slotsLeft > 0) {
          score += 20;
        } else {
          score -= 15;
        }

        // Skill alignment with industry & name keywords
        const studentSkillsString = (st.skills || []).join(" ").toLowerCase();
        const industryStr = (co.industry || "").toLowerCase();
        const compName = (co.name || "").toLowerCase();

        let keywordMatched = false;

        // UI/UX & Web
        if (studentSkillsString.includes("web") || studentSkillsString.includes("ui") || studentSkillsString.includes("ux") || studentSkillsString.includes("figma")) {
          if (industryStr.includes("tech") || industryStr.includes("software") || industryStr.includes("web") || industryStr.includes("digital") || compName.includes("dev") || compName.includes("web") || compName.includes("tech") || compName.includes("apps")) {
            score += 25;
            keywordMatched = true;
          }
        }
        // Video editing & Motion
        if (studentSkillsString.includes("video") || studentSkillsString.includes("motion") || studentSkillsString.includes("anim") || studentSkillsString.includes("editing")) {
          if (industryStr.includes("production") || industryStr.includes("media") || industryStr.includes("cinema") || industryStr.includes("tv") || industryStr.includes("broadcast") || compName.includes("studio") || compName.includes("motion") || compName.includes("video") || compName.includes("creative")) {
            score += 25;
            keywordMatched = true;
          }
        }
        // Graphic Design & Branding
        if (studentSkillsString.includes("graphic") || studentSkillsString.includes("brand") || studentSkillsString.includes("logo") || studentSkillsString.includes("percetakan")) {
          if (industryStr.includes("agency") || industryStr.includes("advertising") || industryStr.includes("brand") || industryStr.includes("percetakan") || industryStr.includes("design") || compName.includes("creative") || compName.includes("design") || compName.includes("print") || compName.includes("agency")) {
            score += 25;
            keywordMatched = true;
          }
        }
        // Photography & Cameraman
        if (studentSkillsString.includes("photo") || studentSkillsString.includes("camera") || studentSkillsString.includes("potret") || studentSkillsString.includes("lens")) {
          if (industryStr.includes("studio") || industryStr.includes("media") || industryStr.includes("news") || industryStr.includes("journal") || compName.includes("photo") || compName.includes("studio") || compName.includes("media")) {
            score += 25;
            keywordMatched = true;
          }
        }
        // Illustration & Art
        if (studentSkillsString.includes("illustr") || studentSkillsString.includes("art") || studentSkillsString.includes("gambar") || studentSkillsString.includes("digital art")) {
          if (industryStr.includes("animation") || industryStr.includes("game") || industryStr.includes("comic") || industryStr.includes("ilustr") || compName.includes("art") || compName.includes("studio") || compName.includes("creative")) {
            score += 25;
            keywordMatched = true;
          }
        }

        // Substring details overlap
        if (st.portfolioHighlight && (co.industry || co.name)) {
          const highlightStr = st.portfolioHighlight.toLowerCase();
          if (highlightStr.includes(industryStr) || highlightStr.includes(compName.replace(/cv|pt|creative|agency|studio/g, "").trim())) {
            score += 10;
          }
        }

        // Clamp score between 35 and 97
        score = Math.max(35, Math.min(97, score));

        // Create suggested role
        let role = "Asisten Desainer Komunikasi Visual";
        if (studentSkillsString.includes("web") || studentSkillsString.includes("ui")) role = "Junior UI/UX & Web Developer";
        else if (studentSkillsString.includes("video") || studentSkillsString.includes("motion")) role = "Creative Video & Motion Graphic editor";
        else if (studentSkillsString.includes("illustr")) role = "2D Ilustrator & Asset Concept artist";
        else if (studentSkillsString.includes("photo")) role = "Creative Photographer & Media producer";
        else if (studentSkillsString.includes("brand") || studentSkillsString.includes("graphic")) role = "Graphic Visual Designer & Branding Specialist";

        // Create reason
        let reason = `Keahlian ${st.skills.slice(0, 2).join(" & ")} siswa terbilang selaras dengan lini industri ${co.industry || "kreatif"} di ${co.name}.`;
        if (st.portfolioHighlight) {
          reason += ` Fokus karya '${st.portfolioHighlight}' miliknya sangat mendongkrak operasional visual produksi mereka.`;
        }
        if (slotsLeft > 0) {
          reason += ` Tersedia ${slotsLeft} slot kuota aktif dari ${co.slots} kapasitas DUDI.`;
        } else {
          reason += ` Kuota utama DUDI terisi penuh tetapi rekomendasi tetap solid berdasarkan kecocokan kompetensi.`;
        }

        return {
          companyId: co.id,
          companyName: co.name,
          score,
          suggestedRole: role,
          matchReason: reason
        };
      });

      // Sort by score descending and take top 3
      const recommendations = scoredCompanies
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3);

      return {
        studentId: st.id,
        studentName: st.name,
        className: st.className,
        skills: st.skills,
        portfolioHighlight: st.portfolioHighlight || "Belum ada highlights portofolio khusus",
        recommendations
      };
    });
  };

  if (!unassigned.length) {
    return res.json({ predictions: [], mode: "Siswa Unassigned Kosong" });
  }

  if (!ai) {
    return res.json({
      predictions: calculateLocalPredictions(),
      mode: "Template Fallback (API Key tidak terdeteksi)"
    });
  }

  try {
    // Generate simplified inputs for Gemini to save context limits and avoid noise
    const serializedUnassigned = unassigned.map((st: any) => ({
      id: st.id,
      name: st.name,
      className: st.className,
      skills: st.skills,
      portfolioHighlight: st.portfolioHighlight || ""
    }));

    const historicalAssigned = students
      .filter((s: any) => s.status !== "Unassigned" && s.companyId)
      .slice(0, 20)
      .map((s: any) => {
        const co = companies.find((c: any) => c.id === s.companyId);
        return {
          studentName: s.name,
          skills: s.skills,
          companyName: co?.name || "Lainnya",
          industry: co?.industry || "Creative"
        };
      });

    const serializedCompanies = companies.map((co: any) => {
      const assignedCount = students.filter((s: any) => s.companyId === co.id && s.status !== "Unassigned").length;
      return {
        id: co.id,
        name: co.name,
        industry: co.industry,
        totalSlots: co.slots,
        slotsLeft: Math.max(0, co.slots - assignedCount)
      };
    });

    const prompt = `
Anda adalah konsultan pendidikan dan penasehat penempatan PKL untuk Jurusan Desain Komunikasi Visual (DKV) di SMK Negeri 14 Kabupaten Tangerang.
Tugas Anda adalah menempatkan siswa-siswa yang BELUM mendaptakan penempatan ('Unassigned') ke mitra industri penerima yang paling cocok berdasarkan data kompetensi, ketersediaan kuota slot, dan riwayat penempatan siswa tahun ini.

Daftar Siswa Belum Penempatan ('Unassigned'):
${JSON.stringify(serializedUnassigned, null, 2)}

Riwayat Penempatan Siswa yang Sukses (Histori):
${JSON.stringify(historicalAssigned, null, 2)}

Daftar Perusahaan Mitra Industri dan Sisa Kuota Slot:
${JSON.stringify(serializedCompanies, null, 2)}

Untuk setiap siswa belum penempatan di atas, berikan 1 sampai 3 rekomendasi perusahaan mitra industri terbaik yang paling cocok.
Berikan faktor penilaian berikut:
1. Kemiripan & kecocokan kompetensi: Draf keahlian siswa (misal UI/UX, video editing) dicocokkan dengan jenis industri perusahaan (software tchnology, production house, creative agency).
2. Sisa kuota slot: Berikan keutamaan prioritas ke perusahaan yang masih memiliki 'slotsLeft' > 0.
3. Keterkaitan portofolio siswa dengan visi industri.

Kembalikan hasil dalam format JSON murni persis mengikuti schema berikut:
{
  "predictions": [
    {
      "studentId": "id_siswa_di_sini",
      "studentName": "nama_siswa_di_sini",
      "className": "kelas_siswa",
      "skills": ["keahlian1", "keahlian2"],
      "portfolioHighlight": "...",
      "recommendations": [
        {
          "companyId": "id_perusahaan_pilihan",
          "companyName": "nama_perusahaan_pilihan",
          "score": 95, // angka bulat dari skala 30 s/d 99
          "suggestedRole": "nama usulan posisi magang, contoh: Junior UI Designer / Video Editor Assistant",
          "matchReason": "penjelasan taktis detail dalam bahasa indonesia mengapa siswa ini sangat cocok magang di perusahaan tersebut dikaitkan dengan portofolio miliknya"
        }
      ]
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  studentId: { type: Type.STRING },
                  studentName: { type: Type.STRING },
                  className: { type: Type.STRING },
                  skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                  portfolioHighlight: { type: Type.STRING },
                  recommendations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        companyId: { type: Type.STRING },
                        companyName: { type: Type.STRING },
                        score: { type: Type.INTEGER },
                        suggestedRole: { type: Type.STRING },
                        matchReason: { type: Type.STRING }
                      },
                      required: ["companyId", "companyName", "score", "suggestedRole", "matchReason"]
                    }
                  }
                },
                required: ["studentId", "studentName", "className", "skills", "portfolioHighlight", "recommendations"]
              }
            }
          },
          required: ["predictions"]
        }
      }
    });

    const responseText = response.text;
    if (responseText) {
      const parsed = JSON.parse(responseText.trim());
      return res.json({
        predictions: parsed.predictions,
        mode: "Gemini AI Predictive Match"
      });
    } else {
      throw new Error("Empty prediction response from Gemini SDK.");
    }
  } catch (err: any) {
    console.error("Gemini predictive placement endpoint error:", err);
    return res.json({
      predictions: calculateLocalPredictions(),
      mode: "Template Fallback (Gemini API Error: " + err.message + ")"
    });
  }
});

// POST endpoint for AI Chatbot Assistance based on school documentation
app.post("/api/gemini/chatbot", async (req, res) => {
  const { message, history, studentName, className } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Pesan (message) wajib diisi." });
  }

  // Robust offline fallback checker by keywords if Gemini API key is missing
  if (!ai) {
    const lowerMsg = message.toLowerCase();
    let reply = "";

    if (lowerMsg.includes("alur") || lowerMsg.includes("proses") || lowerMsg.includes("langkah") || lowerMsg.includes("tahap")) {
      reply = `**Alur Pelaksanaan PKL di SMK Negeri 14 Kabupaten Tangerang (DKV):**\n\n1. **Tahap Persiapan:** Melengkapi profil di SimPKL, mengikuti pembekalan Hubin, menyiapkan CV kreatif, link portofolio DKV, serta Surat Pernyataan Orang Tua & Surat BYOD (Bring Your Own Device).\n2. **Tahap Pengajuan & Placement:** Memilih industri mitra (DUDI) di tab Perusahaan, mengajukan surat pengantar resmi TU, mengirimkan lamaran, hingga dikonfirmasi 'Ongoing' oleh Hubin.\n3. **Tahap Pelaksanaan (6 Bulan):** Melaksanakan magang, mengikuti jam kerja perusahaan, menjaga sopan santun, dan wajib mengisi jurnal logbook harian di aplikasi SimPKL.\n4. **Tahap Laporan & Penilaian:** Mengumpulkan jurnal ter-approve, menyusun Laporan PKL tertulis, mengikuti Sidang Presentasi PKL di depan guru penguji, dan menerima Sertifikat Industri berstempel resmi.`;
    } else if (lowerMsg.includes("aturan") || lowerMsg.includes("kebijakan") || lowerMsg.includes("sanksi") || lowerMsg.includes("izin") || lowerMsg.includes("sakit") || lowerMsg.includes("seragam") || lowerMsg.includes("disiplin") || lowerMsg.includes("ambut")) {
      reply = `**Kebijakan & Tata Tertib PKL DKV SMKN 14 Kab. Tangerang:**\n\n* **Kehadiran:** Mengikuti jam kerja dan kalender industri terkait (Senin-Jumat). Jika sakit/halangan, wajib mengirimkan surat izin tertulis atau dokter kepada Pembimbing Klinik (DUDI) serta berkirim kabar ke Guru Pembimbing Sekolah.\n* **Seragam:** Memakai pakaian seragam sekolah sesuai hari berjalan (Wearpack DKV pada hari Rabu) atau mengenakan seragam khusus perusahaan apabila disediakan.\n* **Penampilan:** Rapi, rambut dicukur rapi (laki-laki panjang sesuai standar sekolah) dan tidak dicat warna mencolok. Tidak bertato/bertindik.\n* **Sanksi Pelanggaran:** Ketidakhadiran tanpa izin dan kelalaian pengisian logbook akan diganjar teguran lisan hingga Surat Peringatan (SP 1-3). Pelanggaran berat berupa pencemaran nama baik sekolah/perusahaan atau tindak kriminal berujung penarikan langsung dan kegagalan kelulusan PKL.`;
    } else if (lowerMsg.includes("gaji") || lowerMsg.includes("bayar") || lowerMsg.includes("uang") || lowerMsg.includes("transport")) {
      reply = `Mengenai **kebijakan kompensasi keuangan (bantuan transport, uang makan, atau uang saku)**:\n\nSecara umum, PKL adalah bagian kurikulum wajib pendidikan vokasi sekolah dan sifatnya adalah **belajar di industri**, sehingga tidak ada jaminan/keharusan perusahaan memberikan kompensasi keuangan. Namun, beberapa mitra industri memberikan uang saku/transport secara sukarela tergantung kebijakan internal mereka. Fokus utama PKL adalah mendapatkan pengalaman kerja nyata, jejaring profesional, dan portofolio profesional DKV.`;
    } else if (lowerMsg.includes("logbook") || lowerMsg.includes("jurnal") || lowerMsg.includes("harian") || lowerMsg.includes("isi")) {
      reply = `**Panduan Mengisi Laporan Jurnal Logbook SimPKL:**\n\nSiswa diwajibkan menulis laporan jurnal harian setiap hari kerja. Entri yang dinilai 'Sangat Baik' harus memuat:\n1. **Aktivitas Rinci:** Jelaskan tahapan proses desain, revisi, atau tugas yang diselesaikan (contoh: *'Membuat draf layout e-catalog produk UMKM berukuran A4 menggunakan Adobe Illustrator'* daripada sekadar menulis *'Bikin banner'*).\n2. **Tools Kreatif:** Cantumkan perangkat lunak yang digunakan (Photoshop, Illustrator, Figma, Premiere Pro, Canva).\n3. **Kendala & Solusi:** Laporkan jika ada kendala (misal: *'Server file agensi lamban'*) dan solusi yang dilakukan (*'Melakukan kompresi backup lokal'*).\n4. **Verifikasi:** Lakukan penguncian (submit) dan mintalah persetujuan (approval) digital dari Pembimbing DUDI setiap akhir pekan.`;
    } else if (lowerMsg.includes("autocrat") || lowerMsg.includes("apps script") || lowerMsg.includes("sheets") || lowerMsg.includes("instalasi")) {
      reply = `**Panduan Teknis Otomatisasi Administrasi SimPKL:**\n\nSistem SimPKL memanfaatkan integrasi Google Sheets dan Google Apps Script untuk otomatisasi cetak berkas (Surat Pengantar, Biodata, BYOD). Anda dapat memantau petunjuk instalasi lengkapnya di bagian penjelas **"Langkah Instalasi Google Sheets & Script PKL"** di tab Dashboard ini, serta menggunakan menu **"Script Generator"** untuk menyalin baris kode \`Code.gs\` dan \`dashboard.html\`.`;
    } else {
      reply = `Halo! Saya adalah Asisten AI SimPKL DKV (Offline Mode).\n\nSaya mengenali beberapa pertanyaan umum mengenai:\n- **Alur PKL** (ketik kata kunci: *alur, langkah, daftar*)\n- **Aturan / Kebijakan Sekolah** (ketik kata kunci: *aturan, seragam, disiplin, sanksi, izin*)\n- **Pengisian Logbook Harian** (ketik kata kunci: *logbook, jurnal, isi harian*)\n- **Otomatisasi Apps Script / Autocrat** (ketik kata kunci: *autocrat, sheets, script*)\n\nTanyakan kepada saya seputar materi tersebut di atas untuk mendapatkan panduan cepat!`;
    }

    return res.json({
      text: reply,
      mode: "Template Fallback (Offline Mode)"
    });
  }

  try {
    const pklDocumentationContext = `
Nama Sekolah: SMK Negeri 14 Kabupaten Tangerang
Program Keahlian: Desain Komunikasi Visual (DKV)
Kepala Program Studi DKV: Ibu Surti Wijaya, S.Kom., Gr.
Nama Aplikasi: SimPKL (Sistem Informasi Manajemen Praktek Kerja Lapangan)

DOKUMENTASI DAN ATURAN UTAMA PKL:

1. Alur Pelaksanaan PKL (Step-by-Step):
   - Tahap Persiapan: Melengkapi profil di portal SimPKL, mengumpulkan Surat Pernyataan Orang Tua, Surat Pernyataan BYOD (Bring Your Own Device) karena siswa DKV umumnya membawa laptop dengan spesifikasi desain mandiri, membuat portofolio pamer karya (Behance, GDrive), dan mengikuti pembekalan Hubin.
   - Tahap Pengajuan: Memilih perusahaan mitra di tab "Perusahaan". TU mencetak Surat Pengantar PKL dari template Sheets menggunakan otomatisasi Autocrat. Siswa mengirimkan CV & Portfolio ke HRD.
   - Tahap Pelaksanaan: Magang selama 6 bulan di perusahaan mitra. Absensi dan pengisian jurnal harian/logbook di SimPKL wajib dilakukan setiap hari. Guru pembimbing sekolah memantau dan mengunjungi siswa minimal 2 kali selama PKL.
   - Tahap Pelaporan & Penyerahan Nilai: Menyusun dokumen Laporan PKL tertulis, mengikuti ujian sidang presentasi di hadapan guru penguji, mengunggah sertifikat industri berstempel resmi dari DUDI untuk mendapatkan nilai rapot PKL.

2. Kebijakan, Seragam, & Tata Tertib Sekolah:
   - Jam Kerja & Kehadiran: Siswa mematuhi jam operasional perusahaan (contoh: Senin s/d Jumat, jam 08.00 - 17.00). Ketidakhadiran karena sakit wajib membubuhkan Surat Dokter yang dikirim ke Pembimbing Industri. Izin mendesak harus disetujui Pembimbing Industri dan diinformasikan ke Guru Pembimbing.
   - Seragam Sekolah saat PKL: Siswa DKV wajib mengenakan baju seragam sesuai hari berjalan (Senin/Selasa: Abu-abu Putih, Rabu: Wearpack DKV/Identitas Jurusan, Kamis: Batik, Jumat: Pramuka/Busana Muslim) KECUALI bila pihak industri menyediakan seragam tersendiri yang wajib dipakai.
   - Etika & Penampilan: Sopan, ramah, menerapkan 5S (Senyum, Sapa, Salam, Sopan, Santun). Rambut dicukur rapi (laki-laki tidak boleh gondrong) dan warna rambut natural hitam, tidak dicat warna-warni terang. Dilarang bertato/tindik. Menjaga rahasia perusahaan DUDI. Gadget/HP tidak boleh digunakan untuk keperluan pribadi di jam kerja kecuali urusan koordinasi kerja desain.
   - Uang Saku/Gaji: Secara regulasi kurikulum, PKL adalah kegiatan pendidikan wajib sehingga ditekankan tidak ada keharusan industri memberikan gaji/uang saku. Namun perkiraan adanya uang makan/transportasi sukarela tergantung kebijakan internal masing-masing agensi/mitra.
   - Pelanggaran & Sanksi:
     * Pelanggaran Ringan (Terlambat, lalai isi logbook): Teguran lisan & pembinaan.
     * Pelanggaran Sedang (Izin palsu, tidak disiplin, melanggar etika ringan): Surat Peringatan SP 1 s/d SP 3.
     * Pelanggaran Berat (Mencemarkan nama baik sekolah/perusahaan, bolos kumulatif > 10 hari, tindak kriminal/asusila): Penarikan langsung dari tempat magang, dinyatakan GAGAL PKL, serta ditunda kelulusan sekolah.

3. Panduan Teknis Pengisian Jurnal/Logbook SimPKL:
   - Jurnal harian wajib diinput setiap hari kerja melalui menu SimPKL.
   - Isi laporan harus detail tentang aktivitas kejuruan DKV (contoh format yang bagus: 'Melakukan pemotongan (slicing) video dokumenter profil perusahaan berdurasi 3 menit menggunakan software Adobe Premiere Pro, menyesuaikan transisi antar klip sesuai feedback mentor industri'). Jangan sekadar menulis 'bikin banner' atau 'desain corel'.
   - Wajib mencatatkan software kreatif yang digunakan (Adobe Photoshop, Illustrator, InDesign, After Effects, Premiere Pro, Figma, Blender, Canva).
   - Wajib mengisi bagian hambatan/kendala (jika ada) serta langkah solusi yang dicoba.
   - Pembimbing Industri (DUDI) wajib memberikan approval logbook digital (bisa dibantu cetak rekap via Google Sheets untuk tanda tangan fisik).

TUGAS ANDA:
Anda adalah SimPKL Chatbot, asisten cerdas AI resmi untuk portal SimPKL SMK Negeri 14 Kabupaten Tangerang.
Silakan jawab pertanyaan siswa dengan ramah, informatif, singkat, padat, dan solutif. Selalu gunakan Bahasa Indonesia yang memotivasi dan ramah remaja SMK, namun tetap profesional.
Jika ditanya tentang data angka saat ini, Anda dapat merujuk secara intuitif atau informatif umum.
${studentName ? `Siswa yang sedang berbicara dengan Anda bernama: ${studentName}${className ? ` dari kelas ${className}` : ''}. Sapa dengan ramah.` : ''}
`;

    // Process chat history to conform with @google/genai format
    const formattedContents = [];
    
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        formattedContents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text || "" }]
        });
      }
    }
    
    // Add the new user message
    formattedContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: pklDocumentationContext,
        temperature: 0.7,
      }
    });

    if (response && response.text) {
      return res.json({
        text: response.text,
        mode: "Gemini AI Chatbot"
      });
    } else {
      throw new Error("No output text from Gemini API.");
    }
  } catch (error: any) {
    console.error("Gemini chatbot endpoint error:", error);
    return res.json({
      text: "Maaf, saya sedang mengalami kendala jaringan untuk memproses data dari server pusat. Silakan coba kirim ulang pertanyaan Anda mengenai PKL atau bacalah ringkasan panduan di samping.",
      mode: "Template Fallback (Error Connection: " + error.message + ")"
    });
  }
});

// Setup Vite Dev Server / Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server PKL DKV berjalan di http://localhost:${PORT}`);
  });
}

startServer();
