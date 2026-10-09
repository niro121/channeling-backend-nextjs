import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu';
  return {
    name: `${brand} Management`,
    short_name: 'Management',
    description: `${brand} management statistics`,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a7046',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
