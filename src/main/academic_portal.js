const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./data_dir');

const SUPPORTED_UNIVERSITIES = [
  {
    id: 'adbu',
    name: 'Assam Don Bosco University',
    shortName: 'ADBU',
    baseUrl: 'https://erp.dbuniversity.ac.in/adbu_erp_new/'
  }
];

class AcademicPortalManager {
  constructor() {
    this.configPath = path.join(getDataDir(), 'academic_portal.json');
    this.cachePath = path.join(getDataDir(), 'academic_cache.json');
    this.sessionCookie = null;
    this.sessionExpires = 0;
  }

  getSupportedUniversities() {
    return SUPPORTED_UNIVERSITIES;
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {
      console.warn('[AcademicPortal] Error loading config:', e.message);
    }
    return null;
  }

  saveConfig(cfg) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(cfg, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('[AcademicPortal] Error saving config:', e.message);
      return false;
    }
  }

  getStatus() {
    const cfg = this.loadConfig();
    const cache = this.getCachedData();
    if (!cfg || !cfg.linked) {
      return {
        linked: false,
        university: null,
        universityName: null,
        username: null,
        hasPassword: false,
        lastSynced: null,
        hasData: false
      };
    }
    return {
      linked: true,
      university: cfg.university,
      universityName: cfg.universityName || 'Assam Don Bosco University',
      username: cfg.username || '',
      hasPassword: Boolean(cfg.password && cfg.password.length > 0),
      lastSynced: cfg.lastSynced || null,
      hasData: !!cache
    };
  }

  unlink() {
    this.sessionCookie = null;
    this.sessionExpires = 0;
    try {
      if (fs.existsSync(this.configPath)) fs.unlinkSync(this.configPath);
      if (fs.existsSync(this.cachePath)) fs.unlinkSync(this.cachePath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  saveCredentials(universityId, username, password) {
    const uni = SUPPORTED_UNIVERSITIES.find(u => u.id === universityId) || SUPPORTED_UNIVERSITIES[0];
    const existing = this.loadConfig() || {};

    // If password is not provided or empty string, preserve existing saved password!
    const trimmedPass = (password != null) ? String(password).trim() : '';
    const finalPassword = trimmedPass !== '' ? trimmedPass : (existing.password || '');
    const finalUsername = (username && String(username).trim()) || existing.username || '';

    const cfg = {
      linked: true,
      university: uni.id,
      universityName: uni.name,
      username: finalUsername,
      password: finalPassword,
      updatedAt: Date.now(),
      lastSynced: existing.lastSynced || null
    };
    this.saveConfig(cfg);

    // Invalidate session cookie only if the password actually changed
    if (trimmedPass !== '' && trimmedPass !== existing.password) {
      this.sessionCookie = null;
      this.sessionExpires = 0;
    }
    return this.getStatus();
  }

  getCachedData() {
    try {
      if (fs.existsSync(this.cachePath)) {
        return JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
      }
    } catch (e) {}
    return null;
  }

  saveCachedData(data) {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.warn('[AcademicPortal] Failed to save cache:', e.message);
      return false;
    }
  }

  // --- ADBU ERP Authenticator & Scraper ---
  async login(forceNew = false) {
    if (!forceNew && this.sessionCookie && Date.now() < this.sessionExpires) {
      return this.sessionCookie;
    }

    const cfg = this.loadConfig();
    if (!cfg || !cfg.username || !cfg.password) {
      throw new Error('University credentials not configured. Please enter your Student ID and password in Settings.');
    }

    const loginUrl = 'https://erp.dbuniversity.ac.in/adbu_erp_new/valid_login.php';
    const bodyParams = new URLSearchParams();
    bodyParams.append('username', cfg.username);
    bodyParams.append('password', cfg.password);
    bodyParams.append('user_type', '0');

    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://erp.dbuniversity.ac.in',
        'Referer': 'https://erp.dbuniversity.ac.in/adbu_erp_new/'
      },
      body: bodyParams.toString(),
      redirect: 'manual'
    });

    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) {
      throw new Error('No session cookie returned by university server.');
    }

    const match = setCookie.match(/PHPSESSID=([^;]+)/i);
    if (!match) {
      throw new Error('Failed to capture PHPSESSID from university server.');
    }

    const sessionId = `PHPSESSID=${match[1]}`;

    // Verify session by checking home page redirect
    const homeRes = await fetch('https://erp.dbuniversity.ac.in/adbu_erp_new/index.php', {
      headers: {
        'Cookie': sessionId,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const homeHtml = await homeRes.text();
    // Check if error message is present
    if (homeHtml.includes('Invalid Username or Password') || homeHtml.includes('alert-modern error')) {
      const errMatch = homeHtml.match(/<div[^>]*class="[^"]*alert-modern[^"]*error[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const cleanErr = errMatch ? errMatch[1].replace(/<[^>]+>/g, '').trim() : 'Invalid Username or Password!';
      throw new Error(cleanErr || 'Invalid Username or Password!');
    }

    this.sessionCookie = sessionId;
    // Keep session active for 20 minutes
    this.sessionExpires = Date.now() + 20 * 60 * 1000;
    return this.sessionCookie;
  }

  async fetchHtml(pageParam) {
    let cookie = await this.login();
    const targetUrl = `https://erp.dbuniversity.ac.in/adbu_erp_new/index.php?p=${encodeURIComponent(pageParam)}`;

    let res = await fetch(targetUrl, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://erp.dbuniversity.ac.in/adbu_erp_new/index.php'
      }
    });

    let html = await res.text();

    // Check if session expired or returned login form / session notice
    const isLoginPage = html.includes('valid_login.php') ||
      html.includes('studemp-login-form') ||
      html.includes('name="password"') ||
      html.includes('Session Expired') ||
      html.includes('Invalid Session') ||
      !html.includes('adbu_erp_new');

    if (isLoginPage) {
      console.log(`[AcademicPortal] Session expired on fetching "${pageParam}". Auto re-authenticating with saved credentials...`);
      // Invalidate existing cookie and force login with saved credentials
      cookie = await this.login(true);
      res = await fetch(targetUrl, {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://erp.dbuniversity.ac.in/adbu_erp_new/index.php'
        }
      });
      html = await res.text();

      if (html.includes('valid_login.php') && html.includes('name="password"')) {
        throw new Error('University portal session expired and auto-login failed. Please verify your credentials in Settings.');
      }
    }

    return html;
  }

  // --- HTML Table Parser ---
  parseTables(html) {
    const tables = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1];
      const rows = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;

      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1];
        const cells = [];
        const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          let text = cellMatch[1]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
          cells.push(text);
        }

        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      if (rows.length > 0) {
        tables.push(rows);
      }
    }
    return tables;
  }

  // Parse Attendance
  parseAttendance(html) {
    const records = [];
    let summary = {};

    // 1. First attempt: Modern ADBU ERP Card Component
    const cardRegex = /<!-- Subject code badge -->[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<!-- Subject info -->[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*>\s*(\d+)\s*\/\s*(\d+)\s*classes[\s\S]*?<!-- Percentage \+ status -->[\s\S]*?<div[^>]*>([\d.]+)%<\/div>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/gi;
    let match;

    while ((match = cardRegex.exec(html)) !== null) {
      const code = match[1].replace(/<[^>]+>/g, '').trim();
      const course = match[2].replace(/<[^>]+>/g, '').trim();
      const attended = parseInt(match[3], 10) || 0;
      const held = parseInt(match[4], 10) || 0;
      const pctNum = parseFloat(match[5]) || 0;
      const status = match[6].replace(/<[^>]+>/g, '').trim();
      const isShort = pctNum < 75;
      const neededFor75 = isShort && held > 0 ? Math.max(1, Math.ceil((0.75 * held - attended) / 0.25)) : 0;

      records.push({
        code,
        course,
        attended,
        held,
        absent: Math.max(0, held - attended),
        percentage: `${pctNum}%`,
        percentageNum: pctNum,
        status,
        isShort,
        neededFor75
      });
    }

    if (records.length > 0) {
      return { records, summary, format: 'cards' };
    }

    // 2. Second attempt: Standard HTML Table Parser
    const tables = this.parseTables(html);
    for (const table of tables) {
      if (table.length < 2) continue;

      const headerRowIndex = table.findIndex(row => {
        const text = row.join(' ').toLowerCase();
        return (text.includes('course') || text.includes('subject')) && (text.includes('attend') || text.includes('class') || text.includes('%') || text.includes('percentage'));
      });

      if (headerRowIndex === -1) continue;

      const headers = table[headerRowIndex].map(h => h.toLowerCase());
      const colCode = headers.findIndex(h => h.includes('code'));
      const colCourse = headers.findIndex((h, idx) => {
        if (idx === colCode) return false;
        return (h.includes('title') || h.includes('subject') || h.includes('course') || h.includes('paper')) && !h.includes('code');
      });
      const colHeld = headers.findIndex(h => (h.includes('held') || h.includes('total')) && !h.includes('%'));
      const colAttended = headers.findIndex(h => (h.includes('attend') || h.includes('present')) && !h.includes('%') && !h.includes('total'));
      const colAbsent = headers.findIndex(h => h.includes('absent'));
      const colPct = headers.findIndex(h => h.includes('%') || h.includes('percentage') || h.includes('pct'));

      for (let i = headerRowIndex + 1; i < table.length; i++) {
        const row = table[i];
        if (row.length < 2) continue;

        const rowText = row.join(' ');
        if (/total|aggregate|average/i.test(row[0] || '')) {
          summary.aggregate = rowText;
          continue;
        }

        const courseName = colCourse !== -1 && row[colCourse] ? row[colCourse] : (row[1] || row[0]);
        const courseCode = colCode !== -1 ? row[colCode] : '';
        const held = colHeld !== -1 ? parseInt(row[colHeld], 10) || 0 : 0;
        const attended = colAttended !== -1 ? parseInt(row[colAttended], 10) || 0 : 0;
        const absent = colAbsent !== -1 ? parseInt(row[colAbsent], 10) || 0 : (held > 0 ? held - attended : 0);
        let pctStr = colPct !== -1 ? row[colPct] : '';

        let pctNum = 0;
        if (pctStr) {
          const m = pctStr.match(/([\d.]+)/);
          if (m) pctNum = parseFloat(m[1]);
        } else if (held > 0) {
          pctNum = Math.round((attended / held) * 1000) / 10;
          pctStr = `${pctNum}%`;
        }

        const isShort = pctNum < 75;
        let neededFor75 = 0;
        if (isShort && held > 0) {
          neededFor75 = Math.max(1, Math.ceil((0.75 * held - attended) / 0.25));
        }

        records.push({
          course: courseName,
          code: courseCode,
          held,
          attended,
          absent,
          percentage: pctStr || `${pctNum}%`,
          percentageNum: pctNum,
          isShort,
          neededFor75
        });
      }

      if (records.length > 0) break;
    }

    return { records, summary, rawTableCount: tables.length };
  }

  // Parse Student Personal Details
  parseProfile(html) {
    const profile = {};

    // 1. Try modern .field-label / .field-value grid
    const fieldRegex = /<span class=["']field-label["']>([\s\S]*?)<\/span>\s*<span class=["']field-value["']>([\s\S]*?)<\/span>/gi;
    let fm;
    const fields = {};
    while ((fm = fieldRegex.exec(html)) !== null) {
      const lbl = fm[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
      const val = fm[2].replace(/<[^>]+>/g, '').trim();
      fields[lbl] = val;
    }

    if (Object.keys(fields).length > 0) {
      profile.name = fields['full name'] || fields['name'] || '';
      profile.studentId = fields['admission number'] || fields['registration no.'] || '';
      profile.program = fields['programme'] || fields['program'] || '';
      profile.semester = fields['current semester'] || fields['semester'] || '';
      profile.academicYear = fields['academic year'] || '';
      profile.email = fields['email'] || '';
      profile.phone = fields['phone'] || '';
      profile.campus = fields['unit / campus'] || '';
      if (profile.name) return profile;
    }

    // 2. Fallback to HTML table structure
    const tables = this.parseTables(html);
    for (const table of tables) {
      for (const row of table) {
        if (row.length >= 2) {
          const key = row[0].replace(/:/g, '').trim().toLowerCase();
          const val = row[1].trim();
          if (key && val && !val.includes('${')) {
            if (key.includes('name') && !profile.name) profile.name = val;
            if ((key.includes('id') || key.includes('enroll') || key.includes('roll')) && !profile.studentId) profile.studentId = val;
            if (key.includes('program') || key.includes('department') || key.includes('course') || key.includes('branch')) profile.program = val;
            if (key.includes('sem')) profile.semester = val;
            if (key.includes('email')) profile.email = val;
            if (key.includes('phone') || key.includes('mobile')) profile.phone = val;
          }
        }
      }
    }

    return profile;
  }

  // --- Full Sync Action ---
  async sync(forceFreshLogin = false) {
    const cfg = this.loadConfig();
    if (!cfg || !cfg.username || !cfg.password) {
      throw new Error('Please configure your university credentials first.');
    }

    // 1. Authenticate (forceFreshLogin requests a fresh session from university server)
    await this.login(forceFreshLogin);

    // 2. Fetch Attendance HTML (auto-recovers from expired session)
    const attendanceHtml = await this.fetchHtml('student_personal_attendance_details');
    const attendanceData = this.parseAttendance(attendanceHtml);

    // 3. Fetch Profile HTML
    let profileData = {};
    try {
      const profileHtml = await this.fetchHtml('student_personal_details');
      profileData = this.parseProfile(profileHtml);
    } catch (e) {
      console.warn('[AcademicPortal] Profile fetch warning:', e.message);
    }

    // 4. Update cached data
    const syncTimestamp = Date.now();
    const finalData = {
      university: cfg.university,
      universityName: cfg.universityName || 'Assam Don Bosco University',
      lastSynced: syncTimestamp,
      profile: {
        username: cfg.username,
        ...profileData
      },
      attendance: attendanceData.records,
      summary: attendanceData.summary
    };

    this.saveCachedData(finalData);

    // 5. Update config lastSynced timestamp
    cfg.lastSynced = syncTimestamp;
    this.saveConfig(cfg);

    return {
      success: true,
      lastSynced: syncTimestamp,
      studentName: profileData.name || cfg.username,
      totalSubjects: attendanceData.records.length,
      data: finalData
    };
  }

  // Ensures attendance data is up-to-date; if older than maxAgeMs, auto-syncs using saved credentials
  async ensureFreshData(maxAgeMs = 15 * 60 * 1000) {
    const cfg = this.loadConfig();
    if (!cfg || !cfg.linked || !cfg.password) return null;
    const cache = this.getCachedData();
    const isStale = !cache || !cache.lastSynced || (Date.now() - cache.lastSynced > maxAgeMs);
    if (isStale) {
      try {
        console.log('[AcademicPortal] Attendance data is stale or missing. Auto-syncing fresh attendance...');
        await this.sync();
        return this.getCachedData();
      } catch (err) {
        console.warn('[AcademicPortal] Auto-sync failed, using cache:', err.message);
        return cache;
      }
    }
    return cache;
  }

  // Text summary helper for Grokki AI responses
  getSummaryForAI() {
    const cache = this.getCachedData();
    if (!cache) {
      const status = this.getStatus();
      if (!status.linked) {
        return 'Your university portal is not linked yet. You can link it in Grokki Studio Settings under "University Portal" (currently supporting Assam Don Bosco University).';
      }
      return 'Your university portal (Assam Don Bosco University) is linked, but no attendance data has been synced yet. Tap "Sync Now" in Settings to fetch your records!';
    }

    const name = cache.profile?.name || cache.profile?.username || 'Student';
    const recs = cache.attendance || [];
    if (recs.length === 0) {
      return `University Portal (ADBU) is linked for **${name}**, but no course attendance records were found on the portal right now.`;
    }

    const shortList = recs.filter(r => r.isShort);
    const safeList = recs.filter(r => !r.isShort);

    let lines = [];
    lines.push(`Here is your current attendance from **${cache.universityName || 'Assam Don Bosco University'}**:`);
    lines.push(`\n👤 **Student:** ${name} (\`${cache.profile?.studentId || cache.profile?.username || ''}\`)`);
    if (cache.profile?.program) lines.push(`🎓 **Program:** ${cache.profile.program}${cache.profile.semester ? ` · Semester ${cache.profile.semester}` : ''}`);

    lines.push('\n### 📚 Course Attendance Breakdown');
    for (const r of recs) {
      const icon = r.isShort ? '⚠️' : '✅';
      const warning = r.isShort ? (r.neededFor75 > 0 ? ` *(Need ${r.neededFor75} more classes for 75%)*` : ' *(Below 75%)*') : '';
      lines.push(`* ${icon} **${r.course}** (\`${r.code}\`): **${r.percentage}** — ${r.attended}/${r.held} classes${warning}`);
    }

    if (shortList.length > 0) {
      lines.push(`\n> ⚠️ **Attendance Alert:** You are below the 75% threshold in **${shortList.length}** course(s):`);
      shortList.forEach(s => {
        lines.push(`> • **${s.course}**: ${s.percentage}${s.neededFor75 > 0 ? ` (Attend next **${s.neededFor75}** classes consecutively)` : ''}`);
      });
    } else {
      lines.push('\n🎉 **All clear!** You are at or above 75% attendance across all courses.');
    }

    lines.push(`\n*(Last synced: ${new Date(cache.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})*`);

    return lines.join('\n');
  }

  getProfileSummary() {
    const cache = this.getCachedData();
    if (!cache || !cache.profile) {
      return 'No student profile data found. Please sync your university portal in Settings.';
    }
    const p = cache.profile;
    let lines = [`### 🎓 Student Profile — ${cache.universityName || 'ADBU'}`];
    if (p.name) lines.push(`* **Name:** ${p.name}`);
    if (p.studentId) lines.push(`* **Student ID / Admission No:** ${p.studentId}`);
    if (p.program) lines.push(`* **Program:** ${p.program}`);
    if (p.semester) lines.push(`* **Semester:** ${p.semester}`);
    if (p.academicYear) lines.push(`* **Academic Year:** ${p.academicYear}`);
    if (p.email) lines.push(`* **Email:** ${p.email}`);
    if (p.phone) lines.push(`* **Phone:** ${p.phone}`);
    if (p.campus) lines.push(`* **Campus:** ${p.campus}`);
    return lines.join('\n');
  }
}

module.exports = new AcademicPortalManager();
