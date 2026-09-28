import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'mcode',
  description: 'mcode — terminal-first, multi-model AI coding CLI',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/USER-GUIDE' },
      { text: 'CLI', link: '/CLI' },
      { text: 'API', link: '/API' },
      { text: 'Deployment', link: '/DEPLOYMENT' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'User Guide', link: '/USER-GUIDE' },
          { text: 'CLI Reference', link: '/CLI' },
          { text: 'Deployment', link: '/DEPLOYMENT' },
          { text: 'Troubleshooting', link: '/TROUBLESHOOTING' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API', link: '/API' },
          { text: 'Settings Reference', link: '/zcode-settings-reference' },
          { text: 'Icons Reference', link: '/zcode-icons-reference' },
          { text: 'Smart Engine', link: '/zcode-smart-engine' },
        ],
      },
      {
        text: 'Project',
        items: [
          { text: 'Roadmap', link: '/ROADMAP' },
          { text: 'Scaling', link: '/SCALING' },
          { text: 'Benchmarks', link: '/BENCHMARKS' },
        ],
      },
    ],
  },
});
