const kokoroTTS = require('./kokoro_tts');

const CURATED_ELEVENLABS_VOICES = [
  // Official ElevenLabs Premade & Flagship Voices (with real voice IDs)
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', style: 'Warm British Storyteller', tag: 'UK • Narrative', accent: 'uk', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/JBFqnCBsd6RMkjVDRZzb/df6208d7-8c5b-4729-8138-f661790c1824.mp3' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', style: 'Calm & Articulate', tag: 'US • Conversational', accent: 'us', gender: 'female', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/df6788f9-5c96-470d-8312-aab3b3d8f50a.mp3' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', style: 'Soft & Reassuring', tag: 'US • News & Companion', accent: 'us', gender: 'female', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/6851ec91-9950-471f-8586-357c52539069.mp3' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', style: 'Deep & Resonant', tag: 'US • Documentary', accent: 'us', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/38a69695-2ca9-4b9e-b9ec-f07ced494a58.mp3' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', style: 'Expressive & Friendly', tag: 'US • Conversational', accent: 'us', gender: 'female', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', style: 'Smooth & Trustworthy', tag: 'US • Assistant', accent: 'us', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', style: 'Confident British Educator', tag: 'UK • News', accent: 'uk', gender: 'female', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/f5409e2f-d9c3-4ac9-9e7d-916a5dbd1ef1.mp3' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', style: 'Deep Velvet Narrator', tag: 'US • Cinematic', accent: 'us', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/nPczCjzI2devNBz1zQrb/f4dbda0c-aff0-45c0-83fa-f5d5ec95a2eb.mp3' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', style: 'Warm & Professional', tag: 'US • Audiobook', accent: 'us', gender: 'female', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', style: 'Authoritative British Anchor', tag: 'UK • Broadcast', accent: 'uk', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/onwK4e9ZLuTAKqWW03F9/7eee0236-1a72-4b86-b303-5dcadc007ba9.mp3' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', style: 'Velvety British Actress', tag: 'UK • Drama', accent: 'uk', gender: 'female', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/0ab8bd74-fcd2-489d-b70a-3e1bcde8c999.mp3' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', style: 'Laid-Back & Resonant', tag: 'US • Conversational', accent: 'us', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', style: 'Upbeat & Quirky', tag: 'US • Social Media', accent: 'us', gender: 'female', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/FGY2WhTYpPnrIDTdsKH5/67341759-ad08-41a5-be6e-de12fe448618.mp3' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', style: 'Natural & Energetic', tag: 'AU • Casual', accent: 'uk', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/IKne3meq5aSn9XLyUdCD/102de6f2-22ed-43e0-a1f1-111fa75c5481.mp3' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', style: 'Gravelly & Intense', tag: 'UK • Characters', accent: 'uk', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/N2lVS1w4EtoT3dr4eOWO/ac833bd8-ffda-4938-9ebc-b0f99ca25481.mp3' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', style: 'Calm & Neutral', tag: 'US • Narrative', accent: 'us', gender: 'female', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/SAz9YHcvj6GT2YYXdXww/e6c95f0b-2227-491a-b3d7-2249240decb7.mp3' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', style: 'Energetic & Youthful', tag: 'US • Creator', accent: 'us', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TX3LPaxmHKxFdv7VOQHJ/63148076-6363-42db-aea8-31424308b92c.mp3' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', style: 'Friendly & Optimistic', tag: 'US • Conversational', accent: 'us', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', style: 'Trustworthy & Crisp', tag: 'US • Documentary', accent: 'us', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pqHfZKP75CvOlQylNhV4/d782b3ff-84ba-4029-848c-acf01285524d.mp3' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', style: 'Casual & Down-to-Earth', tag: 'US • Conversational', accent: 'us', gender: 'male', category: 'premade', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3' },
  { id: 'z9fAnlkpzviPz146aGWa', name: 'Glinda', style: 'Magical & Theatrical', tag: 'US • Fantasy', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', style: 'Tactical & Grizzled', tag: 'US • Gaming', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', style: 'British Conversational', tag: 'UK • Essex', accent: 'uk', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'D38z5RcWu1voky8WS1ja', name: 'Fin', style: 'Sailor & Adventurous', tag: 'UK • Irish', accent: 'uk', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', style: 'Strong & Confident', tag: 'US • Energetic', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', style: 'Pleasant British Storyteller', tag: 'UK • Children Stories', accent: 'uk', gender: 'female', category: 'premade', previewUrl: '' },
  { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew', style: 'Well-Rounded News Anchor', tag: 'US • Broadcast', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Emily', style: 'Calm & Meditative', tag: 'US • Meditation', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'g5CIjZEefAph4nQFvHAz', name: 'Ethan', style: 'Soft Whisper & ASMR', tag: 'US • Intimate', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya', style: 'Expressive & Bright', tag: 'US • Podcast', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', style: 'Animated & Spirited', tag: 'US • Animation', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'zcAOhNBS3c14rBihAFp1', name: 'Giovanni', style: 'Smooth European Accent', tag: 'IT • Narrative', accent: 'uk', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace', style: 'Warm Southern Belle', tag: 'US • Audiobook', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry', style: 'Fierce & Commanding', tag: 'US • Action', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'ZQe5CZNOzWyzPSCn5a3c', name: 'James', style: 'Calm Veteran Anchor', tag: 'AU • News', accent: 'uk', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'bVMeCyTHy58xNoL34h3p', name: 'Jeremy', style: 'Excited & Engaging', tag: 'US • Commentary', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 't0jbNlBVZ17f02VDIeMI', name: 'Jessie', style: 'Raspy & Seasoned', tag: 'US • Character', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'Zlb1dXrM653N07WRdFW3', name: 'Joseph', style: 'Articulate British Reporter', tag: 'UK • Journalism', accent: 'uk', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', style: 'Deep & Youthful', tag: 'US • Narration', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'ODq5zmih8GrVes37Dizd', name: 'Patrick', style: 'High-Energy Broadcast', tag: 'US • Gaming', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: '5Q0t7uMcjvnagumLfvZi', name: 'Paul', style: 'Authoritative On-Air Reporter', tag: 'US • News', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole', style: 'Soft Whispering Companion', tag: 'US • ASMR', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', style: 'Raspy & Authentic', tag: 'US • Storytelling', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'AZnzlk1XvdvUeBnXmlld_serena', voteId: 'pMsXgVXv3BLzUgSXRplE', id: 'pMsXgVXv3BLzUgSXRplE', name: 'Serena', style: 'Pleasant & Welcoming', tag: 'US • Interactive', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'Yko7PKHZNXotIFUBG7I9', name: 'Matthew', style: 'Calm British Audiobook', tag: 'UK • Classic', accent: 'uk', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', style: 'Meditative & Gentle', tag: 'US • Calm', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', style: 'Emotional & Youthful', tag: 'US • Expressive', accent: 'us', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', style: 'Well-Rounded & Polite', tag: 'US • Assistant', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', style: 'Crisp & Commanding', tag: 'US • Trailer', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'flq6f7yk4E4fJM5XTYuZ', name: 'Michael', style: 'Distinguished Senior Voice', tag: 'US • Audiobook', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
  { id: 'zrHiDhphv9ZnVXBqCLjz', name: 'Mimi', style: 'Sweet & Playful', tag: 'SE • Animation', accent: 'uk', gender: 'female', category: 'premade', previewUrl: '' },
  { id: 'wViXBPUzp2ZZixB1xQuM', name: 'Ryan', style: 'Cinematic Movie Trailer', tag: 'US • Promo', accent: 'us', gender: 'male', category: 'premade', previewUrl: '' },
];

// Expand to 200 rich ElevenLabs voices out-of-the-box so the user always has 200 voices ready immediately,
// each mapped to a valid ElevenLabs base voice ID for instant synthesis if not overridden by live library IDs.
const EXTRA_VOICE_PROFILES = [
  ['Aria', 'Expressive & Natural', 'US • Conversational', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Cassidy', 'Crisp Podcast Host', 'US • Podcast', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Mark', 'Natural & Dynamic', 'US • Conversational', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Finn', 'Upbeat & Tech-Savvy', 'US • Creator', 'us', 'male', 'TX3LPaxmHKxFdv7VOQHJ'],
  ['Amelia', 'Warm British Storyteller', 'UK • Literature', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Archer', 'Grounded & Analytical', 'UK • Executive', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Hope', 'Soothing & Empathetic', 'US • Wellness', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['Marcus', 'Deep Movie Trailer', 'US • Cinema', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['arabell', 'Poetic & Enchanting', 'UK • Fantasy', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['spuds', 'Wise Old Storyteller', 'US • Folklore', 'us', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Evelyn', 'Articulate Academic', 'UK • Lecture', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Julian', 'Smooth Late-Night Host', 'US • Broadcast', 'us', 'male', 'CwhRBWXzGAHq8TQ4Fs17'],
  ['Sienna', 'Bright Commercial Voice', 'US • Advertising', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['Gideon', 'Authoritative Historian', 'UK • Documentary', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Clara', 'Gentle Bedtime Narrator', 'US • Sleep Stories', 'us', 'female', 'LcfcDJNUP1GQjkzn1xUU'],
  ['Declan', 'Warm Irish Raconteur', 'UK • Storytelling', 'uk', 'male', 'D38z5RcWu1voky8WS1ja'],
  ['Valeria', 'Confident Keynote Speaker', 'US • Enterprise', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['Sebastian', 'Refined Oxford Scholar', 'UK • Audiobook', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Maya', 'Friendly AI Companion', 'US • Assistant', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Lucas', 'Crisp Tech Reviewer', 'US • YouTube', 'us', 'male', 'bIHbv24MWmeRgasZH58o'],
  ['Eleanor', 'Classic British Drama', 'UK • Theatre', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Victor', 'Gravelly Noir Detective', 'US • Mystery', 'us', 'male', 'N2lVS1w4EtoT3dr4eOWO'],
  ['Chloe', 'Sunny Lifestyle Vlogger', 'US • Social', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['Alistair', 'Royal BBC Announcer', 'UK • Broadcast', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Nora', 'Calm Mindfulness Guide', 'US • Meditation', 'us', 'female', 'SAz9YHcvj6GT2YYXdXww'],
  ['Roman', 'Bold Sports Commentator', 'US • Live Action', 'us', 'male', 'SOYHLrjzK2X1ezoPC6cr'],
  ['Penelope', 'Witty British Comedian', 'UK • Entertainment', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Caleb', 'Sincere Indie Filmmaker', 'US • Narrative', 'us', 'male', 'iP95p4xoKVk53GoZ742B'],
  ['Hazel', 'Warm Acoustic Vocal', 'US • Intimate', 'us', 'female', 'piTKgcLEGmPE4e6mEKli'],
  ['Dominic', 'Commanding CEO Persona', 'US • Finance', 'us', 'male', 'pNInz6obpgDQGcFmaJgB'],
  ['Ruby', 'Spirited Anime Heroine', 'US • Character', 'us', 'female', 'jBpfuIE2acCO8z3wKNLl'],
  ['xavier', 'Futuristic Sci-Fi AI', 'US • Cyberpunk', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Violet', 'Velvety Jazz Radio Host', 'US • Late Night', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Sterling', 'Distinguished Diplomat', 'UK • Global Affairs', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Aurora', 'Ethereal Fairy Tale Voice', 'US • Fantasy', 'us', 'female', 'z9fAnlkpzviPz146aGWa'],
  ['Lachlan', 'Outback Australian Guide', 'AU • Adventure', 'uk', 'male', 'IKne3meq5aSn9XLyUdCD'],
  ['Stella', 'Sharp News Correspondent', 'US • Breaking News', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['Vincent', 'Deep Bass Audiobook', 'US • Thriller', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Beatrice', 'Posh London Socialite', 'UK • Drama', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Owen', 'Friendly Neighborhood Host', 'US • Explainer', 'us', 'male', 'bIHbv24MWmeRgasZH58o'],
  ['Ivy', 'Whisper-Soft Storyteller', 'US • ASMR', 'us', 'female', 'piTKgcLEGmPE4e6mEKli'],
  ['Harrison', 'Classic Hollywood Narrator', 'US • Vintage', 'us', 'male', 'pqHfZKP75CvOlQylNhV4'],
  ['Genevieve', 'Elegant Art Curator', 'UK • Culture', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Miles', 'Laid-Back Coffee Chat', 'US • Casual', 'us', 'male', 'CwhRBWXzGAHq8TQ4Fs17'],
  ['Naomi', 'Dynamic Fitness Coach', 'US • High Energy', 'us', 'female', 'AZnzlk1XvdvUeBnXmlld'],
  ['Benedict', 'Sherlockian Analytical Mind', 'UK • Mystery', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Lydia', 'Clear E-Learning Instructor', 'US • Education', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['Cole', 'Gritty Western Outlaw', 'US • Gaming', 'us', 'male', '2EiwWnXFnvU5JabPnv8n'],
  ['Savannah', 'Sweet Southern Storyteller', 'US • Fiction', 'us', 'female', 'oWAxZDx7w5VEj9dCyTzz'],
  ['Nigel', 'Dry British Wit', 'UK • Comedy', 'uk', 'male', 'CYw3kZ02Hs0563khs1Fj'],
  ['jade', 'Modern Startup Founder', 'US • Tech Pitch', 'us', 'female', 'jsCqWAovK2LkecY7zXl4'],
  ['Theodora', 'Regal Fantasy Queen', 'UK • RPG Character', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Atlas', 'Titan Deep Resonance', 'US • Epic Lore', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Daisy', 'Cheerful Morning Show', 'US • Radio', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['felix', 'Quick-Witted Essayist', 'UK • Video Essay', 'uk', 'male', 'Yko7PKHZNXotIFUBG7I9'],
  ['Madeline', 'Compassionate Therapist', 'US • Wellness', 'us', 'female', 'LcfcDJNUP1GQjkzn1xUU'],
  ['Grant', 'Seasoned Military Commander', 'US • Strategy', 'us', 'male', 'VR6AewLTigWG4xSOukaG'],
  ['Iris', 'Crisp Weather & Traffic', 'US • Broadcast', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['julian_uk', 'West End Stage Actor', 'UK • Theatrical', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Delilah', 'Sultry Lounge Narrator', 'US • Noir', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Wyatt', 'Heartland Country Voice', 'US • Americana', 'us', 'male', 'pqHfZKP75CvOlQylNhV4'],
  ['Imogen', 'Bright Cambridge Student', 'UK • Conversational', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Dante', 'Passionate Storyteller', 'US • Drama', 'us', 'male', 'ErXwobaYiN019PkySvjV'],
  ['Celeste', 'Cosmic Science Narrator', 'US • Astronomy', 'us', 'female', 'SAz9YHcvj6GT2YYXdXww'],
  ['Callum_sc', 'Highland Scottish Bard', 'UK • Scottish', 'uk', 'male', 'N2lVS1w4EtoT3dr4eOWO'],
  ['Summer', 'Gen-Z Creator & TikTok', 'US • Viral', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Asher', 'Calm Coding Mentor', 'US • Developer', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Rosalind', 'Period Drama Narrator', 'UK • Regency', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Baron', 'Booming Movie Announcer', 'US • Blockbuster', 'us', 'male', 'wViXBPUzp2ZZixB1xQuM'],
  ['Fiona', 'Warm Dublin Hostess', 'UK • Irish', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Micah', 'Thoughtful Book Reviewer', 'US • Literature', 'us', 'male', 'TxGEqnHWrfWFTfGW9XjX'],
  ['Gemma', 'Polished Corporate Concierge', 'UK • Assistant', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Rex', 'High-Octane Action Hero', 'US • Gaming', 'us', 'male', 'SOYHLrjzK2X1ezoPC6cr'],
  ['Miriam', 'Wise Grandmotherly Tale', 'US • Folklore', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['silas', 'Dark Fantasy Villain', 'UK • Boss Voice', 'uk', 'male', 'N2lVS1w4EtoT3dr4eOWO'],
  ['Melody', 'Lyrical & Sing-Song', 'US • Children', 'us', 'female', 'MF3mGyEYCl7XYWbV9V6O'],
  ['Brody', 'Surfer & Skate Lifestyle', 'US • Chill', 'us', 'male', 'bIHbv24MWmeRgasZH58o'],
  ['Vivian', 'Luxury Brand Spokesperson', 'US • Commercial', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['hugh', 'Warm Cotswolds Gentleman', 'UK • Countryside', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Tessa', 'Fast-Paced Tech News', 'US • Daily Brief', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['Orion', 'Deep Space Documentary', 'US • Science', 'us', 'male', 'pNInz6obpgDQGcFmaJgB'],
  ['Phoebe', 'Quirky Indie Game Character', 'US • RPG', 'us', 'female', 'jBpfuIE2acCO8z3wKNLl'],
  ['garrett', 'True Crime Podcast Host', 'US • Investigative', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Camilla', 'Aristocratic Duchess', 'UK • Royal RP', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Zane', 'Edgy Cyberpunk Hacker', 'US • Sci-Fi', 'us', 'male', 'TX3LPaxmHKxFdv7VOQHJ'],
  ['Daphne', 'Breezy Travel Vlogger', 'US • Wanderlust', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Malcolm', 'Stern Headmaster', 'UK • Academic', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Seraphina', 'Angelic Guided Sleep', 'US • Ambient', 'us', 'female', 'LcfcDJNUP1GQjkzn1xUU'],
  ['knox', 'Heavy Metal Radio DJ', 'US • Rock', 'us', 'male', 'yoZ06aMxZJJ28mfd3POQ'],
  ['Bridget', 'Cheerful Baker & Chef', 'UK • Culinary', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Holden', 'Wry Literary Narrator', 'US • Modern Fiction', 'us', 'male', 'iP95p4xoKVk53GoZ742B'],
  ['Eliza', 'Crisp Virtual Receptionist', 'US • IVR Pro', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['magnus', 'Norse Viking Chieftain', 'UK • Epic', 'uk', 'male', '2EiwWnXFnvU5JabPnv8n'],
  ['Sloane', 'Wall Street Financial Analyst', 'US • Markets', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['jude', 'Acoustic Singer-Songwriter', 'UK • Indie', 'uk', 'male', 'Yko7PKHZNXotIFUBG7I9'],
  ['Bianca', 'Fashion Runway Commentator', 'US • Style', 'us', 'female', 'jsCqWAovK2LkecY7zXl4'],
  ['corbin', 'Whispering Ghost Storyteller', 'US • Horror', 'us', 'male', 'g5CIjZEefAph4nQFvHAz'],
  ['Harriet', 'BBC History Presenter', 'UK • Documentary', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['trent', 'Evening Sports Anchor', 'US • Athletics', 'us', 'male', '5Q0t7uMcjvnagumLfvZi'],
  ['Ophelia', 'Melancholic Poetic Muse', 'UK • Classic Verse', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['derek', 'Friendly Auto Mechanic', 'US • DIY Guide', 'us', 'male', 'CwhRBWXzGAHq8TQ4Fs17'],
  ['Maren', 'Clean Scandinavian English', 'UK • Minimalist', 'uk', 'female', 'zrHiDhphv9ZnVXBqCLjz'],
  ['vance', 'Smooth Casino Host', 'US • Vegas', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Juliet', 'Romantic Audiobook Lead', 'UK • Romance', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['graham', 'Veteran Nature Filmmaker', 'UK • Wildlife', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Kendra', 'Empowering Life Coach', 'US • Motivation', 'us', 'female', 'AZnzlk1XvdvUeBnXmlld'],
  ['wesley', 'Friendly College Professor', 'US • Humanities', 'us', 'male', 'pqHfZKP75CvOlQylNhV4'],
  ['Tabitha', 'Playful Witchy Character', 'US • Fantasy', 'us', 'female', 'z9fAnlkpzviPz146aGWa'],
  ['elliot', 'Soft-Spoken Essayist', 'US • Philosophy', 'us', 'male', 'GBv7mTt0atIp3Br8iCZE'],
  ['Clementine', 'Warm Folksy Storyteller', 'US • Heartland', 'us', 'female', 'oWAxZDx7w5VEj9dCyTzz'],
  ['montgomery', 'Old-World British Butler', 'UK • Concierge', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Sierra', 'Outdoor Adventure Guide', 'US • Nature', 'us', 'female', 'SAz9YHcvj6GT2YYXdXww'],
  ['desmond', 'Deep Soulful Baritone', 'US • Jazz & Blues', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['pippa', 'Perky London Morning Host', 'UK • Pop Culture', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['caspian', 'Seafaring Captain', 'UK • Nautical', 'uk', 'male', 'D38z5RcWu1voky8WS1ja'],
  ['Mallory', 'Sharp Legal Analyst', 'US • Law & Order', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['stirling', 'Classic Car Reviewer', 'UK • Motoring', 'uk', 'male', 'Zlb1dXrM653N07WRdFW3'],
  ['Ainsley', 'Upbeat Culinary Host', 'US • Food Network', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['gideon_us', 'Solemn Courtroom Narrator', 'US • True Crime', 'us', 'male', 'pNInz6obpgDQGcFmaJgB'],
  ['Freya_uk', 'Nordic Myth Storyteller', 'UK • Lore', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['keegan', 'Energetic Esports Caster', 'US • Shoutcaster', 'us', 'male', 'ODq5zmih8GrVes37Dizd'],
  ['Lavinia', 'Victorian Gothic Narrator', 'UK • Classic Literature', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['reid', 'Calm Medical Explainer', 'US • Healthcare', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Talia', 'Warm Startup Product Lead', 'US • SaaS Demo', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['benson', ' jovial Storytime Grandpa', 'US • Nostalgia', 'us', 'male', 'flq6f7yk4E4fJM5XTYuZ'],
  ['Astrid', 'Crisp Sci-Fi Ship Computer', 'UK • Telemetry', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['colton', 'Ranch Hand & Rodeo Voice', 'US • Western', 'us', 'male', 'yoZ06aMxZJJ28mfd3POQ'],
  ['Veronica', 'Sleek Executive Assistant', 'US • Productivity', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['emmett', 'Enthusiastic Science Guy', 'US • STEM', 'us', 'male', 'bVMeCyTHy58xNoL34h3p'],
  ['Cordelia', 'Shakespearean Stage Actress', 'UK • Classical', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['dashiell', 'Hardboiled Pulp Narrator', 'US • Detective', 'us', 'male', 'N2lVS1w4EtoT3dr4eOWO'],
  ['Brynn', 'Friendly Customer Success', 'US • Helpdesk', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['alec', 'Smart FinTech Explainer', 'UK • Banking', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Lorelei', 'Dreamy Late-Night Poet', 'US • Indie Radio', 'us', 'female', 'piTKgcLEGmPE4e6mEKli'],
  ['warren', 'Steady Documentary Voice', 'US • Biography', 'us', 'male', '29vD33N1CtxCmqQRPOHJ'],
  ['Nadia', 'Global Affairs Anchor', 'UK • World News', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['quinn', 'Androgynous Modern Narrator', 'US • Contemporary', 'us', 'female', 'SAz9YHcvj6GT2YYXdXww'],
  ['thatcher', 'Rugged Outdoorsman', 'US • Survival', 'us', 'male', '2EiwWnXFnvU5JabPnv8n'],
  ['Esme', 'Gentle Nursery Storyteller', 'UK • Early Learning', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['kieran', 'Lively Belfast Storyteller', 'UK • Northern Irish', 'uk', 'male', 'D38z5RcWu1voky8WS1ja'],
  ['Helena', 'Dramatic Opera & Arts Host', 'UK • Classical Radio', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['tucker', 'Friendly DIY Woodworker', 'US • Workshop', 'us', 'male', 'iP95p4xoKVk53GoZ742B'],
  ['Sabrina', 'Chic Lifestyle Influencer', 'US • Fashion', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['clarence', 'Warm Gospel & Soul Speaker', 'US • Inspirational', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Annabelle', 'Sweet Romance Novelist', 'US • Audiobook', 'us', 'female', 'oWAxZDx7w5VEj9dCyTzz'],
  ['hamish', 'Edinburgh Festival Host', 'UK • Scottish', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Kinsley', 'Bright EdTech Tutor', 'US • K-12 Learning', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['soren', 'Calm Architecture Critic', 'UK • Design', 'uk', 'male', 'Yko7PKHZNXotIFUBG7I9'],
];

for (let i = 0; i < EXTRA_VOICE_PROFILES.length && CURATED_ELEVENLABS_VOICES.length < 200; i++) {
  const [name, style, tag, accent, gender, baseVoiceId] = EXTRA_VOICE_PROFILES[i];
  CURATED_ELEVENLABS_VOICES.push({
    id: `${baseVoiceId}__${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    realVoiceId: baseVoiceId,
    name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_.*$/, ''),
    style,
    tag,
    accent,
    gender,
    category: 'library',
    previewUrl: '',
  });
}

function mapVoiceRecord(v) {
  const labels = v.labels || {};
  const rawAccent = String(labels.accent || v.accent || 'american').toLowerCase();
  const rawGender = String(labels.gender || v.gender || 'female').toLowerCase();
  const rawUseCase = String(labels.use_case || labels['use case'] || v.use_case || v.category || 'Conversational');
  const rawDesc = String(labels.description || labels.age || v.description || 'Expressive & Natural');

  const isUk = /british|uk|english|scottish|irish|australian/i.test(rawAccent);
  const accentLabel = rawAccent
    ? rawAccent.charAt(0).toUpperCase() + rawAccent.slice(1)
    : 'Global';

  const cleanDesc = rawDesc.length > 42 ? rawDesc.slice(0, 42).trim() + '...' : rawDesc;
  const cleanUseCase = rawUseCase.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: v.voice_id || v.public_owner_id || v.id,
    name: (v.name || 'Voice').split(' - ')[0].trim(),
    fullName: v.name || 'Voice',
    style: cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1),
    tag: `${accentLabel} • ${cleanUseCase}`,
    accent: isUk ? 'uk' : 'us',
    gender: rawGender.includes('male') && !rawGender.includes('female') ? 'male' : 'female',
    category: v.category || 'library',
    previewUrl: v.preview_url || '',
  };
}

class ElevenLabsTTSService {
  async fetchVoices({ apiKey = '', search = '', pageSize = 200 } = {}) {
    const key = String(apiKey || process.env.ELEVENLABS_API_KEY || '').trim();
    const q = String(search || '').trim();

    if (!key) {
      return {
        success: true,
        voices: CURATED_ELEVENLABS_VOICES,
        authenticated: false,
      };
    }

    try {
      const headers = {
        'xi-api-key': key,
        Accept: 'application/json',
      };

      const combined = [];
      const seen = new Set();

      const addVoice = (item, isMapped = false) => {
        const mapped = isMapped ? item : mapVoiceRecord(item);
        if (mapped && mapped.id && !seen.has(mapped.id)) {
          seen.add(mapped.id);
          combined.push(mapped);
        }
      };

      if (q) {
        const [v2Res, sharedRes] = await Promise.allSettled([
          fetch(`https://api.elevenlabs.io/v2/voices?search=${encodeURIComponent(q)}&page_size=100`, { headers }),
          fetch(`https://api.elevenlabs.io/v1/shared-voices?search=${encodeURIComponent(q)}&page_size=100`, { headers }),
        ]);

        if (v2Res.status === 'fulfilled' && v2Res.value.ok) {
          const data = await v2Res.value.json();
          for (const item of data.voices || []) addVoice(item);
        }
        if (sharedRes.status === 'fulfilled' && sharedRes.value.ok) {
          const sData = await sharedRes.value.json();
          for (const item of sData.voices || []) addVoice(item);
        }
      } else {
        // Fetch personal + premade + top shared library voices up to 200
        const [v1Res, sharedPage0, sharedPage1] = await Promise.allSettled([
          fetch('https://api.elevenlabs.io/v1/voices', { headers }),
          fetch('https://api.elevenlabs.io/v1/shared-voices?page_size=100&page=0', { headers }),
          fetch('https://api.elevenlabs.io/v1/shared-voices?page_size=100&page=1', { headers }),
        ]);

        let authOk = false;
        if (v1Res.status === 'fulfilled' && v1Res.value.ok) {
          authOk = true;
          const data = await v1Res.value.json();
          for (const item of data.voices || []) addVoice(item);
        }
        if (sharedPage0.status === 'fulfilled' && sharedPage0.value.ok) {
          authOk = true;
          const sData0 = await sharedPage0.value.json();
          for (const item of sData0.voices || []) addVoice(item);
        }
        if (sharedPage1.status === 'fulfilled' && sharedPage1.value.ok) {
          authOk = true;
          const sData1 = await sharedPage1.value.json();
          for (const item of sData1.voices || []) addVoice(item);
        }

        // Top up to 200 voices with our curated voices if API returned fewer than 200
        for (const curated of CURATED_ELEVENLABS_VOICES) {
          if (combined.length >= 200) break;
          addVoice(curated, true);
        }

        return {
          success: authOk,
          authenticated: authOk,
          voices: combined.slice(0, Math.max(pageSize, 200)),
        };
      }

      // If search had results, return them; otherwise filter curated 200 voices
      if (combined.length > 0) {
        return {
          success: true,
          authenticated: true,
          voices: combined.slice(0, 200),
        };
      }

      return {
        success: true,
        authenticated: true,
        voices: CURATED_ELEVENLABS_VOICES,
      };
    } catch (err) {
      return {
        success: false,
        authenticated: false,
        error: err.message || 'Failed to fetch ElevenLabs voices',
        voices: CURATED_ELEVENLABS_VOICES,
      };
    }
  }

  async synthesize(text, voiceId = 'JBFqnCBsd6RMkjVDRZzb', apiKey = '', modelId = 'eleven_v3') {
    const key = String(apiKey || process.env.ELEVENLABS_API_KEY || '').trim();
    const cleanText = kokoroTTS.formatForExpressiveSpeech(text);
    if (!cleanText) {
      return { success: false, error: 'Empty text', cleanText: '' };
    }
    if (!key) {
      return { success: false, error: 'ELEVENLABS_API_KEY_MISSING', cleanText };
    }

    // Extract real ElevenLabs voice_id if a composite curated ID (`voiceId__profile`) was selected
    const rawId = String(voiceId || 'JBFqnCBsd6RMkjVDRZzb').split('__')[0];
    const targetVoice =
      rawId &&
      !rawId.startsWith('af_') &&
      !rawId.startsWith('am_') &&
      !rawId.startsWith('bf_') &&
      !rawId.startsWith('bm_')
        ? rawId
        : 'JBFqnCBsd6RMkjVDRZzb';

    const preferredModel = modelId || 'eleven_v3';
    // Try user's selected model first (e.g., eleven_v3), and if account tier doesn't support v3 yet, automatically fall back to eleven_flash_v2_5
    const candidateModels =
      preferredModel === 'eleven_v3'
        ? ['eleven_v3', 'eleven_flash_v2_5', 'eleven_multilingual_v2']
        : [preferredModel, 'eleven_flash_v2_5'];

    for (const currentModel of candidateModels) {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const queryParams =
          currentModel === 'eleven_v3'
            ? 'output_format=mp3_44100_128'
            : 'optimize_streaming_latency=3&output_format=mp3_44100_128';

        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(targetVoice)}?${queryParams}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': key,
              'Content-Type': 'application/json',
              Accept: 'audio/mpeg',
            },
            body: JSON.stringify({
              text: cleanText,
              model_id: currentModel,
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.78,
                style: 0.15,
                use_speaker_boost: true,
              },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[ElevenLabsTTS] Model "${currentModel}" HTTP ${res.status}:`, errText);
          // If unauthorized (401), don't retry other models
          if (res.status === 401) {
            return {
              success: false,
              error: 'Invalid ElevenLabs API key',
              cleanText,
            };
          }
          continue;
        }

        const arrayBuf = await res.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuf).toString('base64');
        const durationMs = Date.now() - startTime;
        console.log(
          `[ElevenLabsTTS] Synthesized "${cleanText}" in ${durationMs}ms with model "${currentModel}" & voice "${targetVoice}"`
        );

        return {
          success: true,
          base64Audio,
          mimeType: 'audio/mpeg',
          cleanText,
          durationMs,
          modelUsed: currentModel,
        };
      } catch (err) {
        console.warn(`[ElevenLabsTTS] Attempt with "${currentModel}" failed:`, err.message);
      }
    }

    return {
      success: false,
      error: 'ElevenLabs synthesis failed',
      cleanText,
    };
  }
}

module.exports = new ElevenLabsTTSService();
