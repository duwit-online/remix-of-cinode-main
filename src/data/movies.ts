import heroCity from "@/assets/hero-city.webp";
import movieWarrior from "@/assets/movie-warrior.webp";
import movieDeep from "@/assets/movie-deep.webp";
import movieDragon from "@/assets/movie-dragon.webp";
import movieSpace from "@/assets/movie-space.webp";
import movieNoir from "@/assets/movie-noir.webp";
import movieTemple from "@/assets/movie-temple.webp";
import movieCyber from "@/assets/movie-cyber.webp";
import movieHorror from "@/assets/movie-horror.webp";
import movieChase from "@/assets/movie-chase.webp";

export interface Movie {
  id: string;
  title: string;
  image: string;
  year: number;
  rating: number;
  duration: string;
  genre: string[];
  description: string;
  featured?: boolean;
}

export const movies: Movie[] = [
  {
    id: "1",
    title: "Neon Horizons",
    image: heroCity,
    year: 2025,
    rating: 8.7,
    duration: "2h 18min",
    genre: ["Sci-Fi", "Thriller"],
    description: "In a rain-soaked metropolis of the future, a rogue AI develops consciousness and must navigate a world that fears its existence.",
    featured: true,
  },
  {
    id: "2",
    title: "The Last Sentinel",
    image: movieWarrior,
    year: 2024,
    rating: 8.2,
    duration: "2h 35min",
    genre: ["Fantasy", "Adventure"],
    description: "A lone warrior stands between two worlds as ancient prophecies collide under alien moons.",
  },
  {
    id: "3",
    title: "Abyssal",
    image: movieDeep,
    year: 2025,
    rating: 7.9,
    duration: "1h 52min",
    genre: ["Thriller", "Sci-Fi"],
    description: "Deep beneath the ocean floor, a research team discovers bioluminescent creatures that hold the key to humanity's survival.",
  },
  {
    id: "4",
    title: "Dragonfall",
    image: movieDragon,
    year: 2024,
    rating: 8.5,
    duration: "2h 42min",
    genre: ["Fantasy", "Action"],
    description: "When the last dragon returns to reclaim its kingdom, an unlikely alliance forms between enemies.",
  },
  {
    id: "5",
    title: "Void Walker",
    image: movieSpace,
    year: 2025,
    rating: 9.1,
    duration: "2h 28min",
    genre: ["Sci-Fi", "Drama"],
    description: "An astronaut stranded near a dying nebula discovers that the universe is far more alive than anyone imagined.",
  },
  {
    id: "6",
    title: "Crimson Alley",
    image: movieNoir,
    year: 2023,
    rating: 8.0,
    duration: "1h 58min",
    genre: ["Noir", "Mystery"],
    description: "A detective follows a trail of neon-lit clues through rain-soaked streets to uncover a conspiracy decades in the making.",
  },
  {
    id: "7",
    title: "The Golden Ruin",
    image: movieTemple,
    year: 2024,
    rating: 7.8,
    duration: "2h 15min",
    genre: ["Adventure", "Drama"],
    description: "An archaeologist races against time to uncover ancient secrets hidden within a forgotten jungle temple.",
  },
  {
    id: "8",
    title: "Synth City",
    image: movieCyber,
    year: 2025,
    rating: 8.3,
    duration: "2h 05min",
    genre: ["Cyberpunk", "Action"],
    description: "In the neon-drenched streets of a cyberpunk megacity, a hacker uncovers a plot that could rewrite reality itself.",
  },
  {
    id: "9",
    title: "The Hollow",
    image: movieHorror,
    year: 2024,
    rating: 7.6,
    duration: "1h 48min",
    genre: ["Horror", "Thriller"],
    description: "A family inherits a Victorian mansion with a dark history, only to find that some doors should never be opened.",
  },
  {
    id: "10",
    title: "Midnight Drift",
    image: movieChase,
    year: 2025,
    rating: 8.1,
    duration: "1h 55min",
    genre: ["Action", "Thriller"],
    description: "A getaway driver with a mysterious past is pulled into one final job through the neon-lit streets of Tokyo.",
  },
];

export const categories = [
  { name: "Trending Now", movies: ["1", "5", "8", "4", "10"] },
  { name: "Sci-Fi & Beyond", movies: ["1", "3", "5", "8"] },
  { name: "Epic Adventures", movies: ["2", "4", "7", "10"] },
  { name: "Dark & Thrilling", movies: ["6", "9", "3", "10"] },
];
