import type { BoardGrid, SavedBoard } from "../types/board";

const STORAGE_KEY = "murdoku-board-maker-latest";
const DB_NAME = "murdoku-board-maker-db";
const DB_VERSION = 1;
const STORE_NAME = "boards";
const LATEST_KEY = "latest";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `board-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => reject(request.error ?? new Error("Database open failed"));
    request.onsuccess = () => resolve(request.result);
  });
}

function putInDatabase(saved: SavedBoard) {
  return new Promise<void>((resolve, reject) => {
    openDatabase()
      .then((database) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        store.put(saved, LATEST_KEY);

        transaction.oncomplete = () => {
          database.close();
          resolve();
        };

        transaction.onerror = () => {
          database.close();
          reject(transaction.error ?? new Error("Database save failed"));
        };
      })
      .catch(reject);
  });
}

function getFromDatabase() {
  return new Promise<SavedBoard | null>((resolve, reject) => {
    openDatabase()
      .then((database) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(LATEST_KEY);

        request.onsuccess = () => {
          database.close();
          resolve((request.result as SavedBoard | undefined) ?? null);
        };

        request.onerror = () => {
          database.close();
          reject(request.error ?? new Error("Database load failed"));
        };
      })
      .catch(reject);
  });
}

function boardWithoutReferenceImage(board: BoardGrid): BoardGrid {
  return {
    ...board,
    referenceImageUrl: null
  };
}

export async function saveBoard(board: BoardGrid, name: string) {
  const saved: SavedBoard = {
    id: makeId(),
    name,
    savedAt: new Date().toISOString(),
    board
  };

  try {
    await putInDatabase(saved);
    return saved;
  } catch {
    const fallback: SavedBoard = {
      ...saved,
      board: boardWithoutReferenceImage(board)
    };

    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

export async function loadBoard() {
  try {
    const saved = await getFromDatabase();

    if (saved) {
      return saved;
    }
  } catch {
    // Use the local fallback below.
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as SavedBoard;
}
