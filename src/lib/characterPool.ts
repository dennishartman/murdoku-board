import type { ActiveCharacter, ActiveCharacterSet, CharacterGender, CharacterProfile, CharacterTheme, PlayLetter } from "../types/board";

export const SUSPECT_LETTERS: PlayLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H"];
export const VICTIM_LETTER: PlayLetter = "V";
export const PLAY_LETTER_SEQUENCE: PlayLetter[] = [...SUSPECT_LETTERS, VICTIM_LETTER];
export const DEFAULT_THEME_ID = "detective";

const LETTER_ACCENTS: Record<PlayLetter, string> = {
  A: "#22c55e",
  B: "#8b5cf6",
  C: "#3b82f6",
  D: "#ef4444",
  E: "#eab308",
  F: "#14b8a6",
  G: "#ec4899",
  H: "#22c55e",
  V: "#a855f7"
};

const THEME_CHARACTER_DATA: Record<string, Array<[PlayLetter, string, CharacterGender]>> = {
  detective: [
    ["A", "Anna", "female"], ["A", "Amir", "male"],
    ["B", "Bas", "male"], ["B", "Britt", "female"],
    ["C", "Clara", "female"], ["C", "Cas", "male"],
    ["D", "Daan", "male"], ["D", "Demi", "female"],
    ["E", "Eva", "female"], ["E", "Elias", "male"],
    ["F", "Finn", "male"], ["F", "Fleur", "female"],
    ["G", "Gwen", "female"], ["G", "Guus", "male"],
    ["H", "Hugo", "male"], ["H", "Hanna", "female"],
    ["V", "Vera", "female"], ["V", "Vince", "male"]
  ],
  fairy: [
    ["A", "Aria", "female"], ["A", "Alfred", "male"],
    ["B", "Bella", "female"], ["B", "Boris", "male"],
    ["C", "Cato", "female"], ["C", "Casper", "male"],
    ["D", "Dina", "female"], ["D", "Drako", "male"],
    ["E", "Elva", "female"], ["E", "Elfin", "male"],
    ["F", "Fenna", "female"], ["F", "Fedor", "male"],
    ["G", "Gwen", "female"], ["G", "Gijs", "male"],
    ["H", "Helga", "female"], ["H", "Hidde", "male"],
    ["V", "Vita", "female"], ["V", "Vigo", "male"]
  ],
  animals: [
    ["A", "Aap", "neutral"], ["A", "Antilope", "neutral"],
    ["B", "Beer", "neutral"], ["B", "Bever", "neutral"],
    ["C", "Cavia", "neutral"], ["C", "Cobra", "neutral"],
    ["D", "Dolfijn", "neutral"], ["D", "Draak", "neutral"],
    ["E", "Eekhoorn", "neutral"], ["E", "Eland", "neutral"],
    ["F", "Fazant", "neutral"], ["F", "Fret", "neutral"],
    ["G", "Giraf", "neutral"], ["G", "Geit", "neutral"],
    ["H", "Haas", "neutral"], ["H", "Hond", "neutral"],
    ["V", "Vos", "neutral"], ["V", "Valk", "neutral"]
  ],
  fantasy: [
    ["A", "Alina", "female"], ["A", "Aron", "male"],
    ["B", "Bram", "male"], ["B", "Bianca", "female"],
    ["C", "Cora", "female"], ["C", "Cedric", "male"],
    ["D", "Dario", "male"], ["D", "Dora", "female"],
    ["E", "Elena", "female"], ["E", "Eron", "male"],
    ["F", "Fiora", "female"], ["F", "Falk", "male"],
    ["G", "Grace", "female"], ["G", "Goran", "male"],
    ["H", "Hilda", "female"], ["H", "Henrik", "male"],
    ["V", "Vanya", "female"], ["V", "Viktor", "male"]
  ],
  space: [
    ["A", "Astrid", "female"], ["A", "Axel", "male"],
    ["B", "Bo", "female"], ["B", "Bodi", "male"],
    ["C", "Cosmo", "male"], ["C", "Celeste", "female"],
    ["D", "Dex", "male"], ["D", "Dana", "female"],
    ["E", "Elio", "male"], ["E", "Ella", "female"],
    ["F", "Faye", "female"], ["F", "Finn", "male"],
    ["G", "Gio", "male"], ["G", "Gemma", "female"],
    ["H", "Halo", "neutral"], ["H", "Hugo", "male"],
    ["V", "Vega", "female"], ["V", "Vince", "male"]
  ]
};

export const CHARACTER_THEMES: CharacterTheme[] = [
  { id: "detective", name: "Detectives", description: "Klassieke speurders en verdachten voor een mysterie." },
  { id: "fairy", name: "Sprookjes", description: "Vriendelijke sprookjesfiguren voor een fantasiebord." },
  { id: "animals", name: "Dieren", description: "Dierenfiguren met duidelijke namen en letters." },
  { id: "fantasy", name: "Fantasy", description: "Avonturiers, magiers en ridders." },
  { id: "space", name: "Ruimte", description: "Astronauten en ruimtehelden." }
];

export const CHARACTER_POOL: CharacterProfile[] = Object.entries(THEME_CHARACTER_DATA).flatMap(([themeId, entries]) =>
  entries.map(([letter, name, gender], index) => ({
    id: `${themeId}_${name.toLowerCase()}_${index}`,
    themeId,
    letter,
    name,
    gender,
    role: letter === VICTIM_LETTER ? "victim" : "suspect",
    portraitUrl: null,
    accentColor: LETTER_ACCENTS[letter]
  }))
);

function toActiveCharacter(profile: CharacterProfile): ActiveCharacter {
  return {
    id: profile.id,
    themeId: profile.themeId,
    letter: profile.letter,
    name: profile.name,
    gender: profile.gender,
    role: profile.role ?? (profile.letter === VICTIM_LETTER ? "victim" : "suspect"),
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

export function makeActiveLettersForCharacterCount(characterCount: number): PlayLetter[] {
  const total = Math.max(1, Math.min(PLAY_LETTER_SEQUENCE.length, Math.floor(characterCount)));
  const suspectCount = Math.max(0, Math.min(SUSPECT_LETTERS.length, total - 1));
  return [...SUSPECT_LETTERS.slice(0, suspectCount), VICTIM_LETTER];
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
    const role = letter === VICTIM_LETTER ? "victim" : "suspect";
    result[letter] = existing?.letter === letter && existing.name ? { ...fallback[letter], ...existing, letter, role: existing.role ?? role } : fallback[letter];
  }

  return result;
}
