const SITE_URL = 'https://kreativtools.com';

const FOOTER_SECTIONS = {
  product: [
    ['Tools', '/tools/'],
    ['Learn', '/learn/'],
    ['Updates', '/changes/'],
    ['Workflows', '/workflows/'],
  ],
  popular: [
    ['PDF Fill & Sign', '/pdf/fill-sign/'],
    ['Image Compress', '/image/compress/'],
    ['PDF Merge', '/pdf/merge/'],
    ['Font to Webfont', '/fonts/webfont-convert/'],
  ],
  company: [
    ['About', '/about/'],
    ['Privacy Policy', '/privacy/'],
    ['Terms', '/terms/'],
    ['Contact', '/contact/'],
  ],
};

const JOB_PATHS = [
  {
    title: 'Make an image smaller',
    label: 'Image',
    description: 'Compress one image for web, email, ecommerce, or quick upload limits.',
    href: '/image/compress/',
    icon: 'fa-file-image',
    tags: ['JPG', 'PNG', 'WebP'],
  },
  {
    title: 'Sign or fill a PDF',
    label: 'PDF',
    description: 'Add names, dates, checkboxes, and signatures to an existing PDF.',
    href: '/pdf/fill-sign/',
    icon: 'fa-signature',
    tags: ['forms', 'signature'],
  },
  {
    title: 'Combine PDF files',
    label: 'PDF',
    description: 'Merge several PDFs into one ordered handoff document.',
    href: '/pdf/merge/',
    icon: 'fa-layer-group',
    tags: ['merge', 'handoff'],
  },
  {
    title: 'Use a guided workflow',
    label: 'Guided',
    description: 'Open Image Prep, PDF Delivery, or Audio Delivery when several steps belong together.',
    href: '/tools/#guidedWorkflows',
    icon: 'fa-route',
    tags: ['multi-step', 'templates'],
    featured: true,
  },
  {
    title: 'Convert audio for sharing',
    label: 'Audio',
    description: 'Turn heavier audio into MP3 or build a cleaner repeat audio export.',
    href: '/audio/to-mp3/',
    icon: 'fa-music',
    tags: ['MP3', 'WAV'],
  },
  {
    title: 'Prepare fonts for a website',
    label: 'Fonts',
    description: 'Convert OTF or TTF files into webfont formats and CSS.',
    href: '/fonts/webfont-convert/',
    icon: 'fa-font',
    tags: ['WOFF2', 'CSS'],
  },
];

const JOB_ROUTER_VARIANTS = {
  home: {
    eyebrow: 'Choose by Outcome',
    title: 'Pick the job you need done.',
    description: 'Each card sends you to the fastest quick tool or guided workflow path.',
    limit: 6,
  },
  tools: {
    eyebrow: 'Job Shortcuts',
    title: 'Open the right tool or guided workflow by outcome.',
    description: 'If search feels too broad, start with one of the common jobs below.',
    limit: 6,
  },
  learn: {
    eyebrow: 'Job Paths',
    title: 'Learn by delivery outcome.',
    description: 'Each path gives you the guide, the tool, and the workflow alternative when the job repeats.',
    limit: 6,
  },
};

module.exports = {
  FOOTER_SECTIONS,
  JOB_PATHS,
  JOB_ROUTER_VARIANTS,
  SITE_URL,
};
