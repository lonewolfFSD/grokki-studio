import spotifyLogo from '../assets/logos/spotify.svg';
import applemusicLogo from '../assets/logos/applemusic.svg';
import ytmusicLogo from '../assets/logos/ytmusic.svg';
import amazonmusicLogo from '../assets/logos/amazonmusic.svg';
import soundcloudLogo from '../assets/logos/soundcloud.svg';

export interface MusicService {
  id: string;
  name: string;
  logo: string;
  appUrl: string;
  webUrl: string;
}

export const MUSIC_SERVICES: Record<string, MusicService> = {
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    logo: spotifyLogo,
    appUrl: 'spotify://',
    webUrl: 'https://open.spotify.com',
  },
  applemusic: {
    id: 'applemusic',
    name: 'Apple Music',
    logo: applemusicLogo,
    appUrl: 'music://',
    webUrl: 'https://music.apple.com',
  },
  ytmusic: {
    id: 'ytmusic',
    name: 'YouTube Music',
    logo: ytmusicLogo,
    appUrl: 'https://music.youtube.com',
    webUrl: 'https://music.youtube.com',
  },
  amazonmusic: {
    id: 'amazonmusic',
    name: 'Amazon Music',
    logo: amazonmusicLogo,
    appUrl: 'https://music.amazon.com',
    webUrl: 'https://music.amazon.com',
  },
  soundcloud: {
    id: 'soundcloud',
    name: 'SoundCloud',
    logo: soundcloudLogo,
    appUrl: 'https://soundcloud.com',
    webUrl: 'https://soundcloud.com',
  },
};
