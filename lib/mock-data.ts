export const dashboardData = {
  stats: [
    {
      label: "Total Sessions",
      value: "24",
      change: "+12% this month",
      icon: "calendar_today",
      tone: "primary",
    },
    {
      label: "Skills Exchanged",
      value: "08",
      change: "active arsenal",
      icon: "auto_awesome",
      tone: "secondary",
    },
    {
      label: "Focus Hours",
      value: "112",
      change: "community rank: #14",
      icon: "schedule",
      tone: "tertiary",
    },
  ],
  teaching: ["UI Architecture", "Cinema 4D", "Type Design"],
  learning: ["Python for Artists", "Pottery"],
  exchange: {
    title: "Master Acoustic Theory with Elena.",
    description:
      "Elena wants to learn UI Architecture - your specialty.",
    mentorImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDy1inK-0NHk5sgcLZ7NcxDdxPhd9wa-sJDElhuve5HB54oXu8z5_eWCoWwhE7Bc3bcswyp7rarsLZyB-g8xH1Rq9kW0G5gw95qPMhzyHBffOiZi8xeH7GzPFGGvDitgxo8ep5PQ6WH2gPeanJGgkGlAeQXSNn2NWgMyFLXcRq89WCzX4gV9vnISyRSnjR6N9rKrhlrodB3ybAj3pcADK5ZnBpyjb6u5QrsnBkpKtu2coLevZJoTA7Xj0-PNodRawHbFLpYX5fToXQ",
    userImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDHNb7c3odI2vJGlpdLwepzZzG-iHGEEP0mz0ZJVt0RlvDbYZrrFrSr0wHTLTEGcn5sK2pTB2bvw_Hf_7IFB_47VQjGUnz7Unskv_hAcqkwTBVpXSFd5-0QmLMvBVQIlyh1X8qtEPRNFCS77PoCcmbSwmri2Ws3BoT201ckOfRiKO9vXo31pIvW54BAlp-pOrH3of3-SNI0oDhlY4_lWPrA_wpfCq695T7L0tc2mQcGYMLKANW5aTYusQVKAacqpuay8BTLfoss0P8",
  },
  quickActions: [
    { icon: "person_search", label: "Find Mentor", href: "/mentors" },
    { icon: "add_box", label: "Add Skill", href: "/profile" },
  ],
  upcomingSessions: [
    {
      variant: "dashboard" as const,
      id: "cinema4d-lighting-basics",
      label: "In 45 Minutes",
      title: "Cinema 4D: Lighting Basics",
      subtitle: "Mentoring Sarah L.",
      icon: "video_call",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA9ZF0cnQdvXVvVehdxOrwhOlYfWuVyKCfN25VuI1uxNhYyfP8MvKEUNf9tHLujQLwpi-6yZQpROp32LdWaQNBwk1aBw0wYnCUkd_-whK6gd5mYj2DLsE5AgyQaCrTBxuPZA5iNhy3hGmXBnPWKAz-f-kKFPmjzVCjj58bDMz1bhWHsfW8rK6Lyr6L67mVGyCD-jcLVUxsKRb1Q0-176_n6bYmuh30P4gpzIk_menaJeNzMI3WZ2FFnG0JP49Y3nQjGSboRo3sX4J8",
      href: "/sessions/advanced-clay-glazing-techniques",
      tone: "primary" as const,
    },
    {
      variant: "dashboard" as const,
      id: "advanced-pottery-wheel",
      label: "Tomorrow, 10:00 AM",
      title: "Advanced Pottery Wheel",
      subtitle: "Learning from Marcus R.",
      icon: "location_on",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCdlhvo6gmbnX-zDKwKe8msdV0nqKa0jLJLqPZSNjURee07QsUkPkX3t6dFZ4arWtSCNpuEgKVW2qz2CjI1_JdSgI9cWoW5AaNcllTL8cLZ07vtsvFlJGS4C8NcRvhW8Ds9IQcGT7gtMQUVauw7QbpeOzJYvsVwRgUt97aXXd6o-GHMY_Ers7mQanI31Jg7WrlNFWiZ6VhkLftt-KBs_pm17UmkrlDc4xNJXCXFTiPG3Rv1Au3lBrqhma4IoK8wCup7fCPbApuq7Qw",
      href: "/sessions/advanced-clay-glazing-techniques",
      tone: "default" as const,
    },
  ],
  repositorySnippet: [
    {
      title: "Grid Systems PDF",
      href: "/repository/typography-architectural-foundation",
    },
    {
      title: "Octane Render Settings",
      href: "/repository/typography-architectural-foundation",
    },
  ],
};

export const mentorsData = {
  filters: ["Design", "Pottery", "Code", "Strategy"],
  mentors: [
    {
      id: "elena-vance",
      name: "Elena Vance",
      role: "Principal Brand Architect",
      quote:
        "I help craftspeople refine their visual identity through the lens of modern minimalism and structural integrity.",
      tags: ["Branding", "Typography", "Systems"],
      rating: "4.9",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBf6wBKu3UCBUYgMs9io_t0mMJW0yNOy4jatm6_woTrGhsvspaBM5L2fYRJSmx4ntdcp24LEuNVzhX06ScaFV_FD3TuIXdot7ALdMZZsXUTm0nL_JU2L2--nWB2rpNmKA9EvxFD3TAgnJz7EMsnYIGGDzsWeQOCxJ3xTMbGKU5kYMJGHyKzqg14MtwVav1qbT6aMqfj6PP1NkD4SDmyqsMyFr0zL0c_SZTvnPTYFe3bMMuw1g9bggANJRiYOCo85IW7dvTsqYRPPRw",
      location: "Copenhagen, DK",
      narrative:
        "Refining visual identity systems through modern minimalism, structural rhythm, and premium brand craft.",
      coverImage:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDhXHwghWp8PHrhx40pSvhPrMAH_VX3MvIW2VQMv9zVYeAkIxUOjhdqolXkoTH3qbuILu-4RMILwt1KVBd0Kmm9C-2tmHwVe2uEtVHk2gcsXjLmwF2DHM0HcHq4PSobJBhYmXdYqpriEyi_9_0jWPeZFRZy35LLHmKuyh8fwiEJdEWk3MYo8bInwkkNobe0mu0PiCR4so5G73zcw3Vw3WLQ7o6WpaC3LbWr7mxFiZZHAXWnDAq-DVkiLpiN0dJ-f2NzNKDact1JUqQ",
      profileHref: "/profile?mentor=elena-vance",
      connectHref: "/profile?mentor=elena-vance",
      tilt: "left" as const,
    },
    {
      id: "marcus-thorne",
      name: "Marcus Thorne",
      role: "Tech Lead @ Atelier Systems",
      quote:
        "Bridging the gap between creative expression and technical scalability. Let's build something that lasts.",
      tags: ["Backend", "Cloud", "Go"],
      rating: "5.0",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuATbDtzDxX1v2YhoPus3i7G7wtLqJF35cAZfULUo3VqWopLZKrIfDBXEfGuu9HoUNQt80gugUJMfiNIw00W49pRDdGFNWplufOCuaDdmRZfv_4ay2xg_wOa1iHcknJlwdlMvNN5Jx2A7fkMl4clAqAMq8aUgRFqKWhltMkJDGshGjWvflHUe_jwggGWavxxlO6vJUusK0XXxyY1OBmH5aQ5KZBnYMGrjDsV7vH3AObEFytbtHPZJyp3-eddS81T77YPbwAnXJpnyvo",
      location: "Oslo, NO",
      narrative:
        "Connecting durable engineering systems with creative ambition, from cloud architecture to collaborative tooling.",
      coverImage:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDhXHwghWp8PHrhx40pSvhPrMAH_VX3MvIW2VQMv9zVYeAkIxUOjhdqolXkoTH3qbuILu-4RMILwt1KVBd0Kmm9C-2tmHwVe2uEtVHk2gcsXjLmwF2DHM0HcHq4PSobJBhYmXdYqpriEyi_9_0jWPeZFRZy35LLHmKuyh8fwiEJdEWk3MYo8bInwkkNobe0mu0PiCR4so5G73zcw3Vw3WLQ7o6WpaC3LbWr7mxFiZZHAXWnDAq-DVkiLpiN0dJ-f2NzNKDact1JUqQ",
      profileHref: "/profile?mentor=marcus-thorne",
      connectHref: "/profile?mentor=marcus-thorne",
      tilt: "right" as const,
    },
    {
      id: "sophia-laine",
      name: "Sophia Laine",
      role: "Senior Content Strategist",
      quote:
        "Storytelling is a craft. I teach how to weave narratives that resonate with human intuition and emotion.",
      tags: ["Writing", "Strategy", "PR"],
      rating: "4.8",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBmEvtYwolirF8OaM8uAj3qTQStIVYHuDsbWFxK2sIvP5iSvrwgTnulzg99YgPEENl0irAtL9w1lKZFuvVIzP0JlrWJCCuOjOcOw8-YPkP43fG4OaqxZZIjnm6TnjyMf_LRvrhjRsYjmIth-JLvotOcyhDQK859OSNqOOo04j3wyWjXBTpS30w76VXVvgU9sFDfKpz-5TRToiTHPRUUhV8lRvR_KieLxAV6APH4kLexZg4A5dGeHj8LEFV2fuzEEgXDOvblvcHGmqU",
      location: "Paris, FR",
      narrative:
        "Teaching story-led product narratives and human-centered communication systems for thoughtful digital experiences.",
      coverImage:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDhXHwghWp8PHrhx40pSvhPrMAH_VX3MvIW2VQMv9zVYeAkIxUOjhdqolXkoTH3qbuILu-4RMILwt1KVBd0Kmm9C-2tmHwVe2uEtVHk2gcsXjLmwF2DHM0HcHq4PSobJBhYmXdYqpriEyi_9_0jWPeZFRZy35LLHmKuyh8fwiEJdEWk3MYo8bInwkkNobe0mu0PiCR4so5G73zcw3Vw3WLQ7o6WpaC3LbWr7mxFiZZHAXWnDAq-DVkiLpiN0dJ-f2NzNKDact1JUqQ",
      profileHref: "/profile?mentor=sophia-laine",
      connectHref: "/profile?mentor=sophia-laine",
      tilt: "left" as const,
    },
    {
      id: "julian-ray",
      name: "Julian Ray",
      role: "Master Artisan Potter",
      quote:
        "Exploring the tactile relationship between earth and hand. Specializing in high-fire stoneware and organic forms.",
      tags: ["Ceramics", "Art", "Studio"],
      rating: "4.9",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCLnLSKHQTEt1Dd4sBAwQ1WUjLIMhGdjPMInFF-ORDgoilF83cpgHyomyTM58OXIspOERieKuEm00TGMn7FkDqfWi6Q9LiQBgQJiQDBKAJMLB3sWD30IBDy45uXCaFnPzDvpsPfaO3l-qgo71QicJvK84yhZiXpXcghdva2_FH4yBdNEXr_-CR_GPxpDOtK9bBeilEgm2siqr4HfESPdG_o6gKXRBSzRXq5NCaf2RKiwO7GDVrqbtr5mWXyV350jNBhTW_bobbET1g",
      location: "Lisbon, PT",
      narrative:
        "Exploring earth, form, and gesture through high-fire stoneware, tactile teaching, and studio-centered mentorship.",
      coverImage:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDhXHwghWp8PHrhx40pSvhPrMAH_VX3MvIW2VQMv9zVYeAkIxUOjhdqolXkoTH3qbuILu-4RMILwt1KVBd0Kmm9C-2tmHwVe2uEtVHk2gcsXjLmwF2DHM0HcHq4PSobJBhYmXdYqpriEyi_9_0jWPeZFRZy35LLHmKuyh8fwiEJdEWk3MYo8bInwkkNobe0mu0PiCR4so5G73zcw3Vw3WLQ7o6WpaC3LbWr7mxFiZZHAXWnDAq-DVkiLpiN0dJ-f2NzNKDact1JUqQ",
      profileHref: "/profile?mentor=julian-ray",
      connectHref: "/profile?mentor=julian-ray",
      featured: true,
      badge: "Top Match",
      tilt: "none" as const,
    },
  ],
};

export const mentors = mentorsData.mentors;

export const sessionsListData = {
  featured: {
    variant: "featured" as const,
    id: "mastering-organic-layouts",
    category: "UI Design",
    status: "Live",
    title: "Mastering Organic Layouts",
      mentor: "Elena Moretti",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAgjRGdWb5n9Yc7ul6Y_nFysaQk1hJbd-Dayjxe3yp5EBlMqiZxAF4m-S2NBVMdQ_Hgf8aXGsF1aIhi14cB-Tbn3ybldkQ8bUbSfV6nPgVbGV2szNaUkHyMFT3BRcZoI3q3H5r9RJhwVIAW_jcWFbPVhkQy0TuqnJkl0-KBUM0jssL-XdWBdvWqNdGeXF2U6ZMTvrWj4OLjwaBc0B_KlAqUxPSJuCu12pKPQ2FIXbqE0gYOnbv99jX6Sr2CIS_6utO7SA1AMAsTzqc",
    joinHref: "/call",
    detailHref: "/sessions/advanced-clay-glazing-techniques",
  },
  upcoming: [
    {
      variant: "upcoming" as const,
      id: "advanced-clay-glazing-techniques",
      title: "Advanced Pottery Glazing",
      mentor: "Julian Varkas",
      date: "Oct 24, 2023",
      time: "14:00 - 15:30",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuC8boPBdFGP-IMbqNnk-JsknM7pCrLcRwZf9rRH-CsJVMwMfaeXlLno_QtphKXJozeo5Fp7lrcwogS1xzcuAId7rjYTxS_3N5yQIAygW1IL-KnwxZJTMSLlTUCbJOOcLY0VaaX5J3EAb-Kim2Fj6_Ohq0CVE40YQVz6zb46s3kBzue5zuZkWxeOPyME_z1zNBTGfA_PulbAc0AVkU2cdyCIE69QAzqXgt1nzXv8zAELrxah_uNHhwI2wE3K68cc7gDUxeEhWmtcM8U",
      href: "/sessions/advanced-clay-glazing-techniques",
    },
    {
      variant: "upcoming" as const,
      id: "sustainable-dyeing-techniques",
      title: "Sustainable Dyeing Techniques",
      mentor: "Sarah Chen",
      date: "Oct 27, 2023",
      time: "10:00 - 11:30",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD_yMrZmwUgCyW5CNB19aTrojBVlDHw-uJ0pjMsHsKBkYP0whYUOEWBU_p6uGIo8Nx0IfG2mR5srANlCFKSPHJYt-f0VTLbxitWLIoy9pJwJ8BCcSzB_GZKKa_6qg7P_Iibh3Z6y71XpraAvR7aS8lq6QCAto-lg47G9Wrp-Gm_VpfzlCVINQ6H1Cx4uvHyJycWsNWWs-Rmq3-84NCJh3rCzhfJ8SEyxCDLggW79hUP4w2VUh60oixooFiYUq2xcFKDWVWSFA9_bWM",
      href: "/sessions/advanced-clay-glazing-techniques",
    },
  ],
  past: [
    {
      variant: "past" as const,
      id: "typographic-systems",
      title: "Typographic Systems",
      mentor: "Robert Glass",
      date: "Oct 12, 2023",
      quote: "Great insights on grid fluidity.",
      ctaLabel: "Review",
      ctaHref: "/sessions/advanced-clay-glazing-techniques",
    },
    {
      variant: "past" as const,
      id: "foundations-of-woodworking",
      title: "Foundations of Woodworking",
      mentor: "Marcus Thorne",
      date: "Oct 05, 2023",
      quote: "Shared 2 resources with you.",
      ctaLabel: "Repository",
      ctaHref: "/repository/typography-architectural-foundation",
    },
  ],
};

export const sessions = [
  sessionsListData.featured,
  ...sessionsListData.upcoming,
  ...sessionsListData.past,
];

export const sessionDetailsById = {
  "advanced-clay-glazing-techniques": {
    title: "Advanced Clay Glazing Techniques",
    category: "Ceramics",
    duration: "60 Minute Mastery",
    liveLabel: "Live in 5 minutes",
    mentor: {
      name: "Elena Rostova",
      role: "Master Ceramicist at The Kiln Collective",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDSRoNKFfmqD-thiKqGaIbeWL4OP5ERWJnTEYbhLsBIz3xOkIA390q6pd43lx7MTLynBLMfsn7pzNKIfvYctyqy7cPx37kZHv7lV8hpHC1TeZIshb3jmAjNzPvA6fUhHR0Jai6xv6-_UFb-lmYyEY6zD1BjNj4qBKV12ZvU9ch6tNUW-K9L2LhxEiEj3eXeoKjaaV2wHVCab31Z4X8e2QlL1h0hVnSERpIqSUP_mLuqVkp9m0g2cHDUjETR5lXeOTCqwPg3x9NLRNk",
    },
    schedule: {
      month: "Oct",
      day: "24",
      title: "Today, 2:00 PM",
      timezone: "Central European Time (GMT+2)",
    },
    agenda: [
      "Understanding chemical compositions of high-fire glazes and their reactions.",
      'Demonstration of the "Atmospheric Layering" brush technique.',
      "Live troubleshooting of common pooling and crazing issues.",
    ],
    sharedResources: [
      {
        variant: "attachment" as const,
        title: "Chemical_Safety_Sheet.pdf",
        subtitle: "Pre-session Reading - 1.2 MB",
        icon: "description",
        actionIcon: "download",
      },
      {
        variant: "attachment" as const,
        title: "Inspiration Moodboard",
        subtitle: "Pinterest Link - External",
        icon: "link",
        actionIcon: "open_in_new",
      },
    ],
    connectionDetails: [
      { icon: "shield", label: "End-to-end Encrypted Call" },
      { icon: "high_quality", label: "Ultra HD 4K Support" },
      { icon: "emergency_recording", label: "Cloud Recording (Automated)" },
    ],
    inviteLink: "skillcache.app/j/823-991",
    groupMembers: [
      {
        name: "Alex Chen",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuDbQvvQsstLlyKyfBLmJuFtpGLbWSRg6EP86z-w1XdNVsjgrBTxgaQvsHc33s-WfQDCypAzOYYas87Ut0_bKdukEEEMPpGHcjUoqr4qtdswHohu2Qk2FcOusF-0CmlFZ1LZJtDi2v-IUWjyC6Pl36UFHnDhDFWnn9EHw3ij4RZ4scMnyKGf0_f7QLDDCfZYIB5LMmaxJk3piHKw0pYADtrj15gJO-_Rfkyq2349PAmh3KbaRUvzKl0Ds6BX9NLSAVcQrK010NUkZLw",
        online: true,
      },
      {
        name: "Maya Patel",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuC26CDWAeaGP6UsLGSgt3XiV86XbYgv3MnOGsgC8VAZKPVLydgwWmdC-1uEv2O18SNItmHo3rpk-q6vfuJ9w53VcIwH2u9d1qfwH0kuahNgUjkbIrLuPVrQvLmIO_RYYLY2nQh1sh3C3s-e7d9OsDq5tXu6k9l5mBI_zdWvQNVPklbL7a57Z_fCFO6SHIwnTX6ou8q8PkQQ9D2P4kfEQHklOrFsBmy85sP2W8YXP8u-9glAbtU6ftOiADrrBgIqYf0cHZQQgtlm0yE",
        online: false,
      },
      { name: "Julian V.", avatar: "", online: true, you: true },
    ],
    exchangeText:
      "In return for Elena's Ceramics expertise, you are sharing UI Prototyping in Figma next Tuesday.",
    exchangeMentorAvatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAEm70t0j2tNwSpSAthS1pV3DpW36RLVE1ZcQdyElPoTiCILHwC8q-AbPB-wgoGMxHEfNOFYFiZ-bXsUYvaeK9xvDHy6GJPG6EynWtP5kfGX4fEWJ-Ko3Mf-71EhtDsfhjA3keTqc4UmzuAtwlTsayPMmOdT2iVP2cn3ohj_uLLd5itcB--_sZPiN9v7OhtpDzvz5wx1tv6SrDdeq0ni4Fa9LvMGINEI0M3fEC1IlmE8S2a5BmPo_obHYHAJvt845NhxWInxOlHcFk",
    exchangeUserAvatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBGZasLjzLIYWLGXzjcOmfD_CQPs9KbLuTBb-uYrY-j2NS6sfGdNUZ1rAg1mOYbB1iwmLbzzZIJ1oCpEUSdQmJ6Oe7I2T5mWsTNT2h_qGYNIG9lxmU3NUUCR7tDgCiR6enn0zKSBnssIT9Jsc0wN5gI0z1weWv-nN4G7tcCZ6FBbi-ZGrxf4BuQ59QsDTOYM23_gzTLFy4UhWxjEl-0a86G2WiHnP8GqEQN_ueIELBLfmOqizTfHZNpYPP_bw5Akybfy6mFe3C95To",
  },
};

export const repositoryData = {
  filters: ["All Resources", "React", "Python", "UI/UX Design", "Motion Graphics", "Typography"],
  resources: [
    {
      variant: "featured" as const,
      id: "advanced-component-architecture-for-saas",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDYtb5dWgS1xW33G0v3YTieyhI5_G-0WSTrE-345iCRcTTaPNEefQ85c56Hw90zJdOTYBhm5ZMu_rE16BeEDbVM7lZT3r1xkhIxHEZkdXb2FGS7PU2KVfkEzSfZRmoLD63pAvehORLElXsREuIDLTRIGfvj7Zjhoo1Pk2vES0uZDkul2mJtBAdEYetARIafeIM5YzwwY9Ew0Qwq2GkEAom_RsUJrQo1pZbQ2mbMYsFIqLlcsmrtQFSai6f_jnYj0Lps3BsoeUFeLzw",
      primaryTag: "UI/UX",
      secondaryTag: "Premium",
      title: "Advanced Component Architecture for SaaS",
      description:
        "A deep dive into building scalable, themeable UI systems using React and Tailwind CSS. Includes 40+ atomic components.",
      author: "Marcus Thorne",
      authorAvatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB-r2lXEWA8tO7B-3P78SXiLOcilnyW7nG8Tp-AyOGwd0eRBk5gyS5mHXuocmySoqWPi7vfhicDZA6nVdqjTgoE1HztV3-XGS3ebbsprWNSZq3-GsDY2JM_u3j73ihW8Gp3ljZbqI2bFH04B-lYeeYAwzCB5A1bG5Rjn7pBJaG1HaihQxLJWulQD5sgV9uBxnHUo0aK8OlJYdYn-3c9Sxo348YFpm1n59FQJcK5ZQJ_jOXWpsXxe2IyK6uOB9y4T7Zt98Ox68IOy2s",
      href: "/repository/typography-architectural-foundation",
    },
    {
      variant: "standard" as const,
      id: "automating-design-workflows",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD_tzoyXHE7mQ6xryHdhuCzNzirESirrb3yvJTW2ecZ9w7VgCGDOM2RZK9tZKq5PWablVu7oz-LY3lA1K3xhmYsiOAeaGbTT6KZmmEVzklLOAVtLFjsCy9lethfe_h9iOm4AjPQVxV187-fTnD7H6xrAiA7CC5Jjmd0fHFrUr1R7NgZcm27WBlVwPruLzzTfFTdFPVXnenuwjsWe_1zUHE9N4cydJwmz_PpX9Rup3yMCNc8AL6yIpzA_A5At3y5Ttvq0xQythk-LeE",
      tag: "Python",
      title: "Automating Design Workflows",
      description:
        "Python scripts to automate asset exports, renaming, and layout generations in Figma.",
      author: "Sarah Chen",
      authorAvatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCyelWcmQDEW5NSRPmk4fGJcqT4jJMXp-at0YxG3xfhkJNkPJFSudPTdlOtQGW2YS2wkfzwaYFoQouGnbvPFY_x4RdmSaez2YjbqE6x4MD8BoGDUT0RSxyB736l34uO1cyZHwK-0MJBeE40or31btqLnE1AsfJVPn2T968gqQ4XF33rI3Vy8KjL_EjEvvig4UfrbhB8WbgnEyI-riwFhKC4rGrDgNhkXffqgg4ohBPWJfJc20dlo86qUZ1ue3NltfiFs3GGoQDre8o",
      href: "/repository/typography-architectural-foundation",
    },
    {
      variant: "standard" as const,
      id: "effective-state-management",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDL9AVJujrWgI3tf_Rz91eACGIJA0jNe_r1lLuCXL92qaasQ39NiQe7On2ZaIxYbj2zgm8x2hj2CcqUexvb0Wi37NMfWPjpUcOzFk1zHq9BAleo_SCa6P10Yp82k-iOwyKWydgA7KKtXs7BopwikgB6drH-uB8_kE6JaETYyoBbDkj63-ZUSARbJV9DvmVA0tmOHKQsj0Mfl0lWgBF80uOAvXgR_hAvpBn1x_6kEBFykujYtmrAk6g28x3wM0pe9XxNlYDdbCwajw8",
      tag: "React",
      title: "Effective State Management",
      description:
        "Comparing Zustand, Redux Toolkit, and Context API for enterprise-level applications.",
      author: "Leo Volkov",
      authorAvatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAHl-KnLuHcz8GWSz562Sowrb44q9Jw-KqUiTcGVNUf0Ew8rOPsT1zecws5AI8WNrh_5-aFf7adUlAVO_c0Q8n0qWaEP2g6RtGcpupClGZzqPyqubWC0RgTcgid2yKNMAL3SQLQq_xcfcjzdyhlaA8VVjTtZ2KeUpv_j0mtDMn1bPVU7iFTCSizGp6XBM-PeCXgUQjZTvH9HIpC3yUXvbVc-iAlCFe3ieQdskadvfjzktoHlNE-II3axm-uPkDPJqTigNIK8fAQL5g",
      href: "/repository/typography-architectural-foundation",
    },
    {
      variant: "highlight" as const,
      id: "art-of-storytelling-in-product",
      eyebrow: "Special Collection",
      ctaLabel: "Explore",
      title: "The Art of Storytelling in Product",
      description:
        "Learn how to weave narrative arcs into your user journeys to increase engagement and emotional resonance.",
      href: "/repository/typography-architectural-foundation",
    },
    {
      variant: "standard" as const,
      id: "the-golden-ratio-in-type",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBlgRREZPaKs_xqFIL6mclCcBhAE4FFdXquFPCU1y8Vipit_L9e3PvUk-ILKdkR8ZUl_wxFLQMTI0WVBvNXp3BGYmUY1v6DWqTU-akp2RSLthhsiT-fxoGMkOem-sj73_5nrcn68ldrFzjk5CRuIo5xkMAiXNxSFtI6kcGkJmwJDqhU8bVtUuD8is2xwEIzBSDe6pb186gcZnAY6qFzYKUB-oQebpEnmE1YUtgAiZC1PxVUVQSqtNQGn7t3qEA0_OvxTq9AOQ2y9Qs",
      tag: "Typography",
      title: "The Golden Ratio in Type",
      description:
        "Mastering hierarchy and vertical rhythm using mathematical proportions for perfect readability.",
      author: "Elena Rossi",
      authorAvatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCVBbIee_mU0jUYD2ews3vCXfzZ8uah1X_oN_JJuCbOBInxXeEbYpT9m1t4DdFyiO4pMM_bL40ZOHIzogWwAxpYQ4kuAUlEO5pA5--n-18D39OKCfVPxpyGEaHiOoqao5GsiQyJEHpmTCp0mWZgoZHNLAlyZqzA56N4_1AeczVUheE9DPVNM-MaVrlYQ2DL02DsD8gowf9Pc6UxQ68yveDZthU_7j1tKBQaWQVyrj80SLlUX2DKhTRMqYNW_pdHaO1F_GHS9Nslb5w",
      href: "/repository/typography-architectural-foundation",
    },
  ],
};

export const resources = repositoryData.resources;

export const resourceDetailsById = {
  "typography-architectural-foundation": {
    breadcrumb: "Typography in Brand Systems",
    tags: ["Design Theory", "Resources"],
    title: "Typography as an Architectural Foundation.",
    author: {
      name: "Julian Aris",
      role: "Design Lead at Atelier Collective",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBagJl_Z4DzCceSvizv39-YdeD1-YsPnXOfUB6XtOhNLvg3KNF3FgPpNdJlskUinLSrMjPH8fk55zrwTf9rIkE-kBV3UUFY5Jmhj09ghWE-moNac7dDkaQpOCyvVdT5o5fW0yRkZ4bWGdypoNAIiXRdDkjGxRp-pZ1sBF5tcIkkxiBmpWk4UsSuY1j3AlMemSbljH4BepqTVZ9rsXR5Y1cPrGL4wny4CNHd64t5FRKrKf2dSt5Scqh3SDhY2zG0-d3l4BRNuWEr26A",
    },
    likes: "1.2k",
    introQuote:
      "Type is the voice of the interface. Before a user reads a single word, they feel the character of the message through the geometry of its letters.",
    paragraphs: [
      "In modern brand systems, we often treat typography as a secondary utility - a vessel for content rather than the content itself. However, when we look at the most enduring identities, typography serves as the structural scaffolding.",
      "A resilient system typically relies on three distinct typographic roles: The Anchor (Headline), The Navigator (Labels), and The Conversationalist (Body).",
    ],
    figureImage:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJr1Xp3srHwaUi8JDa0wLuq77rj247ugJKH3KT4RIA8CijXUkzZ_eO8g7u0kDlzaZwC5BNeaZ2qAOZTlLppvm92zUnRR8xHcZIXWXtIXK6zbU6d4dD70H1pvPub477gn20Fs82N-WrbH0lUGJXDMMK0odPtmcuQzVKNIadAHyO_VaLgGy8rxEYl3S2If6CNnUBf1aVeAa_U7XklEmHUSfLGA827HQ0XXogSAKDuwe3OnU2Z1JDmMetG-YznoYWqe0Xcxd7IMUSdlA",
    figureCaption: "Visualizing spatial hierarchy through variable font weights.",
    ruleTitle: "The Rule of Three",
    ruleItems: [
      "The Anchor: High contrast, distinctive geometry, and tight tracking.",
      "The Navigator: Monospaced or highly legible sans-serifs with generous tracking.",
      "The Conversationalist: Optical sizing specifically tuned for long-form reading.",
    ],
    takeaways: [
      "Prioritize vertical rhythm over absolute font sizes.",
      "Use optical sizing for body text under 14px.",
      "Avoid pure black text on light backgrounds to reduce eye strain.",
    ],
    includedResources: [
      { variant: "included" as const, title: "Typography_Audit.pdf", icon: "description", tone: "tertiary" as const },
      { variant: "included" as const, title: "Style_Guide_Template", icon: "collections", tone: "primary" as const },
    ],
    commentAvatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAg2PLHH-onup8v3Y0vmB0FPuX0U_jYp5yd2op_UjsETWQT-k1phC995jA7rihDpi-oK9ALEn3Q1K0pAOQQdjlQdTpSNt5H5FwAgf6-eefrcuMH3RVstPXEXfeE54TpeABIVx2H2AHRWoPXSHUnATXmvDxNS4o1I-FrXn_w0RDAv6Fqog3vqn7Yp20ZeIrf_OqexlcxQkdhCfruFGrp67u94jZd6osxSe0bXhTXMZ7fV97zw7aBGeSv3uIDAY2ZxDJ1F9ciNgmxSWk",
    comments: [
      {
        name: "Marcus Thorne",
        time: "2 hours ago",
        body:
          'This editorial approach to type is exactly what is missing in most B2B SaaS today. The idea of the "Conversationalist" vs "Navigator" clarifies why some UIs feel so disjointed.',
        likes: "12",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAIxlRh50-7c03NhcTdYpvD5phnXHtoNNJgt3YWBepmf0EStOS_Bex_lFn4EiBPb0pEnMgsgS6fslDTHfVwxXE22DVJ6MXu6j-aPD35R-RuW4YKtBDlvTeSyOqggGiReJ0Ms4kLYXylmWpsJwwXeIXQt9hOusiPcZ4eckjJb5_Bxp8ekZpPeSkjDMF1hKpBbfIrPBge0loVcuM6hhN0ols_rDfBAPHVS7xmNnR0iCk-AFF388a2LOz4uRLMXmb6Oapo3Nn5BrhMllc",
      },
      {
        name: "Elena S.",
        time: "5 hours ago",
        body:
          'Would love to see a follow-up on how this affects accessibility. Sometimes "editorial" means low contrast - how do we balance the atelier vibe with AA standards?',
        likes: "4",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuA73iTFFtWlChrFpb_OH5khpKgl8mSwSI-1LUYFPzfTujFdPciHdAhGGFhIexAH91TKQWAWE3zxIjTxlL8BTnRdNAKPoCxaqwqXvE2yzbaXeUXErMZb6IYtpliqKrF5pE5qz2dbRWmxQq6qvou4GxjIhzx0tqgzwo85rSivv_5Y5R9F_9ThjeNR7nEgxcrBicb_hRUKMffmpvWM5ZY29wWtg_Sr_4dHTt47zUc1cUXaeX8dmsfLitSM8ru0c-JiXB2uuu09UdFe6xQ",
      },
    ],
  },
};

export const profileData = {
  cover:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDhXHwghWp8PHrhx40pSvhPrMAH_VX3MvIW2VQMv9zVYeAkIxUOjhdqolXkoTH3qbuILu-4RMILwt1KVBd0Kmm9C-2tmHwVe2uEtVHk2gcsXjLmwF2DHM0HcHq4PSobJBhYmXdYqpriEyi_9_0jWPeZFRZy35LLHmKuyh8fwiEJdEWk3MYo8bInwkkNobe0mu0PiCR4so5G73zcw3Vw3WLQ7o6WpaC3LbWr7mxFiZZHAXWnDAq-DVkiLpiN0dJ-f2NzNKDact1JUqQ",
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA9FnFgAF-ssvA4kUMskWJ6uJWeLAnSX5BOYb4kLb2VrVQZIf-e3cqgPHyE86-ZZeS0WOXMe90KrmoiIhVW5exgYNBVAZVdyHrytr6FsRncaJkf50DG3YyuzPi-9SlvdQ79C9ErV9WVgvC_X6hpC9GmFX5FtDUjgXDWcls1mk6r_bmXa4qHCjyKGP4nZukViXgHuuTPxkU_HkHbOccxYBNayNLCXs3_DFankK9ayaUEWGDk5idqiyggbW3-nJ6_Se_Ab5yL6d6zPPI",
  name: "Julian Thorne",
  location: "Berlin, DE",
  role: "Creative Lead @ Atelier-X",
  narrative:
    'Blending architectural precision with modern UI systems. I believe that the best products are "quiet" - they solve problems without shouting. Currently focusing on modular design systems and generative aesthetics.',
  connections: [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC2reQ8uabfK_DTDA-bOgNf7RcWrGeReYqWRTFqyqH5P3AYsxqM9ewNSmINek94iuX6DWPqkQCRD9GTlidu9XldMwj3pmvBzA2X0zQfxfiTNCvRLehqfep7oK-00yNfX8val83zIJs5EhsA_KsnHjnz0pUNq4DfOORQgjaHZ18tNaNLmELAC_Fje9D16iKQWiuAikC8Bendcj6pkTL2RBbJh5vHrFZC6fQfwjnB2moK_Y0YFmgV_y614nTUrMZnF7nYaELMcWWfxYc",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAcuJ3g6VJ8LTvvRJiLIRaF2OydQBKMR9xr9r3weBHDqI-fltV6x_2FM5NWDa0vJFGbHM635SHWJd9VTZioXIQgjIMu5fzAMTuTm-8DyPfs0-8wFH3TGhlyvQMfTyKf-DVj-ENryw0igaZ3sev1wpdaZT7MErsMGUmyyVUuJZYG12ws21_B_f7tXF4sCEVm04eevlqzMkG4_QezSI6roOIqNh3k9yzPqsC9Q9Ms2X362O4z5huChaS9T2IoQP1mTZ8Bjp3Joe-aftQ",
  ],
  vitality: [
    { value: "4.9", label: "Avg Rating" },
    { value: "128", label: "Sessions" },
    { value: "340h", label: "Total Hours" },
    { value: "1.2k", label: "Connections" },
  ],
  skills: [
    {
      title: "Systems Design",
      description: "Architecting scalable UI languages for complex enterprise ecosystems.",
      level: "Expert",
      icon: "architecture",
      tags: ["Tokens", "Figma", "Documentation"],
      tone: "secondary",
    },
    {
      title: "Frontend Craft",
      description: "Translating high-fidelity visions into semantic, performant codebases.",
      level: "Advanced",
      icon: "code",
      tags: ["Tailwind", "React", "Vellum"],
      tone: "primary",
    },
  ],
  badges: [
    { icon: "trophy", title: "Top Mentor", subtitle: "Q4 2023", tone: "primary" },
    { icon: "auto_awesome", title: "Skill Sage", subtitle: "100+ Shares", tone: "tertiary" },
    { icon: "handshake", title: "Connector", subtitle: "Network Builder", tone: "secondary" },
    { icon: "lock", title: "???", subtitle: "Locked", tone: "locked" },
  ],
};

export const authPageData = {
  featureImage:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAVN6jx2bmgBBhoMTt0w6w_vuDvcowd048BnZJyZnKBVScAW9mJfcORKrXv483Mu_uO8tsaOtPIN1IRKf2Fe0L8YgD0xis-UUnBxx1WT0xCQJ7-QzJnIK4TDhXwS-1HX2Szq1FkgylyEwndsFlt6Y380G2eElMIkxd-cAOfGK04RYjWjBqBEQM7JlkknuWBzKAalC36u_RHqB36B1ONlYVfBssFS566yDxFhZw8FVX5T-pfBvmXWgqlPopEhG_6HPmkL5vVSB206pc",
  googleLogo:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBSenT04NlAO8BAbJVEwHg4ZzwdB_7jTxEEVIwW-2-xKOq1RwKN6RxqF_GsSDREx_UQPzaRuHr--rovpFLrJWoVpLbxp4A0Bp9OcW0gY5JZbw0pFkX0bN4zXImQdjS7nKeHH5q-Si7fso7xXdrNFBUDSlBWCE7GUgzjLphi0TtxTa-vC4fEcOd4FzJnY4VwiEdFVNS--w0IMRif31rt3iNoJ2PUIUflbsWOxYqAWLsx1AUleoMguvIXVZmDIyQbExsKLvnbWTPeK7Y",
};

export const splashData = {
  leftImage:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB9Tgg_2xt2mdMC4XnKECmcTWuWp0OTI5SzQ7PM7IjRTCb_HKz2YpFVP5S6BzEJofusIZEO3lw3s6r1UTIrJm5hFPvkF4HRU0wMGx3SZuu9iE8xcnHjl2yobUdY99ZcTmdKVJS9qoJwuJ-8GUx3v1m79BPvT0HFe5uqAt5uz8PmnM8vstiVnAhkVtmqYwnngSh0wxJWnW_fdoQjX0U-mJHXiUbG3Kf-PM3cuDtUKsBOFORoUd7-5jmf4EwHRwMWsMPrmNDjP-kOOEg",
  rightImage:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCRl6qo2YcKROFHIHF4aS6BtMt1gakIGT9ju3VSWu0gMxBE4VCMlwYDL3T912bUNSLQb9x-_Iy2WvOfEsQQzHDWUEB1EyUV4jTMCZrkzkswqJBUC_mSgMy445tpHbILtgji3QS1Wr16ukbeCxugALThCnJ5gL4rrODU9_fJyKy4b2Xm9MZiNOP19Kf86LYSAcejQ9lgGoXHbWsMjOqRi0wb6m7zNavwQWQY-iTevZMYPI2-jaryJcZtVqs_IJLEbRVbuUjke3Qr8jM",
};

export const callPageData = {
  title: "Pottery Throwing Masterclass",
  subtitle: "Session with Elena Vance",
  duration: "42:15",
  mainVideo:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAEL9OACPN8uIset1cGoXBtWah-9oPgQs0uxn8r1QN_IWlStA3Zru2r6x9b6Q0N0cty0C7ic0vAQG3fiqGRju0D1ztr1jGfA2CDNcVmvo-ArAx7YVRpfWRajKPX3Etq8Ldl0qWRbj6odiVikyK1lQjqzCJjKNYNJzb25ovMFEzWg9dymBBPOX5UEsvSUVEUsvsDAcleERFlaliZGQUhUzWvL-uj-CoANhQpGNdagu9VFM6KdteLvL4ALYMYu4hnHIBhWPkDnc11NrA",
  selfVideo:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCjDwx8AjpdXxQs-D9n0dPnbd6Zd2iz9ntQ0fKsl7eiD0BiE_yO21GD-7QMjJl4rBjTf0-j7wxfCWvPh_i_tPeEES0NP15-Ul8kkzh1yCr0-gqG_AbyFwwbM7ojAFTHh66436NR-H96Hjzcp5KEL1BMgAzocaPaWxKwZA5bPg1XRA7dEVSq_QY2stmbZUslkZxEpz_vz32pdHc38OXAsC1Vl_akX8e7hWvuCVy9n3LOudKfZorMbH_utsWXM01kSueaAgU3WOtuCBQ",
};
