import type { ActiveCharacter, ActiveCharacterSet, CharacterProfile, CharacterTheme, PlayLetter } from "../types/board";

export const PLAY_LETTER_SEQUENCE: PlayLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "V"];

export const DEFAULT_THEME_ID = "detective";

export const CHARACTER_THEMES: CharacterTheme[] = [
  {
    id: "detective",
    name: "Detectives",
    description: "Klassieke speurders en verdachten voor een mysterie." 
  },
  {
    id: "fairy",
    name: "Sprookjes",
    description: "Vriendelijke sprookjesfiguren voor een fantasiebord."
  },
  {
    id: "animals",
    name: "Dieren",
    description: "Dierenfiguren met duidelijke namen en letters."
  },
  {
    id: "fantasy",
    name: "Fantasy",
    description: "Avonturiers, magiers en ridders."
  },
  {
    id: "space",
    name: "Ruimte",
    description: "Astronauten en ruimtehelden."
  }
];

export const CHARACTER_POOL: CharacterProfile[] = [
  { id: "detective_anna", themeId: "detective", letter: "A", name: "Anna", gender: "female", portraitUrl: null, accentColor: "#22c55e" },
  { id: "detective_amir", themeId: "detective", letter: "A", name: "Amir", gender: "male", portraitUrl: null, accentColor: "#16a34a" },
  { id: "detective_bas", themeId: "detective", letter: "B", name: "Bas", gender: "male", portraitUrl: null, accentColor: "#8b5cf6" },
  { id: "detective_britt", themeId: "detective", letter: "B", name: "Britt", gender: "female", portraitUrl: null, accentColor: "#7c3aed" },
  { id: "detective_clara", themeId: "detective", letter: "C", name: "Clara", gender: "female", portraitUrl: null, accentColor: "#3b82f6" },
  { id: "detective_cas", themeId: "detective", letter: "C", name: "Cas", gender: "male", portraitUrl: null, accentColor: "#2563eb" },
  { id: "detective_daan", themeId: "detective", letter: "D", name: "Daan", gender: "male", portraitUrl: null, accentColor: "#ef4444" },
  { id: "detective_demi", themeId: "detective", letter: "D", name: "Demi", gender: "female", portraitUrl: null, accentColor: "#dc2626" },
  { id: "detective_eva", themeId: "detective", letter: "E", name: "Eva", gender: "female", portraitUrl: null, accentColor: "#eab308" },
  { id: "detective_elias", themeId: "detective", letter: "E", name: "Elias", gender: "male", portraitUrl: null, accentColor: "#ca8a04" },
  { id: "detective_finn", themeId: "detective", letter: "F", name: "Finn", gender: "male", portraitUrl: null, accentColor: "#14b8a6" },
  { id: "detective_fleur", themeId: "detective", letter: "F", name: "Fleur", gender: "female", portraitUrl: null, accentColor: "#0d9488" },
  { id: "detective_gwen", themeId: "detective", letter: "G", name: "Gwen", gender: "female", portraitUrl: null, accentColor: "#ec4899" },
  { id: "detective_guus", themeId: "detective", letter: "G", name: "Guus", gender: "male", portraitUrl: null, accentColor: "#db2777" },
  { id: "detective_hugo", themeId: "detective", letter: "H", name: "Hugo", gender: "male", portraitUrl: null, accentColor: "#22c55e" },
  { id: "detective_hanna", themeId: "detective", letter: "H", name: "Hanna", gender: "female", portraitUrl: null, accentColor: "#16a34a" },
  { id: "detective_vera", themeId: "detective", letter: "V", name: "Vera", gender: "female", portraitUrl: null, accentColor: "#a855f7" },
  { id: "detective_vince", themeId: "detective", letter: "V", name: "Vince", gender: "male", portraitUrl: null, accentColor: "#9333ea" },

  { id: "fairy_aria", themeId: "fairy", letter: "A", name: "Aria", gender: "female", portraitUrl: null, accentColor: "#22c55e" },
  { id: "fairy_alfred", themeId: "fairy", letter: "A", name: "Alfred", gender: "male", portraitUrl: null, accentColor: "#16a34a" },
  { id: "fairy_bella", themeId: "fairy", letter: "B", name: "Bella", gender: "female", portraitUrl: null, accentColor: "#8b5cf6" },
  { id: "fairy_boris", themeId: "fairy", letter: "B", name: "Boris", gender: "male", portraitUrl: null, accentColor: "#7c3aed" },
  { id: "fairy_cato", themeId: "fairy", letter: "C", name: "Cato", gender: "female", portraitUrl: null, accentColor: "#3b82f6" },
  { id: "fairy_casper", themeId: "fairy", letter: "C", name: "Casper", gender: "male", portraitUrl: null, accentColor: "#2563eb" },
  { id: "fairy_dina", themeId: "fairy", letter: "D", name: "Dina", gender: "female", portraitUrl: null, accentColor: "#ef4444" },
  { id: "fairy_drako", themeId: "fairy", letter: "D", name: "Drako", gender: "male", portraitUrl: null, accentColor: "#dc2626" },
  { id: "fairy_elva", themeId: "fairy", letter: "E", name: "Elva", gender: "female", portraitUrl: null, accentColor: "#eab308" },
  { id: "fairy_elfin", themeId: "fairy", letter: "E", name: "Elfin", gender: "male", portraitUrl: null, accentColor: "#ca8a04" },
  { id: "fairy_fenna", themeId: "fairy", letter: "F", name: "Fenna", gender: "female", portraitUrl: null, accentColor: "#14b8a6" },
  { id: "fairy_fedor", themeId: "fairy", letter: "F", name: "Fedor", gender: "male", portraitUrl: null, accentColor: "#0d9488" },
  { id: "fairy_gwen", themeId: "fairy", letter: "G", name: "Gwen", gender: "female", portraitUrl: null, accentColor: "#ec4899" },
  { id: "fairy_gijs", themeId: "fairy", letter: "G", name: "Gijs", gender: "male", portraitUrl: null, accentColor: "#db2777" },
  { id: "fairy_helga", themeId: "fairy", letter: "H", name: "Helga", gender: "female", portraitUrl: null, accentColor: "#22c55e" },
  { id: "fairy_hidde", themeId: "fairy", letter: "H", name: "Hidde", gender: "male", portraitUrl: null, accentColor: "#16a34a" },
  { id: "fairy_vita", themeId: "fairy", letter: "V", name: "Vita", gender: "female", portraitUrl: null, accentColor: "#a855f7" },
  { id: "fairy_vigo", themeId: "fairy", letter: "V", name: "Vigo", gender: "male", portraitUrl: null, accentColor: "#9333ea" },

  { id: "animals_aap", themeId: "animals", letter: "A", name: "Aap", gender: "neutral", portraitUrl: null, accentColor: "#22c55e" },
  { id: "animals_antilope", themeId: "animals", letter: "A", name: "Antilope", gender: "neutral", portraitUrl: null, accentColor: "#16a34a" },
  { id: "animals_beer", themeId: "animals", letter: "B", name: "Beer", gender: "neutral", portraitUrl: null, accentColor: "#8b5cf6" },
  { id: "animals_bever", themeId: "animals", letter: "B", name: "Bever", gender: "neutral", portraitUrl: null, accentColor: "#7c3aed" },
  { id: "animals_cavia", themeId: "animals", letter: "C", name: "Cavia", gender: "neutral", portraitUrl: null, accentColor: "#3b82f6" },
  { id: "animals_cobra", themeId: "animals", letter: "C", name: "Cobra", gender: "neutral", portraitUrl: null, accentColor: "#2563eb" },
  { id: "animals_dolfijn", themeId: "animals", letter: "D", name: "Dolfijn", gender: "neutral", portraitUrl: null, accentColor: "#ef4444" },
  { id: "animals_draak", themeId: "animals", letter: "D", name: "Draak", gender: "neutral", portraitUrl: null, accentColor: "#dc2626" },
  { id: "animals_eekhoorn", themeId: "animals", letter: "E", name: "Eekhoorn", gender: "neutral", portraitUrl: null, accentColor: "#eab308" },
  { id: "animals_eland", themeId: "animals", letter: "E", name: "Eland", gender: "neutral", portraitUrl: null, accentColor: "#ca8a04" },
  { id: "animals_fazant", themeId: "animals", letter: "F", name: "Fazant", gender: "neutral", portraitUrl: null, accentColor: "#14b8a6" },
  { id: "animals_fret", themeId: "animals", letter: "F", name: "Fret", gender: "neutral", portraitUrl: null, accentColor: "#0d9488" },
  { id: "animals_giraf", themeId: "animals", letter: "G", name: "Giraf", gender: "neutral", portraitUrl: null, accentColor: "#ec4899" },
  { id: "animals_geit", themeId: "animals", letter: "G", name: "Geit", gender: "neutral", portraitUrl: null, accentColor: "#db2777" },
  { id: "animals_haas", themeId: "animals", letter: "H", name: "Haas", gender: "neutral", portraitUrl: null, accentColor: "#22c55e" },
  { id: "animals_hond", themeId: "animals", letter: "H", name: "Hond", gender: "neutral", portraitUrl: null, accentColor: "#16a34a" },
  { id: "animals_vos", themeId: "animals", letter: "V", name: "Vos", gender: "neutral", portraitUrl: null, accentColor: "#a855f7" },
  { id: "animals_valk", themeId: "animals", letter: "V", name: "Valk", gender: "neutral", portraitUrl: null, accentColor: "#9333ea" },

  { id: "fantasy_alina", themeId: "fantasy", letter: "A", name: "Alina", gender: "female", portraitUrl: null, accentColor: "#22c55e" },
  { id: "fantasy_aron", themeId: "fantasy", letter: "A", name: "Aron", gender: "male", portraitUrl: null, accentColor: "#16a34a" },
  { id: "fantasy_bram", themeId: "fantasy", letter: "B", name: "Bram", gender: "male", portraitUrl: null, accentColor: "#8b5cf6" },
  { id: "fantasy_bianca", themeId: "fantasy", letter: "B", name: "Bianca", gender: "female", portraitUrl: null, accentColor: "#7c3aed" },
  { id: "fantasy_cora", themeId: "fantasy", letter: "C", name: "Cora", gender: "female", portraitUrl: null, accentColor: "#3b82f6" },
  { id: "fantasy_cedric", themeId: "fantasy", letter: "C", name: "Cedric", gender: "male", portraitUrl: null, accentColor: "#2563eb" },
  { id: "fantasy_dario", themeId: "fantasy", letter: "D", name: "Dario", gender: "male", portraitUrl: null, accentColor: "#ef4444" },
  { id: "fantasy_dora", themeId: "fantasy", letter: "D", name: "Dora", gender: "female", portraitUrl: null, accentColor: "#dc2626" },
  { id: "fantasy_elena", themeId: "fantasy", letter: "E", name: "Elena", gender: "female", portraitUrl: null, accentColor: "#eab308" },
  { id: "fantasy_eron", themeId: "fantasy", letter: "E", name: "Eron", gender: "male", portraitUrl: null, accentColor: "#ca8a04" },
  { id: "fantasy_fiora", themeId: "fantasy", letter: "F", name: "Fiora", gender: "female", portraitUrl: null, accentColor: "#14b8a6" },
  { id: "fantasy_falk", themeId: "fantasy", letter: "F", name: "Falk", gender: "male", portraitUrl: null, accentColor: "#0d9488" },
  { id: "fantasy_grace", themeId: "fantasy", letter: "G", name: "Grace", gender: "female", portraitUrl: null, accentColor: "#ec4899" },
  { id: "fantasy_goran", themeId: "fantasy", letter: "G", name: "Goran", gender: "male", portraitUrl: null, accentColor: "#db2777" },
  { id: "fantasy_hilda", themeId: "fantasy", letter: "H", name: "Hilda", gender: "female", portraitUrl: null, accentColor: "#22c55e" },
  { id: "fantasy_henrik", themeId: "fantasy", letter: "H", name: "Henrik", gender: "male", portraitUrl: null, accentColor: "#16a34a" },
  { id: "fantasy_vanya", themeId: "fantasy", letter: "V", name: "Vanya", gender: "female", portraitUrl: null, accentColor: "#a855f7" },
  { id: "fantasy_viktor", themeId: "fantasy", letter: "V", name: "Viktor", gender: "male", portraitUrl: null, accentColor: "#9333ea" },

  { id: "space_astrid", themeId: "space", letter: "A", name: "Astrid", gender: "female", portraitUrl: null, accentColor: "#22c55e" },
  { id: "space_axel", themeId: "space", letter: "A", name: "Axel", gender: "male", portraitUrl: null, accentColor: "#16a34a" },
  { id: "space_bo", themeId: "space", letter: "B", name: "Bo", gender: "female", portraitUrl: null, accentColor: "#8b5cf6" },
  { id: "space_bodi", themeId: "space", letter: "B", name: "Bodi", gender: "male", portraitUrl: null, accentColor: "#7c3aed" },
  { id: "space_cosmo", themeId: "space", letter: "C", name: "Cosmo", gender: "male", portraitUrl: null, accentColor: "#3b82f6" },
  { id: "space_celeste", themeId: "space", letter: "C", name: "Celeste", gender: "female", portraitUrl: null, accentColor: "#2563eb" },
  { id: "space_dex", themeId: "space", letter: "D", name: "Dex", gender: "male", portraitUrl: null, accentColor: "#ef4444" },
  { id: "space_dana", themeId: "space", letter: "D", name: "Dana", gender: "female", portraitUrl: null, accentColor: "#dc2626" },
  { id: "space_elio", themeId: "space", letter: "E", name: "Elio", gender: "male", portraitUrl: null, accentColor: "#eab308" },
  { id: "space_ella", themeId: "space", letter: "E", name: "Ella", gender: "female", portraitUrl: null, accentColor: "#ca8a04" },
  { id: "space_faye", themeId: "space", letter: "F", name: "Faye", gender: "female", portraitUrl: null, accentColor: "#14b8a6" },
  { id: "space_finn", themeId: "space", letter: "F", name: "Finn", gender: "male", portraitUrl: null, accentColor: "#0d9488" },
  { id: "space_gio", themeId: "space", letter: "G", name: "Gio", gender: "male", portraitUrl: null, accentColor: "#ec4899" },
  { id: "space_gemma", themeId: "space", letter: "G", name: "Gemma", gender: "female", portraitUrl: null, accentColor: "#db2777" },
  { id: "space_halo", themeId: "space", letter: "H", name: "Halo", gender: "neutral", portraitUrl: null, accentColor: "#22c55e" },
  { id: "space_hugo", themeId: "space", letter: "H", name: "Hugo", gender: "male", portraitUrl: null, accentColor: "#16a34a" },
  { id: "space_vega", themeId: "space", letter: "V", name: "Vega", gender: "female", portraitUrl: null, accentColor: "#a855f7" },
  { id: "space_vince", themeId: "space", letter: "V", name: "Vince", gender: "male", portraitUrl: null, accentColor: "#9333ea" }
];

function toActiveCharacter(profile: CharacterProfile): ActiveCharacter {
  return {
    id: profile.id,
    themeId: profile.themeId,
    letter: profile.letter,
    name: profile.name,
    gender: profile.gender,
    portraitUrl: profile.portraitUrl,
    accentColor: profile.accentColor
  };
}

function getLetterOptions(themeId: string, letter: PlayLetter) {
  const themeOptions = CHARACTER_POOL.filter((profile) => profile.themeId === themeId && profile.letter === letter);

  if (themeOptions.length > 0) {
    return themeOptions;
  }

  const defaultOptions = CHARACTER_POOL.filter((profile) => profile.themeId === DEFAULT_THEME_ID && profile.letter === letter);

  if (defaultOptions.length > 0) {
    return defaultOptions;
  }

  return CHARACTER_POOL.filter((profile) => profile.letter === letter);
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

export function getCharacterTheme(themeId: string) {
  return CHARACTER_THEMES.find((theme) => theme.id === themeId) ?? CHARACTER_THEMES[0];
}

export function getThemeCharacters(themeId: string) {
  return CHARACTER_POOL.filter((profile) => profile.themeId === themeId);
}

export function createActiveCharacterSet(themeId = DEFAULT_THEME_ID): ActiveCharacterSet {
  const result = {} as ActiveCharacterSet;

  for (const letter of PLAY_LETTER_SEQUENCE) {
    result[letter] = toActiveCharacter(pickRandom(getLetterOptions(themeId, letter)));
  }

  return result;
}

export function ensureActiveCharacterSet(themeId: string, current?: Partial<Record<PlayLetter, ActiveCharacter>> | null): ActiveCharacterSet {
  const fallback = createActiveCharacterSet(themeId || DEFAULT_THEME_ID);
  const result = {} as ActiveCharacterSet;

  for (const letter of PLAY_LETTER_SEQUENCE) {
    const existing = current?.[letter];
    result[letter] = existing?.letter === letter && existing.name ? { ...fallback[letter], ...existing, letter } : fallback[letter];
  }

  return result;
}
