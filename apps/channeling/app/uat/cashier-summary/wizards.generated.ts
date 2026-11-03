export type WizardSession = {
  doctor: string;
  code: string;
  time: string;
  hospital: number;
  professional: number;
  bill: number;
};

export type Wizard = {
  no: number;
  agency: string;
  agencyCode: string;
  sessions: [WizardSession, WizardSession, WizardSession];
};

/** Ruhunu Hospital, Thursday 8 October 2026. One wizard per cashier. */
export const WIZARDS: Wizard[] = [
  {
    no: 1,
    agency: "Aruna Pharmacy (Matara)",
    agencyCode: "178",
    sessions: [
      { doctor: "DR. M M KUMARA", code: "DR0111", time: "10:00 am–12:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. R D MADURAWE", code: "DR0005", time: "10:00 am–12:00 pm", hospital: 1600, professional: 4500, bill: 6100 },
      { doctor: "DR.(MRS) HASARA KULATUNGA", code: "DR0487", time: "10:00 am–12:00 pm", hospital: 1020, professional: 1500, bill: 2520 },
    ],
  },
  {
    no: 2,
    agency: "Bogahagoda Chaneel Center",
    agencyCode: "121",
    sessions: [
      { doctor: "DR.(MRS) PARAMI GUNASEKARA", code: "DR0412", time: "10:00 am–11:00 am", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. L B LAHIRU PRABODHA", code: "DR0133", time: "12:00 pm–2:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR.(MRS) HASARA KULATUNGA", code: "DR0487", time: "12:00 pm–2:00 pm", hospital: 1020, professional: 1500, bill: 2520 },
    ],
  },
  {
    no: 3,
    agency: "Comnet Agency Phone Shop",
    agencyCode: "163",
    sessions: [
      { doctor: "MS. KAUMADIE JAYAWARDANA", code: "DR0476", time: "10:00 am–11:00 am", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) RAMYA RAGUNATHAN", code: "DR0011", time: "1:00 pm–3:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR.(MRS) LALITHA SENARATH", code: "DR0020", time: "2:00 pm–4:00 pm", hospital: 970, professional: 1350, bill: 2320 },
    ],
  },
  {
    no: 4,
    agency: "Dickwella - Wickrama Pharmacy",
    agencyCode: "114",
    sessions: [
      { doctor: "DR. WASANTHA KODIKARA ARACHCHI", code: "DR0081", time: "10:30 am–12:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. L B LAHIRU PRABODHA", code: "DR0133", time: "3:00 pm–5:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR. JAYAMINI HORADUGODA", code: "DR0047", time: "3:30 pm–5:30 pm", hospital: 1500, professional: 3500, bill: 5000 },
    ],
  },
  {
    no: 5,
    agency: "Elpiti Medical",
    agencyCode: "021",
    sessions: [
      { doctor: "DR.(MRS) PARAMI GUNASEKARA", code: "DR0412", time: "11:00 am–12:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. PRASANTHA GAMAGE", code: "DR0317", time: "3:00 pm–5:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR. KAPILA VITHARANA", code: "DR0009", time: "3:45 pm–4:45 pm", hospital: 1440, professional: 3000, bill: 4440 },
    ],
  },
  {
    no: 6,
    agency: "Gihan Pharmacy",
    agencyCode: "014",
    sessions: [
      { doctor: "DR. DARSHIKA KORALAGE", code: "DR0447", time: "12:00 pm–2:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "PROF.(MRS) CHANDANI G HEWAGE", code: "DR0100", time: "3:30 pm–5:30 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "PROF. KRISHAN SILVA", code: "DR0177", time: "3:45 pm–5:45 pm", hospital: 1020, professional: 1500, bill: 2520 },
    ],
  },
  {
    no: 7,
    agency: "Heladiwa Health Care - Akuressa",
    agencyCode: "237",
    sessions: [
      { doctor: "DR. SAHAN MENDIS", code: "DR0421", time: "12:00 pm–2:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. AJITH JAYASEKARA", code: "DR0096", time: "4:00 pm–6:00 pm", hospital: 1020, professional: 1500, bill: 2520 },
      { doctor: "DR. ATHULA DISSANAYAKA", code: "DR0033", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 8,
    agency: "Heladiwa Traders",
    agencyCode: "063",
    sessions: [
      { doctor: "DR.(MRS) PARAMI GUNASEKARA", code: "DR0412", time: "12:00 pm–1:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. BUDDHIKA UBAYAWANSA", code: "DR0454", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. CHAMPIKA WITHANAGAMA", code: "DR0410", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 9,
    agency: "Intima Pharmacy",
    agencyCode: "210",
    sessions: [
      { doctor: "MS. KAUMADIE JAYAWARDANA", code: "DR0476", time: "12:00 pm–1:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. CHANDANA MOHOTTI", code: "DR0261", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. CRISHANTHA PERERA", code: "DR0045", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 10,
    agency: "Jaya Chemie Pharmacy",
    agencyCode: "011",
    sessions: [
      { doctor: "PROF. WASANTHA DEVASIRI", code: "DR0375", time: "12:00 pm–1:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. DILEEPA MAHALIYANA", code: "DR0368", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. J P M KUMARASINGHE", code: "DR0116", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 11,
    agency: "Jaya Pharmacy",
    agencyCode: "010",
    sessions: [
      { doctor: "DR. M K RAGUNATHAN", code: "DR0086", time: "1:00 pm–3:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. HARSHA GAMAGE", code: "DR0024", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. NALITHA N WIJESUNDARA", code: "DR0118", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 12,
    agency: "Karapitiya Medical Center (Ampegama)",
    agencyCode: "155",
    sessions: [
      { doctor: "DR.(MRS) PARAMI GUNASEKARA", code: "DR0412", time: "1:00 pm–2:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. INDIKA MUTHUMALA HEWAWALGAMAGE", code: "DR0370", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. NARMADA GUNATHILAKA", code: "DR0496", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 13,
    agency: "Katuwana",
    agencyCode: "008",
    sessions: [
      { doctor: "MS. KAUMADIE JAYAWARDANA", code: "DR0476", time: "1:00 pm–2:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. KALUM DESHAPPRIYA", code: "DR0107", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. NISHANTHA GUNASEKARA", code: "DR0032", time: "4:00 pm–6:00 pm", hospital: 1500, professional: 3800, bill: 5300 },
    ],
  },
  {
    no: 14,
    agency: "Kethsiri Communication",
    agencyCode: "030",
    sessions: [
      { doctor: "DR.(MRS) PARAMI GUNASEKARA", code: "DR0412", time: "2:00 pm–3:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. KUSAL DE SILVA", code: "DR0182", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. PRABHATH WEERASIRI", code: "DR0441", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 15,
    agency: "Kurudugaha Medical & Grocery",
    agencyCode: "091",
    sessions: [
      { doctor: "DR. WASANTHA KODIKARA ARACHCHI", code: "DR0081", time: "3:00 pm–5:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. RAJITHA ABEYWICKRAMA", code: "DR0112", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
      { doctor: "DR. RANGA WEERAKKODY", code: "DR0246", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 16,
    agency: "Medical Center (Dr. H.G.C. Pathirana)",
    agencyCode: "023",
    sessions: [
      { doctor: "DR.(MRS) PARAMI GUNASEKARA", code: "DR0412", time: "3:00 pm–5:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. ROSHAN GUNARATHNE", code: "DR0405", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR. S A WICKRAMASINGHE", code: "DR0013", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
    ],
  },
  {
    no: 17,
    agency: "Methsuwa Laboratory-Kirinda",
    agencyCode: "260",
    sessions: [
      { doctor: "DR. LASANTHA LIYANAPATHIRANA", code: "DR0302", time: "3:30 pm–5:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. SAMANTHA LELWALA", code: "DR0119", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
      { doctor: "DR.(MRS) BINARI S WIJENAYAKA", code: "DR0010", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 18,
    agency: "Nanayakkara Channel Center",
    agencyCode: "097",
    sessions: [
      { doctor: "PROF. ARUNA DE SILVA", code: "DR0066", time: "3:30 pm–5:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. SEEWALI TILAKARATHNA", code: "DR0114", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
      { doctor: "DR.(MRS) BUDDHINI SAMARAWEERA", code: "DR0331", time: "4:00 pm–5:00 pm", hospital: 970, professional: 1000, bill: 1970 },
    ],
  },
  {
    no: 19,
    agency: "New Loyed Pharmacy",
    agencyCode: "116",
    sessions: [
      { doctor: "PROF. IMALKE KANKANAN ARACHCHI", code: "DR0201", time: "3:30 pm–5:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. VIDU RUCHIRA DE SILVA", code: "DR0194", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
      { doctor: "DR.(MRS) DEEPANI JASINGHE", code: "DR0167", time: "4:00 pm–6:00 pm", hospital: 1020, professional: 1500, bill: 2520 },
    ],
  },
  {
    no: 20,
    agency: "Online Agent",
    agencyCode: "001",
    sessions: [
      { doctor: "PROF.(MRS) WARSHA DE ZOYSA", code: "DR0139", time: "3:30 pm–5:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) DILRUKSHI DE SILVA", code: "DR0442", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
      { doctor: "DR.(MRS) HARSHANI DHARMAWARDENA", code: "DR0063", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 21,
    agency: "Pitigala Medical Stores",
    agencyCode: "035",
    sessions: [
      { doctor: "DR. GEETH SOORIYASENA", code: "DR0381", time: "3:45 pm–5:45 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) HASARA KULATUNGA", code: "DR0487", time: "4:00 pm–6:00 pm", hospital: 1020, professional: 1500, bill: 2520 },
      { doctor: "DR.(MRS) IRESHA HETTIARACHCHI", code: "DR0030", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 22,
    agency: "Priyantha Pharmacy",
    agencyCode: "020",
    sessions: [
      { doctor: "DR. CHARINI WIJEGUNARATNE", code: "DR0426", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) NIRODHA JAYAWICKREMA", code: "DR0437", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR.(MRS) PRIYA AMARAWEERA", code: "DR0319", time: "4:00 pm–6:00 pm", hospital: 970, professional: 1000, bill: 1970 },
    ],
  },
  {
    no: 23,
    agency: "RH Hikkaduwa",
    agencyCode: "285",
    sessions: [
      { doctor: "DR. GANGANATH GUNATHILAKA", code: "DR0131", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) SAMADARA SRIPALI", code: "DR0237", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR.(MRS) SANDAMALI PREMARATHNA", code: "DR0439", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
    ],
  },
  {
    no: 24,
    agency: "RH Makandura",
    agencyCode: "288",
    sessions: [
      { doctor: "DR. K K JAGATH KUMARA", code: "DR0472", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MS) H T C HAPUARACHCHI", code: "DR0468", time: "4:00 pm–6:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR.(MS) RAJITHA GUNAWARDHANE", code: "DR0465", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 25,
    agency: "RH Udugama",
    agencyCode: "284",
    sessions: [
      { doctor: "DR. KALUM DESHAPPRIYA (PM)", code: "DR0338", time: "4:00 pm–5:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MS) SUNANTHA NIRUBAN", code: "DR0463", time: "4:00 pm–6:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "PROF. M B SAMARAWICKRAMA", code: "DR0117", time: "4:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 26,
    agency: "Ruhunu Pharmacy",
    agencyCode: "062",
    sessions: [
      { doctor: "DR. KRISHANTHA JAYASEKARA", code: "DR0077", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. DASUN DE ALWIS", code: "DR0451", time: "4:30 pm–6:30 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. MILAN GUNAWARDENE", code: "DR0448", time: "4:30 pm–6:30 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 27,
    agency: "S N A Pharmacy",
    agencyCode: "197",
    sessions: [
      { doctor: "DR. KRISHANTHA SAMARANAYAKA", code: "DR0179", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MS) MUDITHA GOTHAMI NANAYAKKARA", code: "DR0322", time: "4:30 pm–6:30 pm", hospital: 1100, professional: 1800, bill: 2900 },
      { doctor: "DR. DIMANTHA DE SILVA", code: "DR0026", time: "5:00 pm–7:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 28,
    agency: "S S Pharmacy",
    agencyCode: "012",
    sessions: [
      { doctor: "DR. PAMUDITHA MADANAYAKA", code: "DR0459", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. RANGA KODITHUWAKKU", code: "DR0502", time: "5:00 pm–7:00 pm", hospital: 1500, professional: 3500, bill: 5000 },
      { doctor: "DR. RANJUKA UBAYASIRI", code: "DR0122", time: "5:00 pm–6:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 29,
    agency: "SANSETH[MAHANAMA PH]",
    agencyCode: "218",
    sessions: [
      { doctor: "DR. RANJITH JAYASINGHE", code: "DR0147", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) RAMYA RAGUNATHAN", code: "DR0011", time: "5:00 pm–7:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR.(MRS) THANUJA LOKUNARANGODA", code: "DR0251", time: "5:15 pm–7:15 pm", hospital: 1440, professional: 3000, bill: 4440 },
    ],
  },
  {
    no: 30,
    agency: "Sampath Pharmacy",
    agencyCode: "031",
    sessions: [
      { doctor: "DR. S P DISSANAYAKA (PM)", code: "DR0337", time: "4:00 pm–5:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. PRIYANKARA GUNAWEERA", code: "DR0227", time: "5:30 pm–7:00 pm", hospital: 1020, professional: 1500, bill: 2520 },
      { doctor: "DR. SAMAN WIJAYARATHNE", code: "DR0003", time: "5:30 pm–7:30 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 31,
    agency: "Sampath Pharmacy (Akuressa)",
    agencyCode: "036",
    sessions: [
      { doctor: "DR. TILAK SIRISENA", code: "DR0079", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. GAMINI ABEYSINGHE", code: "DR0214", time: "6:00 pm–9:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. RANJUKA UBAYASIRI", code: "DR0122", time: "6:00 pm–7:00 pm", hospital: 1600, professional: 4000, bill: 5600 },
    ],
  },
  {
    no: 32,
    agency: "Saranga Pharmacy",
    agencyCode: "019",
    sessions: [
      { doctor: "DR.(MISS) NAYOMI DE SILVA", code: "DR0069", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. RUWAN JAYAWARDANA", code: "DR0396", time: "6:00 pm–7:00 pm", hospital: 1500, professional: 3500, bill: 5000 },
      { doctor: "DR.(MRS) P AMARADIWAKARA", code: "DR0043", time: "6:00 pm–8:00 pm", hospital: 970, professional: 750, bill: 1720 },
    ],
  },
  {
    no: 33,
    agency: "Sithuruwana Pharmacy",
    agencyCode: "025",
    sessions: [
      { doctor: "DR.(MRS) CHANDRA LIYANAGE", code: "DR0497", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "MRS. I. Y. POORNIMA JAYAKODY", code: "DR0298", time: "6:00 pm–8:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
      { doctor: "DR. RANJITH JAYAWEERA", code: "DR0446", time: "6:30 pm–8:30 pm", hospital: 1440, professional: 3000, bill: 4440 },
    ],
  },
  {
    no: 34,
    agency: "Suwa Piyasa Medicare",
    agencyCode: "158",
    sessions: [
      { doctor: "DR.(MRS) PARAMI GUNASEKARA", code: "DR0412", time: "4:00 pm–5:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. SANKA THEBUWANA ARACHCHI", code: "DR0110", time: "6:30 pm–8:30 pm", hospital: 1020, professional: 1500, bill: 2520 },
      { doctor: "DR. AJANTHAN SIVALINGAM", code: "DR0491", time: "7:00 pm–9:00 pm", hospital: 1340, professional: 2500, bill: 3840 },
    ],
  },
  {
    no: 35,
    agency: "W A Suminda",
    agencyCode: "009",
    sessions: [
      { doctor: "DR.(MRS) SUGANDI DHARMABANDU", code: "DR0440", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. MALITH PERERA", code: "DR0374", time: "7:00 pm–9:00 pm", hospital: 1020, professional: 1500, bill: 2520 },
      { doctor: "DR. HARSHA MENDIS", code: "DR0052", time: "8:00 pm–10:00 pm", hospital: 1440, professional: 3000, bill: 4440 },
    ],
  },
  {
    no: 36,
    agency: "Weligama Medical Center",
    agencyCode: "050",
    sessions: [
      { doctor: "DR.(MRS) WASANTHI WICKRAMARATHNE", code: "DR0378", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. JANATH LIYANAGE", code: "DR0059", time: "8:00 pm–10:00 pm", hospital: 1600, professional: 5000, bill: 6600 },
      { doctor: "DR. PRIYANKARA GUNAWEERA", code: "DR0227", time: "8:00 pm–9:00 pm", hospital: 1020, professional: 1500, bill: 2520 },
    ],
  },
  {
    no: 37,
    agency: "Wickramasekara  pharmacy",
    agencyCode: "102",
    sessions: [
      { doctor: "MR. ASANKA MADDUMAARACHCHI", code: "DR0339", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) THANUJA LOKUNARANGODA", code: "DR0251", time: "8:30 pm–10:30 pm", hospital: 1440, professional: 3000, bill: 4440 },
      { doctor: "DR. JAGATH DANDENIYA", code: "DR0230", time: "9:00 pm–11:00 pm", hospital: 970, professional: 1000, bill: 1970 },
    ],
  },
  {
    no: 38,
    agency: "Wijaya Pharmacy & Grocery",
    agencyCode: "166",
    sessions: [
      { doctor: "MR. ISURU KARUNARATHNA", code: "DR0234", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "MS. KAUMADIE JAYAWARDANA", code: "DR0476", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "PROF. CHANDANA WICKRAMARATHNA", code: "DR0055", time: "4:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
    ],
  },
  {
    no: 39,
    agency: "Yatalamaththa Channel Center",
    agencyCode: "040",
    sessions: [
      { doctor: "DR. DHANANJAYA VITHANAGE", code: "DR0482", time: "4:30 pm–6:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. SITHUMINI PAHALAGAMAGE", code: "DR0475", time: "4:30 pm–6:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) B V HASHENI", code: "DR0090", time: "4:30 pm–6:30 pm", hospital: 1200, professional: 2000, bill: 3200 },
    ],
  },
  {
    no: 40,
    agency: "Aruna Pharmacy (Matara)",
    agencyCode: "178",
    sessions: [
      { doctor: "DR. M K RAGUNATHAN", code: "DR0086", time: "5:00 pm–7:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR. P W GAYANI CHAMIKA", code: "DR0409", time: "5:00 pm–7:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
      { doctor: "DR.(MRS) PARAMI GUNASEKARA", code: "DR0412", time: "5:00 pm–6:00 pm", hospital: 1200, professional: 2000, bill: 3200 },
    ],
  },
];
