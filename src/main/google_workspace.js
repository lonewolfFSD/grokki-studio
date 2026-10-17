const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { shell, Notification } = require('electron');
const { google } = require('googleapis');

class GoogleWorkspaceManager {
  constructor() {
    this.tokenPath = path.resolve(__dirname, '../../data/google_tokens.json');
    this.credentialsPath = path.resolve(__dirname, '../../data/google_credentials.json');
    this.port = 8585;
    this.redirectUri = `http://127.0.0.1:${this.port}/oauth2callback`;

    this.scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/tasks',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
      'https://www.googleapis.com/auth/classroom.announcements.readonly',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ];

    this.oauth2Client = null;
    this.initClient();
  }

  getClientCredentials() {
    // 1. From .env
    const envId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const envSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    if (envId && envSecret) {
      return { clientId: envId, clientSecret: envSecret };
    }

    // 2. From data/google_credentials.json
    if (fs.existsSync(this.credentialsPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
        const creds = raw.installed || raw.web || raw;
        if (creds.client_id && creds.client_secret) {
          return { clientId: creds.client_id, clientSecret: creds.client_secret };
        }
      } catch (e) {}
    }

    return null;
  }

  initClient() {
    const creds = this.getClientCredentials();
    if (!creds) return;

    this.oauth2Client = new google.auth.OAuth2(
      creds.clientId,
      creds.clientSecret,
      this.redirectUri
    );

    // Load saved tokens if available
    if (fs.existsSync(this.tokenPath)) {
      try {
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        this.oauth2Client.setCredentials(tokens);

        this.oauth2Client.on('tokens', (newTokens) => {
          this.saveTokens({ ...tokens, ...newTokens });
        });

        // Auto-refresh token on startup
        this.ensureValidToken().catch(() => {});
      } catch (err) {
        console.warn('Failed to load Google tokens:', err.message);
      }
    }
  }

  async ensureValidToken() {
    if (!this.oauth2Client) {
      this.initClient();
    }
    if (!this.oauth2Client) return false;

    const creds = this.oauth2Client.credentials;
    if (!creds || !creds.refresh_token) return false;

    // Refresh if expired or expiring within 5 minutes
    const now = Date.now();
    if (!creds.expiry_date || creds.expiry_date <= now + 300000) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.saveTokens(credentials);
        return true;
      } catch (err) {
        console.warn('Google auto-refresh failed:', err.message);
        return false;
      }
    }
    return true;
  }

  saveTokens(tokens) {
    try {
      const dir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2), 'utf8');
      if (this.oauth2Client) this.oauth2Client.setCredentials(tokens);
      return true;
    } catch (e) {
      return false;
    }
  }

  isConnected() {
    if (!this.oauth2Client) return false;
    const creds = this.oauth2Client.credentials;
    return !!(creds && (creds.access_token || creds.refresh_token));
  }

  disconnect() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
      if (this.oauth2Client) {
        this.oauth2Client.setCredentials({});
      }
      return true;
    } catch (e) {
      console.error('Failed to disconnect Google:', e);
      return false;
    }
  }

  /**
   * Fetch connected user's profile info (name, email, avatar picture)
   */
  async getUserProfile() {
    if (!this.isConnected()) return null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      return {
        name: data.name || data.given_name || null,
        email: data.email || null,
        picture: data.picture || null,
      };
    } catch (e1) {
      try {
        const people = google.people({ version: 'v1', auth: this.oauth2Client });
        const res = await people.people.get({
          resourceName: 'people/me',
          personFields: 'names,photos,emailAddresses',
        });
        const name = res.data.names?.[0]?.displayName || null;
        const picture = res.data.photos?.[0]?.url || null;
        const email = res.data.emailAddresses?.[0]?.value || null;
        return { name, email, picture };
      } catch (e2) {
        try {
          const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
          const res = await gmail.users.getProfile({ userId: 'me' });
          return {
            email: res.data.emailAddress,
            name: res.data.emailAddress ? res.data.emailAddress.split('@')[0] : null,
            picture: null,
          };
        } catch (e3) {
          return null;
        }
      }
    }
  }

  /**
   * Start 1-Click Interactive Google OAuth Flow
   */
  async startAuthFlow() {
    const creds = this.getClientCredentials();
    if (!creds) {
      return {
        success: false,
        needsCredentials: true,
        message: 'Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file or save credentials to data/google_credentials.json first.',
      };
    }

    if (!this.oauth2Client) {
      this.initClient();
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: this.scopes,
    });

    if (this.authServer) {
      try { this.authServer.close(); } catch (e) {}
      this.authServer = null;
    }

    return new Promise((resolve) => {
      let handled = false;

      this.authServer = http.createServer(async (req, res) => {
        try {
          const reqUrl = url.parse(req.url, true);
          if (reqUrl.pathname === '/oauth2callback') {
            const code = reqUrl.query.code;
            if (code) {
              handled = true;
              const { tokens } = await this.oauth2Client.getToken(code);
              this.saveTokens(tokens);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1115; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <div style="background: rgba(255,255,255,0.06); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: center; max-width: 420px;">
                      <h2 style="margin: 0 0 12px 0;">🎉 Connected to Grokki!</h2>
                      <p style="color: #9aa0a6; font-size: 14px; margin-bottom: 24px;">Grokki now has autonomous access to your Gmail, Calendar, Drive, Sheets, Docs, and Tasks.</p>
                      <p style="color: #34a853; font-weight: 600; font-size: 13px;">You can close this tab and return to your PC.</p>
                    </div>
                  </body>
                </html>
              `);

              if (Notification.isSupported()) {
                new Notification({
                  title: 'Grokki Connected',
                  body: 'Google Workspace access enabled for Gmail, Calendar, Drive & Docs!',
                }).show();
              }

              try { this.authServer.close(); } catch (e) {}
              this.authServer = null;
            } else {
              res.writeHead(400);
              res.end('Authorization code missing.');
              try { this.authServer.close(); } catch (e) {}
              this.authServer = null;
            }
          }
        } catch (err) {
          res.writeHead(500);
          res.end(`Error: ${err.message}`);
          try { this.authServer.close(); } catch (e) {}
          this.authServer = null;
        }
      });

      this.authServer.listen(this.port, '127.0.0.1', () => {
        shell.openExternal(authUrl);
        // Resolve immediately so UI is not blocked
        resolve({
          success: true,
          message: 'Google Sign-In opened in your browser! Please select your account and grant permissions to connect Grokki.',
        });
      });

      this.authServer.on('error', (err) => {
        resolve({ success: false, message: `Could not start local auth server: ${err.message}` });
      });

      // Cleanup timeout after 5 minutes
      setTimeout(() => {
        if (!handled && this.authServer) {
          try { this.authServer.close(); } catch (e) {}
          this.authServer = null;
        }
      }, 300000);
    });
  }

  // --- GMAIL ---
  async listUnreadEmails(maxResults = 5) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread category:primary',
      maxResults,
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) {
      return { success: true, count: 0, emails: [], message: 'You have no unread primary emails right now!' };
    }

    const emails = [];
    for (const msg of messages) {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata' });
      const headers = detail.data.payload?.headers || [];
      const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
      const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const date = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';
      const emailLink = `https://mail.google.com/mail/u/0/#inbox/${msg.id}`;
      emails.push({ id: msg.id, from, subject, date, snippet: detail.data.snippet, link: emailLink });
    }

    return {
      success: true,
      count: emails.length,
      emails,
      message: `You have ${emails.length} unread emails:\n` + emails.map((e) => `• **From:** ${e.from}\n  **Subject:** [${e.subject}](${e.link}) • [Open in Gmail ↗](${e.link})\n  ↳ ${e.snippet}`).join('\n\n'),
    };
  }

  async sendEmail({ to, subject, body }) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      body.replace(/\n/g, '<br/>'),
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    return { success: true, message: `Email sent to ${to} with subject "${subject}".` };
  }

  // --- GOOGLE CALENDAR ---
  async getUpcomingEvents(maxResults = 5) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const items = res.data.items || [];
    if (items.length === 0) {
      return { success: true, count: 0, events: [], message: 'No upcoming events on your calendar.' };
    }

    const events = items.map((ev) => ({
      title: ev.summary || '(Untitled)',
      start: ev.start?.dateTime || ev.start?.date,
      end: ev.end?.dateTime || ev.end?.date,
      description: ev.description || '',
      link: ev.htmlLink || 'https://calendar.google.com',
    }));

    return {
      success: true,
      count: events.length,
      events,
      message: `Upcoming Calendar Events:\n` + events.map((ev) => `• **[${ev.title}](${ev.link})** (${new Date(ev.start).toLocaleString()}) • [Open in Calendar ↗](${ev.link})`).join('\n'),
    };
  }

  async createCalendarEvent({ title, startTime, endTime, description = '' }) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const start = startTime ? new Date(startTime).toISOString() : new Date(Date.now() + 3600000).toISOString();
    const end = endTime ? new Date(endTime).toISOString() : new Date(new Date(start).getTime() + 3600000).toISOString();

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description,
        start: { dateTime: start },
        end: { dateTime: end },
      },
    });

    return {
      success: true,
      eventLink: res.data.htmlLink,
      message: `Calendar event "${title}" scheduled for ${new Date(start).toLocaleString()}! • [Open Event in Calendar ↗](${res.data.htmlLink || 'https://calendar.google.com'})`,
    };
  }

  // --- GOOGLE DRIVE ---
  async searchDriveFiles(query = '', maxResults = 10) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

    const q = query ? `name contains '${query.replace(/'/g, "\\'")}' and trashed = false` : 'trashed = false';
    const res = await drive.files.list({
      q,
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, webViewLink, modifiedTime, size)',
    });

    const files = res.data.files || [];
    if (files.length === 0) {
      return { success: true, count: 0, files: [], message: `No files found matching "${query}" on Google Drive.` };
    }

    return {
      success: true,
      count: files.length,
      files,
      message: `Found ${files.length} files on Google Drive:\n` + files.map((f) => `• **[${f.name}](${f.webViewLink || 'https://drive.google.com'})** (${f.mimeType.split('.').pop()}) • [Open in Drive ↗](${f.webViewLink || 'https://drive.google.com'})`).join('\n'),
    };
  }

  async uploadFileToDrive(localFilePath) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    if (!fs.existsSync(localFilePath)) return { success: false, message: `File not found: ${localFilePath}` };

    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    const fileName = path.basename(localFilePath);

    const res = await drive.files.create({
      requestBody: { name: fileName },
      media: { body: fs.createReadStream(localFilePath) },
      fields: 'id, name, webViewLink',
    });

    return {
      success: true,
      fileLink: res.data.webViewLink,
      message: `Uploaded "${fileName}" to Google Drive successfully! • [Open in Drive ↗](${res.data.webViewLink || 'https://drive.google.com'})`,
    };
  }

  // --- GOOGLE SHEETS ---
  async readSheetData(spreadsheetId, range = 'Sheet1!A1:Z50') {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = res.data.values || [];
    return {
      success: true,
      rowCount: rows.length,
      rows,
      message: `Read ${rows.length} rows from Google Sheet:\n` + rows.slice(0, 8).map((r) => r.join(' | ')).join('\n'),
    };
  }

  async appendSheetRow(spreadsheetId, values = [], range = 'Sheet1!A1') {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });

    return {
      success: true,
      message: `Appended row [${values.join(', ')}] to Google Sheet!`,
    };
  }

  // --- GOOGLE DOCS ---
  async createGoogleDoc(title, textContent = '') {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const docs = google.docs({ version: 'v1', auth: this.oauth2Client });

    const doc = await docs.documents.create({ requestBody: { title } });
    const docId = doc.data.documentId;

    if (textContent) {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: textContent,
              },
            },
          ],
        },
      });
    }

    return {
      success: true,
      docId,
      url: `https://docs.google.com/document/d/${docId}/edit`,
      message: `Created Google Doc "${title}"! View at: https://docs.google.com/document/d/${docId}/edit`,
    };
  }

  // --- GOOGLE TASKS ---
  async listTasks() {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const tasks = google.tasks({ version: 'v1', auth: this.oauth2Client });

    const res = await tasks.tasks.list({ tasklist: '@default', showCompleted: false });
    const items = res.data.items || [];
    if (items.length === 0) {
      return { success: true, count: 0, tasks: [], message: 'You have no pending Google Tasks!' };
    }

    return {
      success: true,
      count: items.length,
      tasks: items.map((t) => ({ id: t.id, title: t.title, due: t.due, notes: t.notes })),
      message: `Pending Tasks:\n` + items.map((t) => `• [ ] ${t.title}${t.due ? ` (Due: ${new Date(t.due).toLocaleDateString()})` : ''}`).join('\n'),
    };
  }

  async addTask(title, notes = '', due = null) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const tasks = google.tasks({ version: 'v1', auth: this.oauth2Client });

    const requestBody = { title, notes };
    if (due) requestBody.due = new Date(due).toISOString();

    const res = await tasks.tasks.insert({
      tasklist: '@default',
      requestBody,
    });

    return {
      success: true,
      task: res.data,
      message: `Added task "${title}" to your Google Tasks!`,
    };
  }

  // --- GOOGLE CONTACTS ---
  async searchContacts(query = '') {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const people = google.people({ version: 'v1', auth: this.oauth2Client });

    const res = await people.people.searchContacts({
      query,
      readMask: 'names,emailAddresses,phoneNumbers',
    });

    const connections = (res.data.results || []).map((r) => r.person);
    if (connections.length === 0) {
      return { success: true, count: 0, contacts: [], message: `No contacts found matching "${query}".` };
    }

    const contacts = connections.map((c) => ({
      name: c.names?.[0]?.displayName || 'Unknown',
      email: c.emailAddresses?.[0]?.value || '',
      phone: c.phoneNumbers?.[0]?.value || '',
    }));

    return {
      success: true,
      count: contacts.length,
      contacts,
      message: `Found Contacts:\n` + contacts.map((c) => `• ${c.name} | Email: ${c.email || 'N/A'} | Phone: ${c.phone || 'N/A'}`).join('\n'),
    };
  }

  // --- GOOGLE CLASSROOM ---
  async listClassroomCourses() {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const classroom = google.classroom({ version: 'v1', auth: this.oauth2Client });

    const res = await classroom.courses.list({ courseStates: ['ACTIVE'], pageSize: 20 });
    const courses = res.data.courses || [];
    if (courses.length === 0) {
      return { success: true, count: 0, courses: [], message: 'No active Google Classroom courses found.' };
    }

    return {
      success: true,
      count: courses.length,
      courses: courses.map((c) => ({ id: c.id, name: c.name, section: c.section, room: c.room })),
      message: `Enrolled Classes (${courses.length}):\n` + courses.map((c) => `• ${c.name}${c.section ? ` - ${c.section}` : ''}`).join('\n'),
    };
  }

  async listPendingClassroomAssignments(maxPerCourse = 5) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const classroom = google.classroom({ version: 'v1', auth: this.oauth2Client });

    const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'], pageSize: 15 });
    const courses = coursesRes.data.courses || [];
    if (courses.length === 0) {
      return { success: true, count: 0, assignments: [], message: 'No active Google Classroom courses found.' };
    }

    const now = new Date();
    const dueThisWeek = [];
    const upcoming = [];
    const overdue = [];
    const noDueDate = [];

    for (const course of courses) {
      try {
        const cwRes = await classroom.courses.courseWork.list({
          courseId: course.id,
          pageSize: maxPerCourse,
          courseWorkStates: ['PUBLISHED'],
        });
        const items = cwRes.data.courseWork || [];

        for (const item of items) {
          // Check student submission to see if it's already turned in or graded
          let isCompleted = false;
          try {
            const subRes = await classroom.courses.courseWork.studentSubmissions.list({
              courseId: course.id,
              courseWorkId: item.id,
              userId: 'me',
            });
            const sub = (subRes.data.studentSubmissions || [])[0];
            if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED')) {
              isCompleted = true;
            }
          } catch (e) {}

          if (isCompleted) continue; // Skip completed work

          if (item.dueDate) {
            const y = item.dueDate.year;
            const m = (item.dueDate.month || 1) - 1;
            const d = item.dueDate.day || 1;
            const hr = item.dueTime ? (item.dueTime.hours || 0) : 23;
            const min = item.dueTime ? (item.dueTime.minutes || 0) : 59;
            const dueDateObj = new Date(y, m, d, hr, min);

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const ampm = hr >= 12 ? 'PM' : 'AM';
            const displayHr = hr % 12 || 12;
            const displayMin = String(min).padStart(2, '0');
            const dueFormatted = `${monthNames[m]} ${d}, ${y} at ${displayHr}:${displayMin} ${ampm}`;

            const diffMs = dueDateObj.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            const assignData = {
              course: course.name,
              title: item.title,
              dueFormatted,
              dueDateObj,
              diffDays,
              points: item.maxPoints,
              link: item.alternateLink,
            };

            if (diffDays < 0) {
              assignData.status = 'overdue';
              assignData.daysAgo = Math.abs(diffDays);
              overdue.push(assignData);
            } else if (diffDays <= 7) {
              assignData.status = 'due_this_week';
              assignData.daysRemaining = diffDays;
              dueThisWeek.push(assignData);
            } else {
              assignData.status = 'upcoming';
              assignData.daysRemaining = diffDays;
              upcoming.push(assignData);
            }
          } else {
            noDueDate.push({
              course: course.name,
              title: item.title,
              points: item.maxPoints,
              link: item.alternateLink,
              status: 'no_due_date',
            });
          }
        }
      } catch (e) {}
    }

    // Sort chronologically
    dueThisWeek.sort((a, b) => a.dueDateObj - b.dueDateObj);
    upcoming.sort((a, b) => a.dueDateObj - b.dueDateObj);
    overdue.sort((a, b) => b.dueDateObj - a.dueDateObj);

    let md = '';

    if (dueThisWeek.length > 0) {
      md += `### 🚨 Due This Week (${dueThisWeek.length})\n`;
      dueThisWeek.forEach((a, idx) => {
        const urgency = a.daysRemaining <= 1 ? '**Due Tomorrow or Today!**' : `Due in ${a.daysRemaining} days`;
        const linkMd = a.link ? ` [Open Assignment ↗](${a.link})` : '';
        md += `${idx + 1}. **[${a.course}]** ${a.title} — ⏰ *${a.dueFormatted}* (${urgency})${a.points ? ` • ${a.points} pts` : ''}${linkMd}\n`;
      });
      md += '\n';
    } else {
      md += `### 🎉 All Clear This Week!\nYou have no assignments due in the next 7 days. Great job staying ahead!\n\n`;
    }

    if (upcoming.length > 0) {
      md += `### 📅 Coming Up Later (${upcoming.length})\n`;
      upcoming.slice(0, 5).forEach((a, idx) => {
        const linkMd = a.link ? ` [Open ↗](${a.link})` : '';
        md += `${idx + 1}. **[${a.course}]** ${a.title} — *${a.dueFormatted}* (in ${a.daysRemaining} days)${linkMd}\n`;
      });
      md += '\n';
    }

    if (overdue.length > 0) {
      md += `### ⚠️ Past Due / Missed (${overdue.length})\n`;
      overdue.slice(0, 5).forEach((a, idx) => {
        const linkMd = a.link ? ` [Open ↗](${a.link})` : '';
        md += `${idx + 1}. **[${a.course}]** ${a.title} — *Due ${a.dueFormatted}* (${a.daysAgo} days ago)${linkMd}\n`;
      });
      md += '\n';
    }

    if (noDueDate.length > 0) {
      md += `### 📝 Open Lab & Practice (${noDueDate.length} ongoing)\n`;
      noDueDate.slice(0, 4).forEach((a, idx) => {
        const linkMd = a.link ? ` [Open ↗](${a.link})` : '';
        md += `${idx + 1}. **[${a.course}]** ${a.title}${linkMd}\n`;
      });
      if (noDueDate.length > 4) {
        md += `\n*...and ${noDueDate.length - 4} more open practice tasks.* [View All on Classroom ↗](https://classroom.google.com)\n`;
      }
    }

    return {
      success: true,
      totalActive: dueThisWeek.length + upcoming.length + overdue.length,
      dueThisWeekCount: dueThisWeek.length,
      upcomingCount: upcoming.length,
      overdueCount: overdue.length,
      noDueDateCount: noDueDate.length,
      dueThisWeek,
      upcoming,
      overdue,
      noDueDate,
      message: md.trim(),
    };
  }

  async listClassroomAnnouncements(maxResults = 5) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const classroom = google.classroom({ version: 'v1', auth: this.oauth2Client });

    const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'], pageSize: 10 });
    const courses = coursesRes.data.courses || [];
    const allAnnouncements = [];

    for (const course of courses) {
      try {
        const aRes = await classroom.courses.announcements.list({
          courseId: course.id,
          pageSize: 2,
        });
        const items = aRes.data.announcements || [];
        for (const item of items) {
          allAnnouncements.push({
            course: course.name,
            text: (item.text || '').substring(0, 150),
            date: item.updateTime || item.creationTime,
          });
        }
      } catch (e) {}
    }

    if (allAnnouncements.length === 0) {
      return { success: true, count: 0, announcements: [], message: 'No new announcements found.' };
    }

    return {
      success: true,
      count: allAnnouncements.length,
      announcements: allAnnouncements.slice(0, maxResults),
      message: `Recent Class Announcements:\n` +
        allAnnouncements.slice(0, maxResults).map((a) => `• [${a.course}] ${a.text}`).join('\n\n'),
    };
  }

  async getTonightStudyRadar() {
    if (!this.isConnected()) {
      return {
        success: false,
        notConnected: true,
        message: 'Google account is not connected yet. Say "Connect Google account" to sync your Google Classroom homework and Google Calendar test schedule automatically!',
      };
    }

    const assignmentsRes = await this.listPendingClassroomAssignments(5);
    const calendarRes = await this.getUpcomingEvents(10);

    const tonightAssignments = [];
    const thisWeekAssignments = [];

    if (assignmentsRes.success && assignmentsRes.dueThisWeek) {
      for (const a of assignmentsRes.dueThisWeek) {
        if (a.daysRemaining <= 1) {
          tonightAssignments.push(a);
        } else {
          thisWeekAssignments.push(a);
        }
      }
    }

    // Filter upcoming exams, quizzes, and project presentations from calendar
    const exams = [];
    if (calendarRes.success && calendarRes.events) {
      for (const ev of calendarRes.events) {
        const titleLower = (ev.title || '').toLowerCase();
        if (/exam|test|quiz|midterm|final|viva|submission|presentation/i.test(titleLower)) {
          exams.push(ev);
        }
      }
    }

    let md = `## 🚨 Tonight's Academic Priority Radar\n\n`;

    if (tonightAssignments.length > 0 || exams.length > 0) {
      md += `### 🔥 Urgent (Due Tonight / Tomorrow or Impending Exam)\n`;
      for (const a of tonightAssignments) {
        const linkMd = a.link ? ` • [Open Assignment ↗](${a.link})` : '';
        md += `• ⚠️ **[${a.course}]** [${a.title}](${a.link || 'https://classroom.google.com'})\n  ↳ ⏰ Due: **${a.dueFormatted}** (**URGENT: Submit Tonight!**)${a.points ? ` • ${a.points} pts` : ''}${linkMd}\n`;
      }
      for (const ex of exams) {
        md += `• 📝 **Exam/Quiz**: **[${ex.title}](${ex.link})**\n  ↳ 📅 Date: ${new Date(ex.start).toLocaleString()} • [Calendar ↗](${ex.link})\n`;
      }
      md += '\n';
    } else {
      md += `### ✨ All Clear for Tonight!\nNo urgent deadlines due within 24 hours. You're in a great position to get ahead!\n\n`;
    }

    if (thisWeekAssignments.length > 0) {
      md += `### 📅 Coming Up Later This Week (${thisWeekAssignments.length})\n`;
      for (const a of thisWeekAssignments.slice(0, 4)) {
        const linkMd = a.link ? ` • [Open ↗](${a.link})` : '';
        md += `• **[${a.course}]** [${a.title}](${a.link || 'https://classroom.google.com'}) — *Due ${a.dueFormatted}* (in ${a.daysRemaining} days)${linkMd}\n`;
      }
      md += '\n';
    }

    // Actionable Night Plan
    md += `### 🎯 Recommended Night Study Plan\n`;
    if (tonightAssignments.length > 0) {
      const topTask = tonightAssignments[0];
      md += `1. **Block 1 (45m)**: Lock in on **${topTask.title}** (${topTask.course}). Complete and submit first!\n`;
      if (tonightAssignments.length > 1) {
        md += `2. **Block 2 (30m)**: Complete secondary task **${tonightAssignments[1].title}**.\n`;
        md += `3. **Block 3 (15m)**: Quick review and pack backpack for tomorrow.\n`;
      } else if (exams.length > 0) {
        md += `2. **Block 2 (40m)**: Deep revision session for upcoming **${exams[0].title}**.\n`;
        md += `3. **Block 3 (15m)**: Active recall check.\n`;
      } else {
        md += `2. **Block 2 (30m)**: Work on upcoming coursework or read ahead.\n`;
        md += `3. **Block 3 (15m)**: Organize study notes and wind down.\n`;
      }
    } else if (exams.length > 0) {
      md += `1. **Block 1 (45m)**: Deep revision for **${exams[0].title}** (say "create exam cheat sheet" to Grokki).\n`;
      md += `2. **Block 2 (35m)**: Practice probable exam questions.\n`;
      md += `3. **Block 3 (15m)**: Review flashcards.\n`;
    } else if (thisWeekAssignments.length > 0) {
      const aheadTask = thisWeekAssignments[0];
      md += `1. **Block 1 (35m)**: Knock out **${aheadTask.title}** early to stay ahead.\n`;
      md += `2. **Block 2 (25m)**: Light reading or coding practice.\n`;
      md += `3. **Block 3 (15m)**: Free time & chill!\n`;
    } else {
      md += `1. **Block 1 (30m)**: Explore a personal coding project or read an interesting chapter.\n`;
      md += `2. **Block 2 (20m)**: Organize desktop files and notes.\n`;
      md += `3. **Relax**: You have zero pending tasks! 🚀\n`;
    }

    md += `\n*Tip: Say "Lock in for 45 minutes" to start your first focus block!*`;

    return {
      success: true,
      hasUrgent: tonightAssignments.length > 0 || exams.length > 0,
      tonightCount: tonightAssignments.length,
      examCount: exams.length,
      message: md.trim(),
    };
  }

  // --- YOUTUBE DATA API V3 ---
  async searchYouTube(query = '', maxResults = 5) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

    const res = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults,
    });

    const items = res.data.items || [];
    if (items.length === 0) {
      return { success: true, count: 0, videos: [], message: `No videos found on YouTube for "${query}".` };
    }

    const videos = items.map((item) => ({
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      videoId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      publishedAt: item.snippet.publishedAt,
    }));

    return {
      success: true,
      count: videos.length,
      videos,
      topVideoUrl: videos[0].url,
      message: `YouTube Results (${videos.length}):\n` +
        videos.map((v, i) => `${i + 1}. **[${v.title}](${v.url})** by *${v.channel}* • [Watch on YouTube ↗](${v.url})`).join('\n\n'),
    };
  }

  async getMyYouTubeSubscriptions(maxResults = 10) {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

    const res = await youtube.subscriptions.list({
      part: ['snippet'],
      mine: true,
      maxResults,
    });

    const items = res.data.items || [];
    if (items.length === 0) {
      return { success: true, count: 0, subscriptions: [], message: 'No subscriptions found on your YouTube account.' };
    }

    const subs = items.map((item) => item.snippet.title);
    return {
      success: true,
      count: subs.length,
      subscriptions: subs,
      message: `Your Subscribed YouTube Channels (${subs.length}):\n` + subs.map((s) => `• ${s}`).join('\n'),
    };
  }

  async getMyYouTubePlaylists() {
    if (!this.isConnected()) return { success: false, error: 'NOT_CONNECTED' };
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

    const res = await youtube.playlists.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
      maxResults: 20,
    });

    const items = res.data.items || [];
    if (items.length === 0) {
      return { success: true, count: 0, playlists: [], message: 'No playlists found in your YouTube library.' };
    }

    const playlists = items.map((p) => ({
      title: p.snippet.title,
      itemCount: p.contentDetails.itemCount,
      id: p.id,
      url: `https://www.youtube.com/playlist?list=${p.id}`,
    }));

    return {
      success: true,
      count: playlists.length,
      playlists,
      message: `Your YouTube Playlists:\n` + playlists.map((p) => `• ${p.title} (${p.itemCount} items) — ${p.url}`).join('\n'),
    };
  }
}

module.exports = new GoogleWorkspaceManager();
