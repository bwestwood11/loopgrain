// Before/after pairs for /showcase. To add one, put the two MP4s (and a poster
// frame for each) in public/, then add an entry here. For the side-by-side
// playback to line up, the edit should be cut to the same length as the
// original, starting from the same moment.

export type ShowcaseItem = {
  id: string;
  business: string;
  title: string;
  summary: string;
  added: string[];
  clipsIn: number;
  length: string;
  before: { src: string; poster: string; alt: string };
  after: { src: string; poster: string; alt: string };
};

export const SHOWCASE: ShowcaseItem[] = [
  {
    id: "barber",
    business: "Barbershop",
    title: "Walked in for a trim",
    summary:
      "Three shaky phone clips of a haircut became a story with a hook, a reveal, and a clear reason to book.",
    added: [
      "Kinetic captions that land on every beat",
      "Clock and skin fade callouts",
      "Barber name card and five star rating",
      "“Book your chair” end card",
    ],
    clipsIn: 3,
    length: "0:13",
    before: {
      src: "/hero/barber-original.mp4",
      poster: "/hero/barber-original-poster.jpg",
      alt: "Barbershop clips as filmed: three unedited phone clips of a haircut",
    },
    after: {
      src: "/hero/barber-edited.mp4",
      poster: "/hero/barber-edited-poster.jpg",
      alt: "The Loopgrain edit: captions reading Walked in for a trim, a skin fade callout, the barber's name card, a five star rating, and a Book your chair end card",
    },
  },
  {
    id: "detailing",
    business: "Auto detailing",
    title: "Six months of road grime",
    summary:
      "A routine wash turned into a before-and-after people watch to the end, with the price of neglect front and center.",
    added: [
      "Hook caption in the first second",
      "Animated grime meter",
      "Snow foam callout and owner name card",
      "“Book a detail” end card",
    ],
    clipsIn: 3,
    length: "0:13",
    before: {
      src: "/hero/detailing-original.mp4",
      poster: "/hero/detailing-original-poster.jpg",
      alt: "Auto detailing clips as filmed: three unedited phone clips of a car being foamed and hand washed",
    },
    after: {
      src: "/hero/detailing-edited.mp4",
      poster: "/hero/detailing-edited-poster.jpg",
      alt: "The Loopgrain edit: captions reading Six months of road grime, a grime meter, a snow foam callout, the owner's name card, a five star rating, and a Book a detail end card",
    },
  },
  {
    id: "fitness",
    business: "Fitness studio",
    title: "She hated the gym",
    summary:
      "Plain training footage reframed as a client transformation, which is exactly what people considering a first session want to see.",
    added: [
      "Story-led captions",
      "Week counter and HIIT finisher callout",
      "Trainer name card and five star rating",
      "“Claim a free session” end card",
    ],
    clipsIn: 3,
    length: "0:13",
    before: {
      src: "/hero/fitness-original.mp4",
      poster: "/hero/fitness-original-poster.jpg",
      alt: "Fitness studio clips as filmed: three unedited phone clips of a client training with a coach",
    },
    after: {
      src: "/hero/fitness-edited.mp4",
      poster: "/hero/fitness-edited-poster.jpg",
      alt: "The Loopgrain edit: captions reading She hated the gym, a week counter, a HIIT finisher callout, the trainer's name card, a five star rating, and a Claim a free session end card",
    },
  },
  {
    id: "coaching",
    business: "Business coaching",
    title: "Doing it all alone",
    summary:
      "Three quiet clips of an owner, a coach, and a whiteboard became a before-and-after story that makes the result of coaching easy to picture.",
    added: [
      "Notification pile-up and draining energy meter as the hook",
      "Coach name card with rating and a hand-drawn callout",
      "Session notes that tick themselves off",
      "“90 days later” results and a “Book a discovery call” end card",
    ],
    clipsIn: 3,
    length: "0:13",
    before: {
      src: "/hero/coaching-original.mp4",
      poster: "/hero/coaching-original-poster.jpg",
      alt: "Coaching clips as filmed: an owner looking overwhelmed at her desk, a coach talking in a session, and a woman presenting at a whiteboard",
    },
    after: {
      src: "/hero/coaching-edited.mp4",
      poster: "/hero/coaching-edited-poster.jpg",
      alt: "The Loopgrain edit: a pile of late-night notifications and the caption Doing it all alone, the coach's name card and ticked-off session notes, then 90 days later stats showing fewer hours, higher revenue and a bigger team, and a Book a free discovery call end card",
    },
  },
];
