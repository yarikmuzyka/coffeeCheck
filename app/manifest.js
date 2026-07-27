export default function manifest() {
  return {
    name: 'coffee logger — Brew Journal',
    short_name: 'coffee logger',
    description: 'Відстежуй specialty каву, заварювання та власні смакові вподобання',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff6ec',
    theme_color: '#ff6b35',
    orientation: 'portrait',
    lang: 'uk',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
